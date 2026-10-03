import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alertFeedback, errorFeedback, shakeFeedback, successFeedback } from '../../core/haptics';
import { getSoundSource } from '../../core/sounds';
import type { DismissOutcome } from '../../core/types';
import { useShakeDetector } from '../../hooks/useShakeDetector';
import { useAlarms } from '../../state/AlarmsContext';
import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius, spacing, typography } from '../../theme/tokens';
import { Button, Card, Icon, ProgressRing } from '../../components/ui';

/** How often the unanswered-alarm haptic repeats. */
const ALERT_INTERVAL_MS = 4000;
/** The emergency escape hatch is intentionally slow to avoid accidental taps. */
const EMERGENCY_HOLD_MS = 1500;

type Phase = 'ringing' | 'dismissed';

export default function RingingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { alarms, ringing, startRinging, completeRinging, snoozeRinging } = useAlarms();
  const params = useLocalSearchParams<{ alarmId?: string }>();

  const alarmId = ringing?.alarmId ?? params.alarmId;
  const alarm = alarms.find((item) => item.id === alarmId);

  const [phase, setPhase] = useState<Phase>('ringing');
  const [showEmergency, setShowEmergency] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);
  const [outcome, setOutcome] = useState<DismissOutcome | null>(null);

  const rangAtRef = useRef(0);
  const shakeCountRef = useRef(0);
  const phaseRef = useRef<Phase>('ringing');

  useEffect(() => {
    if (!rangAtRef.current) rangAtRef.current = ringing?.rangAt ?? Date.now();
  }, [ringing?.rangAt]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* --------------------- deep link / direct navigation -------------------- */
  // Reached when the screen is pushed directly (e.g. the "Probar" action)
  // instead of through a scheduled alarm.
  useEffect(() => {
    if (!ringing && params.alarmId) startRinging(params.alarmId);
  }, [ringing, params.alarmId, startRinging]);

  /* ------------------------------ audio ----------------------------------- */
  const soundId = alarm?.soundId;
  const player = useAudioPlayer(getSoundSource(soundId));

  useEffect(() => {
    // The alarm must be audible even when the ringer switch is silenced.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    // eslint-disable-next-line react-hooks/immutability -- native player handle, mutated by design
    player.loop = true;
    player.volume = 1;
    // `play`/`pause` are synchronous; they reject internally on failure.
    player.play();
    return () => {
      player.pause();
      Vibration.cancel();
    };
  }, [player, soundId]);

  const vibrates = alarm ? alarm.vibrate !== 'off' : true;
  useEffect(() => {
    if (phase !== 'ringing' || !vibrates) return;
    alertFeedback();
    const interval = setInterval(alertFeedback, ALERT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, vibrates]);

  /* ---------------------------- elapsed time ------------------------------ */
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - rangAtRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  /* --------------------------- dismissal path ----------------------------- */
  const leave = useCallback(() => {
    player.pause();
    Vibration.cancel();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [player]);

  const dismiss = useCallback(
    async (result: DismissOutcome, shakes: number, options?: { auto?: boolean }) => {
      if (phaseRef.current !== 'ringing') return;
      setPhase('dismissed');
      setOutcome(result);
      if (options?.auto) setAutoStopped(true);

      player.pause();
      Vibration.cancel();

      if (result === 'shake') successFeedback();

      if (alarmId) {
        if (result === 'snooze') await snoozeRinging(alarmId);
        else await completeRinging(alarmId, result, shakes);
      }

      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    },
    [alarmId, completeRinging, player, setAutoStopped, setOutcome, setPhase, snoozeRinging]
  );

  /* ---------------------------- the challenge ----------------------------- */
  // Both dismiss modes require the challenge; `'both'` additionally exposes a
  // "Detener" button, while `'shake'` only allows the emergency escape hatch.
  const target = alarm?.shakeTarget ?? 0;
  const requiresShake = target > 0;
  const allowsManualStop = alarm?.dismissMode !== 'shake';

  const handleShake = useCallback(
    (count: number) => {
      shakeCountRef.current = count;
      shakeFeedback();
      if (count >= target) void dismiss('shake', count);
    },
    [dismiss, target]
  );

  const { shakeCount, sensorState, calibrating, intensity, simulateShake } = useShakeDetector({
    enabled: phase === 'ringing' && requiresShake,
    target: Math.max(1, target),
    sensitivity: settings.shakeSensitivity,
    onShake: handleShake,
    onComplete: (count) => void dismiss('shake', count),
  });

  /* ---------------------------- auto timeout ------------------------------ */
  useEffect(() => {
    if (phase !== 'ringing') return;
    const limit = alarm?.ringTimeoutSeconds ?? 0;
    if (limit <= 0 || elapsed < limit) return;
    void dismiss('silent', shakeCountRef.current, { auto: true });
  }, [elapsed, alarm?.ringTimeoutSeconds, phase, dismiss]);

  /* -------------------------------- render -------------------------------- */
  if (!alarm) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Icon name="alarm" size={34} color={colors.textFaint} />
        <Text style={[typography.title, { color: colors.text }]}>Esta alarma ya no existe</Text>
        <Button label="Volver al inicio" variant="ghost" onPress={leave} />
      </View>
    );
  }

  const progress = requiresShake && target > 0 ? Math.min(1, shakeCount / target) : phase === 'dismissed' ? 1 : 0;
  const remaining = Math.max(0, target - shakeCount);
  const canSimulate = requiresShake && sensorState !== 'ready';

  const instruction = (() => {
    if (phase === 'dismissed') {
      if (outcome === 'snooze') return `Recordada en ${alarm.snoozeMinutes} minutos.`;
      if (outcome === 'emergency') return 'Alarma detenida por emergencia.';
      if (outcome === 'silent') return 'Alarma detenida.';
      return 'Alarma apagada. Buen despertar.';
    }
    if (!requiresShake) return 'Pulsa el botón para detener la alarma.';
    if (remaining === 0) return '¡Última agitación!';
    return `Agita el teléfono: ${remaining} ${remaining === 1 ? 'falta' : 'faltan'}`;
  })();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[`${colors.accent}26`, colors.background]} style={StyleSheet.absoluteFill} />

      <Pulse intensity={intensity} active={phase === 'ringing' && requiresShake} color={colors.accent} />

      <View style={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: phase === 'ringing' ? colors.dangerSoft : colors.successSoft }]}>
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: phase === 'ringing' ? colors.danger : colors.success },
              ]}
            />
            <Text style={[typography.micro, { color: phase === 'ringing' ? colors.danger : colors.success }]}>
              {phase === 'ringing' ? 'ALARMA SONANDO' : 'ALARMA APAGADA'}
            </Text>
          </View>

          <Pressable
            onPress={() => setShowEmergency((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="Opciones de emergencia"
            style={({ pressed }) => [
              styles.emergencyToggle,
              { backgroundColor: showEmergency ? colors.danger : colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="shield" size={16} color={showEmergency ? '#FFFFFF' : colors.textMuted} />
            <Text style={[typography.micro, { color: showEmergency ? '#FFFFFF' : colors.textMuted }]}>Ayuda</Text>
          </Pressable>
        </View>

        <View style={styles.middle}>
          <Text numberOfLines={2} style={[typography.display, styles.alarmLabel, { color: colors.text }]}>
            {alarm.label || 'Despertar'}
          </Text>

          <View style={styles.ringWrap}>
            <ProgressRing progress={progress} size={216} thickness={14} color={colors.accent} trackColor={colors.surfaceSunken}>
              <Text style={[styles.ringValue, { color: colors.text }]}>
                {phase === 'dismissed' ? '✓' : requiresShake ? String(shakeCount) : '—'}
              </Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                {phase === 'dismissed' ? 'Listo' : requiresShake ? `de ${target}` : 'sin reto'}
              </Text>
            </ProgressRing>
          </View>

          <Text style={[typography.body, styles.instruction, { color: colors.textMuted }]}>{instruction}</Text>

          {calibrating && requiresShake ? (
            <Text style={[typography.micro, { color: colors.textFaint }]}>Calibrando el sensor…</Text>
          ) : null}

          {sensorState === 'unavailable' && requiresShake ? (
            <Text style={[typography.micro, styles.note, { color: colors.warning }]}>
              Este dispositivo no expone acelerómetro. Usa «Simular agitación».
            </Text>
          ) : null}

          {sensorState === 'denied' && requiresShake ? (
            <Text style={[typography.micro, styles.note, { color: colors.danger }]}>
              Permiso de movimiento denegado. Actívalo en los ajustes del sistema.
            </Text>
          ) : null}

          {autoStopped ? (
            <Text style={[typography.micro, { color: colors.textFaint }]}>
              Se alcanzó el tiempo máximo configurado para esta alarma.
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {phase === 'ringing' ? (
            <>
              {canSimulate ? (
                <Button
                  label="Simular agitación"
                  variant="secondary"
                  fullWidth
                  icon={<Icon name="shake" size={16} color="#FFFFFF" />}
                  onPress={simulateShake}
                />
              ) : null}

              {alarm.snoozeMinutes > 0 ? (
                <Button
                  label={`Posponer ${alarm.snoozeMinutes} min`}
                  variant="ghost"
                  fullWidth
                  icon={<Icon name="skip" size={16} color={colors.text} />}
                  onPress={() => void dismiss('snooze', shakeCountRef.current)}
                />
              ) : null}

              {showEmergency ? (
                <Card style={[styles.emergencyCard, { borderColor: colors.danger }]}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>¿Estás en una emergencia?</Text>
                  <Text style={[typography.micro, { color: colors.textMuted }]}>
                    Mantén pulsado {EMERGENCY_HOLD_MS / 1000} s para detener la alarma sin completar el reto. Esta acción
                    queda registrada en el historial.
                  </Text>
                  <HoldToConfirm
                    label="Detener sin reto"
                    color={colors.danger}
                    durationMs={EMERGENCY_HOLD_MS}
                    onComplete={() => {
                      errorFeedback();
                      void dismiss('emergency', shakeCountRef.current);
                    }}
                  />
                </Card>
              ) : null}

              {allowsManualStop ? (
                <View style={styles.footRow}>
                  <Text style={[typography.micro, { color: colors.textFaint }]}>
                    Suena desde hace {formatElapsed(elapsed)}
                  </Text>
                  <Pressable
                    onPress={() => void dismiss('silent', shakeCountRef.current)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Detener sin completar el reto"
                  >
                    <Text style={[typography.micro, { color: colors.textFaint }]}>Detener sin reto</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <Button label="Volver al inicio" fullWidth onPress={leave} />
          )}
        </View>
      </View>
    </View>
  );
}

/* --------------------------------- Pulse --------------------------------- */

/**
 * Soft expanding halo whose scale and opacity follow the live accelerometer
 * deviation, so the screen reacts to movement before a shake is counted.
 */
function Pulse({ intensity, active, color }: { intensity: number; active: boolean; color: string }) {
  // Stable across renders: re-creating the nodes would restart the animation.
  const scale = useMemo(() => new RNAnimated.Value(1), []);
  const opacity = useMemo(() => new RNAnimated.Value(0), []);

  useEffect(() => {
    if (!active) return;
    const amount = Math.min(1, intensity / 2.2);
    RNAnimated.timing(scale, { toValue: 1 + amount * 0.14, duration: 90, useNativeDriver: true }).start();
    RNAnimated.timing(opacity, { toValue: 0.04 + amount * 0.14, duration: 90, useNativeDriver: true }).start();
  }, [intensity, active, scale, opacity]);

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[styles.pulse, { borderColor: color, transform: [{ scale }], opacity }]}
    />
  );
}

/* ---------------------------- HoldToConfirm ------------------------------ */

function HoldToConfirm({
  label,
  color,
  durationMs,
  onComplete,
}: {
  label: string;
  color: string;
  durationMs: number;
  onComplete: () => void;
}) {
  const progress = new RNAnimated.Value(0);
  const [holding, setHolding] = useState(false);
  const finishedRef = useRef(false);

  const start = () => {
    finishedRef.current = false;
    setHolding(true);
    progress.setValue(0);
    RNAnimated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: false }).start(({ finished }) => {
      if (finished && !finishedRef.current) {
        finishedRef.current = true;
        setHolding(false);
        onComplete();
      }
    });
  };

  const cancel = () => {
    finishedRef.current = true;
    setHolding(false);
    RNAnimated.timing(progress, { toValue: 0, duration: 140, useNativeDriver: false }).start();
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`Mantén pulsado ${Math.round(durationMs / 1000)} segundos`}
      style={({ pressed }) => [
        styles.holdButton,
        { backgroundColor: `${color}1A`, borderColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <RNAnimated.View style={[styles.holdFill, { width, backgroundColor: color }]} pointerEvents="none" />
      <Text style={[typography.bodyStrong, { color }]}>{holding ? 'Suelta para cancelar…' : label}</Text>
    </Pressable>
  );
}

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  pulse: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -190,
    marginTop: -190,
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  emergencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  alarmLabel: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  ringWrap: {
    marginVertical: spacing.lg,
  },
  ringValue: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
  },
  instruction: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  note: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  emergencyCard: {
    gap: spacing.xs,
    borderWidth: 1.5,
  },
  holdButton: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
});