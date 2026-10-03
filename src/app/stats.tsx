import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateWithTime } from '../core/date';
import type { DismissOutcome } from '../core/types';
import { useAlarms } from '../state/AlarmsContext';
import { useReminders } from '../state/RemindersContext';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';
import { Button, Card, ProgressRing, StatTile , Gauge , Icon } from '../components/ui';
import { ModalHeader } from '../components/modal-header';

const OUTCOME_LABEL: Record<DismissOutcome, string> = {
  shake: 'Superado',
  snooze: 'Pospuesta',
  emergency: 'Emergencia',
  silent: 'Detenido',
};

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, setPremium } = useSettings();
  const { stats, dismissLog } = useAlarms();
  const { completedThisWeek, completionRate } = useReminders();

  /** Adherence score: completed challenges over total rings. */
  const adherence = useMemo(() => {
    if (stats.totalRings === 0) return 0;
    return Math.round((stats.byShake / stats.totalRings) * 100);
  }, [stats]);

  const maxShakes = Math.max(1, ...stats.lastSevenDays.map((d) => d.shakes));

  if (!settings.premium) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ModalHeader title="Estadísticas" onClose={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Card style={styles.lockCard}>
            <View style={[styles.lockIcon, { backgroundColor: colors.warningSoft }]}>
              <Icon name="activity" size={26} color={colors.warning} />
            </View>
            <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>Función Premium</Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', maxWidth: 290 }]}>
              Las estadísticas te muestran cuántas veces superaste el reto, cuánto tardas y tu racha de días. Activa la
              prueba simulada para verlas ahora mismo.
            </Text>
            <View style={[styles.previewRow, { backgroundColor: colors.surfaceSunken }]}>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Ya tienes {stats.totalRings} {stats.totalRings === 1 ? 'registro' : 'registros'} guardados: se
                mostrarán en cuanto lo actives.
              </Text>
            </View>
            <Button label="Activar prueba de 7 días" fullWidth onPress={() => setPremium(true)} />
            <Button label="Quizá más tarde" variant="ghost" fullWidth onPress={() => router.back()} />
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ModalHeader title="Estadísticas" subtitle="Cómo te está yendo" onClose={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Card style={styles.gaugeCard}>
          <Gauge
            value={adherence}
            caption={adherenceLabel(adherence)}
            colorForValue={(value) => (value >= 75 ? colors.success : value >= 50 ? colors.warning : colors.danger)}
          />
          <Text style={[typography.heading, { color: colors.text }]}>Adhesión al reto</Text>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', maxWidth: 300 }]}>
            {stats.byShake} de {stats.totalRings} alarmas se apagaron completando el reto de agitación.
          </Text>
        </Card>

        <View style={styles.tilesRow}>
          <Card style={styles.tileCard}>
            <StatTile
              label="Retos superados"
              value={String(stats.byShake)}
              icon={<Icon name="zap" size={13} color={colors.textFaint} strokeWidth={2.2} />}
            />
          </Card>
          <Card style={styles.tileCard}>
            <StatTile
              label="Media de toques"
              value={stats.averageShakes.toFixed(1)}
              icon={<Icon name="shake" size={13} color={colors.textFaint} strokeWidth={2.2} />}
            />
          </Card>
        </View>

        <View style={styles.tilesRow}>
          <Card style={styles.tileCard}>
            <StatTile
              label="Mejor racha"
              value={`${stats.bestStreak} d`}
              icon={<Icon name="star" size={13} color={colors.textFaint} strokeWidth={2.2} />}
            />
          </Card>
          <Card style={styles.tileCard}>
            <StatTile
              label="Puestas"
              value={String(stats.bySnooze)}
              icon={<Icon name="skip" size={13} color={colors.textFaint} strokeWidth={2.2} />}
            />
          </Card>
        </View>

        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Agitaciones por día</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Últimos 7 días</Text>

          <View style={styles.chart}>
            {stats.lastSevenDays.map((day) => (
              <View key={day.label} style={styles.chartColumn}>
                <Text style={[typography.micro, { color: colors.textFaint, fontSize: 10 }]}>
                  {day.shakes > 0 ? day.shakes : ''}
                </Text>
                <View style={[styles.chartTrack, { backgroundColor: colors.surfaceSunken }]}>
                  <View
                    style={[
                      styles.chartFill,
                      {
                        backgroundColor: colors.accent,
                        height: `${Math.max(4, (day.shakes / maxShakes) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[typography.micro, { color: colors.textFaint, fontSize: 10 }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Cómo apagas</Text>
          <View style={styles.outcomeRow}>
            {(
              [
                ['shake', stats.byShake, colors.success],
                ['snooze', stats.bySnooze, colors.info],
                ['silent', stats.bySilent, colors.textFaint],
                ['emergency', stats.byEmergency, colors.danger],
              ] as const
            ).map(([id, count, color]) => (
              <View key={id} style={styles.outcomeCell}>
                <ProgressRing progress={stats.totalRings ? count / stats.totalRings : 0} size={56} thickness={6} color={color}>
                  <Text style={[typography.micro, { color: colors.text }]}>{count}</Text>
                </ProgressRing>
                <Text style={[typography.micro, { color: colors.textFaint, textAlign: 'center', fontSize: 10 }]}>
                  {OUTCOME_LABEL[id]}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Recordatorios</Text>
          <View style={styles.reminderRow}>
            <ProgressRing progress={completionRate} size={62} thickness={8} color={colors.secondary}>
              <Text style={[typography.micro, { color: colors.text }]}>{Math.round(completionRate * 100)}%</Text>
            </ProgressRing>
            <View style={styles.reminderText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {completedThisWeek} completados esta semana
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Porcentaje de recordatorios completados sobre el total creado.
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Historial reciente</Text>
          {dismissLog.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Todavía no hay historial. Cuando suene una alarma y la apagues, aparecerá aquí.
            </Text>
          ) : (
            dismissLog.slice(0, 12).map((entry) => (
              <View key={entry.id} style={[styles.logRow, { borderTopColor: colors.border }]}>
                <View style={[styles.logDot, { backgroundColor: outcomeColor(entry.outcome, colors) }]} />
                <View style={styles.logText}>
                  <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
                    {entry.label}
                  </Text>
                  <Text style={[typography.micro, { color: colors.textFaint }]}>
                    {formatDateWithTime(new Date(entry.rangAt), settings.use24Hour)} · {OUTCOME_LABEL[entry.outcome]}
                    {entry.outcome === 'shake' ? ` · ${entry.shakes} toques` : ''}
                  </Text>
                </View>
                <Text style={[typography.micro, { color: colors.textMuted }]}>{entry.secondsToDismiss}s</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function outcomeColor(outcome: DismissOutcome, colors: ReturnType<typeof useTheme>['colors']) {
  if (outcome === 'shake') return colors.success;
  if (outcome === 'snooze') return colors.info;
  if (outcome === 'emergency') return colors.danger;
  return colors.textFaint;
}

function adherenceLabel(value: number) {
  if (value >= 80) return 'Excelente';
  if (value >= 60) return 'Bien';
  if (value >= 40) return 'Regular';
  if (value > 0) return 'Difícil';
  return 'Sin datos';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  lockCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    width: '100%',
  },
  gaugeCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tileCard: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 128,
    gap: spacing.xs,
  },
  chartColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  chartTrack: {
    width: '100%',
    flex: 1,
    borderRadius: radius.pill,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartFill: {
    width: '100%',
    borderRadius: radius.pill,
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  outcomeCell: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  reminderText: {
    flex: 1,
    gap: 3,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logText: {
    flex: 1,
    gap: 2,
  },
});