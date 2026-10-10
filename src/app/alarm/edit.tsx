import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useRouter } from '../../hooks/useRouter';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalHeader } from '../../components/modal-header';
import { Button, Card, Chip, Icon, SegmentedControl, Stepper, SummaryRow, ToggleRow, WeekdayPicker } from '../../components/ui';
import { formatDays, formatTime, nextOccurrence } from '../../core/date';
import { takePendingSound } from '../../core/selection';
import { getSound, isSoundLocked, SOUNDS } from '../../core/sounds';
import type { Alarm, DismissMode, HapticStrength } from '../../core/types';
import { useAlarms, type AlarmDraft } from '../../state/AlarmsContext';
import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

const DEFAULT_DRAFT: AlarmDraft = {
  label: 'Despertar',
  hour: 7,
  minute: 30,
  weekdays: [1, 2, 3, 4, 5],
  enabled: true,
  soundId: SOUNDS[0].id,
  vibrate: 'medium',
  snoozeMinutes: 5,
  dismissMode: 'shake',
  shakeTarget: 12,
  ringTimeoutSeconds: 0,
};

const VIBRATE_OPTIONS: { id: HapticStrength; label: string }[] = [
  { id: 'off', label: 'Sin vibrar' },
  { id: 'light', label: 'Suave' },
  { id: 'medium', label: 'Media' },
  { id: 'strong', label: 'Fuerte' },
];

function toDraft(alarm: Alarm): AlarmDraft {
  return {
    label: alarm.label,
    hour: alarm.hour,
    minute: alarm.minute,
    weekdays: alarm.weekdays,
    enabled: alarm.enabled,
    soundId: alarm.soundId,
    vibrate: alarm.vibrate,
    snoozeMinutes: alarm.snoozeMinutes,
    dismissMode: alarm.dismissMode,
    shakeTarget: alarm.shakeTarget,
    ringTimeoutSeconds: alarm.ringTimeoutSeconds,
  };
}

type AlarmEditParams = { id?: string; hour?: string; minute?: string; fromEvent?: string };

function fromParams(params: AlarmEditParams, base: AlarmDraft): AlarmDraft {
  const hour = Number(params.hour);
  const minute = Number(params.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return base;
  return { ...base, hour, minute, label: params.fromEvent ? `Antes de ${params.fromEvent}` : base.label };
}

export default function EditAlarmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { alarms, createAlarm, updateAlarm, deleteAlarm } = useAlarms();
  const params = useLocalSearchParams<AlarmEditParams>();

  const editing = useMemo(() => alarms.find((alarm) => alarm.id === params.id), [alarms, params.id]);

  const [draft, setDraft] = useState<AlarmDraft>(() =>
    editing ? toDraft(editing) : fromParams(params, DEFAULT_DRAFT)
  );
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | undefined>(params.id);

  if (editing && loadedId !== editing.id) {
    setLoadedId(editing.id);
    setDraft(toDraft(editing));
  }

  useFocusEffect(
    useCallback(() => {
      const id = takePendingSound();
      if (id) setDraft((current) => ({ ...current, soundId: id }));
    }, [])
  );

  const sound = getSound(draft.soundId);
  const soundLocked = isSoundLocked(sound, settings.premium);
  const occurrence = nextOccurrence(draft.hour, draft.minute, draft.weekdays);

  const patch = (next: Partial<AlarmDraft>) => setDraft((current) => ({ ...current, ...next }));

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateAlarm(editing.id, draft);
      } else {
        await createAlarm(draft);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    deleteAlarm(editing.id);
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ModalHeader
        title={editing ? 'Editar alarma' : 'Nueva alarma'}
        onClose={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* --------------------------- Hora --------------------------- */}
        <Card style={styles.timeCard}>
          <Text style={[typography.micro, { color: colors.textFaint }]}>HORA</Text>
          <TimePicker hour={draft.hour} minute={draft.minute} onChange={(hour, minute) => patch({ hour, minute })} />

          <View style={styles.occurrenceRow}>
            <Icon name="bell" size={14} color={colors.accent} strokeWidth={2.2} />
            <Text style={[typography.micro, { color: colors.textMuted }]}>
              Suena {formatTime(occurrence, settings.use24Hour)} · {formatRelativeDay(occurrence)}
            </Text>
          </View>
        </Card>

        {/* --------------------------- Etiqueta ------------------------ */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Etiqueta</Text>
          <View style={styles.labelRow}>
            {['Despertar', 'Ir a clases', 'Entrenar', 'Medicamento', 'Salir'].map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                size="sm"
                selected={draft.label === suggestion}
                onPress={() => patch({ label: draft.label === suggestion ? 'Despertar' : suggestion })}
              />
            ))}
          </View>
          <TextInput
            value={draft.label}
            onChangeText={(label) => patch({ label })}
            placeholder="Nombre de la alarma"
            placeholderTextColor={colors.textFaint}
            maxLength={32}
            style={[
              styles.input,
              typography.body,
              { color: colors.text, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
            ]}
          />
        </Card>

        {/* --------------------------- Días ---------------------------- */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Repetición</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            No selecciones días para una alarma de un solo uso.
          </Text>
          <WeekdayPicker selected={draft.weekdays} onChange={(weekdays) => patch({ weekdays })} />
          <View style={styles.daysSummary}>
            <Chip label="Entre semana" size="sm" onPress={() => patch({ weekdays: [1, 2, 3, 4, 5] })} />
            <Chip label="Fin de semana" size="sm" onPress={() => patch({ weekdays: [6, 0] })} />
            <Chip label="Todos" size="sm" onPress={() => patch({ weekdays: [1, 2, 3, 4, 5, 6, 0] })} />
            {draft.weekdays.length > 0 ? (
              <Chip label="Limpiar" size="sm" tone="danger" onPress={() => patch({ weekdays: [] })} />
            ) : null}
          </View>
          <Text style={[typography.micro, { color: colors.textFaint }]}>
            {draft.weekdays.length === 0 ? 'Alarma de un solo uso' : formatDays(draft.weekdays)}
          </Text>
        </Card>

        {/* ------------------------ Modo de apagado -------------------- */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Cómo se apaga</Text>
          <SegmentedControl<DismissMode>
            segments={[
              { id: 'shake', label: 'Agitar' },
              { id: 'both', label: 'Agitar o botón' },
            ]}
            value={draft.dismissMode}
            onChange={(dismissMode) => patch({ dismissMode })}
          />

          <View style={styles.stepperBlock}>
            <Text style={[typography.caption, { color: colors.text }]}>Agitaciones necesarias</Text>
            <Stepper value={draft.shakeTarget} onChange={(shakeTarget) => patch({ shakeTarget })} min={1} max={30} unit="toques" />
          </View>

          <Text style={[typography.micro, { color: colors.textFaint }]}>
            Más toques = más difícil quedarse dormido. Empieza con 10-12.
          </Text>

          <View style={styles.divider} />

          <Text style={[typography.caption, { color: colors.text }]}>Repetir (snooze)</Text>
          <Stepper
            value={draft.snoozeMinutes}
            onChange={(snoozeMinutes) => patch({ snoozeMinutes })}
            min={1}
            max={30}
            unit="min"
          />
        </Card>

        {/* --------------------------- Sonido -------------------------- */}
        <Card style={styles.card}>
          <SummaryRow
            label="Sonido"
            value={sound.name}
            onPress={() =>
              router.push({
                pathname: '/sounds',
                params: { selectedId: draft.soundId, alarmId: params.id },
              } as any)
            }
            icon={<Icon name="volume" size={17} color={colors.textMuted} />}
            locked={soundLocked}
            lockedHint={soundLocked ? 'Requiere Premium' : undefined}
          />
          <Text style={[typography.micro, { color: colors.textFaint }]}>{sound.description}</Text>

          <View style={styles.divider} />

          <Text style={[typography.caption, { color: colors.text }]}>Vibración</Text>
          <View style={styles.labelRow}>
            {VIBRATE_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                size="sm"
                selected={draft.vibrate === option.id}
                onPress={() => patch({ vibrate: option.id })}
              />
            ))}
          </View>
        </Card>

        {/* --------------------------- Extra --------------------------- */}
        <Card style={styles.card}>
          <ToggleRow
            label="Alarma activa"
            description="Programa el aviso en el sistema"
            icon={<Icon name="power" size={17} color={colors.textMuted} />}
            value={draft.enabled}
            onValueChange={(enabled) => patch({ enabled })}
          />
          <View style={styles.divider} />
          <View style={styles.stepperBlock}>
            <Text style={[typography.caption, { color: colors.text }]}>Tiempo máximo sonando</Text>
            <Stepper
              value={draft.ringTimeoutSeconds}
              onChange={(ringTimeoutSeconds) => patch({ ringTimeoutSeconds })}
              min={0}
              max={900}
              step={30}
              format={(value) => (value === 0 ? '∞' : `${Math.round(value / 60)}`)}
              unit="min"
            />
          </View>
          <Text style={[typography.micro, { color: colors.textFaint }]}>
            0 = suena hasta completar el reto o hasta que pulses «Detener».
          </Text>
        </Card>

        <Button label={editing ? 'Guardar cambios' : 'Crear alarma'} size="lg" fullWidth loading={saving} onPress={save} />

        {editing ? (
          <Button label="Eliminar alarma" variant="danger" fullWidth onPress={confirmDelete} />
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ------------------------------- TimePicker ------------------------------ */

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.timePicker}>
      <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {HOURS.map((value) => (
          <Pressable
            key={`h-${value}`}
            onPress={() => onChange(value, minute)}
            accessibilityRole="button"
            accessibilityLabel={`Hora ${value}`}
            accessibilityState={{ selected: value === hour }}
            style={[styles.timeOption, value === hour && { backgroundColor: colors.accent }]}
          >
            <Text style={[typography.bodyStrong, { color: value === hour ? colors.accentOn : colors.textMuted }]}>
              {String(value).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[typography.display, styles.timeColon, { color: colors.textFaint }]}>:</Text>

      <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {MINUTES.map((value) => (
          <Pressable
            key={`m-${value}`}
            onPress={() => onChange(hour, value)}
            accessibilityRole="button"
            accessibilityLabel={`Minuto ${value}`}
            accessibilityState={{ selected: value === minute }}
            style={[styles.timeOption, value === minute && { backgroundColor: colors.accent }]}
          >
            <Text style={[typography.bodyStrong, { color: value === minute ? colors.accentOn : colors.textMuted }]}>
              {String(value).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function formatRelativeDay(date: Date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'hoy';
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (date.toDateString() === tomorrow.toDateString()) return 'mañana';
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  timeCard: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  timeColumn: {
    maxHeight: 168,
    width: 74,
  },
  timeOption: {
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  timeColon: {
    fontSize: 30,
    paddingBottom: 4,
  },
  occurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  daysSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  stepperBlock: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,138,150,0.25)',
    marginVertical: spacing.xxs,
  },
});