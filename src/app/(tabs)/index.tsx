import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from '../../hooks/useRouter';

import { formatDateLong, greetingFor } from '../../core/date';
import { useAlarms } from '../../state/AlarmsContext';
import { useReminders } from '../../state/RemindersContext';
import { useSettings } from '../../state/SettingsContext';
import { tabBarStore } from '../../state/useTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar, ProgressRing, StatTile , Card, SectionHeader } from '../../components/ui';
import { Icon, type IconName } from '../../components/ui';
import { AlarmRow, NextAlarmHero, ReminderRow } from '../../components/rows';
import { HeaderButton, ScreenHeader } from '../../components/screen-header';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { alarms, nextAlarm, permission, toggleAlarm, stats, startRinging } = useAlarms();
  const { pending, overdue, upcomingSoon, reminders, completedThisWeek, completionRate, toggleComplete, snoozeReminder } =
    useReminders();

  const onScroll = useCallback((y: number) => {
    tabBarStore.setVisible(y < 120);
  }, []);

  const enabledAlarms = useMemo(() => alarms.filter((alarm) => alarm.enabled), [alarms]);
  const upcomingAlarms = useMemo(
    () => [...enabledAlarms].sort((a, b) => nextAlarmSortValue(a) - nextAlarmSortValue(b)).slice(0, 3),
    [enabledAlarms]
  );

  const greeting = greetingFor();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title={`${greeting}, ${settings.userName}`}
          subtitle={formatDateLong(new Date())}
          left={
            <Avatar name={settings.userName} size={42} ring />
          }
          right={
            <View style={styles.headerActions}>
              <HeaderButton
                label="Notificaciones"
                badge={overdue.length}
                onPress={() => router.push('/(tabs)/reminders')}
              >
                <Icon name="bell" size={20} color={colors.text} />
              </HeaderButton>
            </View>
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {permission !== 'granted' ? <PermissionBanner /> : null}

        <NextAlarmHero alarm={nextAlarm} use24Hour={settings.use24Hour} />

        {/* Live "test the challenge" affordance, so the shake flow is reachable
            in Expo Go without waiting for a scheduled alarm. */}
        {nextAlarm ? (
          <Card style={styles.testCard}>
            <View style={styles.testRow}>
              <View style={[styles.testIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name="shake" size={20} color={colors.accent} />
              </View>
              <View style={styles.testText}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Probar el reto ahora</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {nextAlarm.shakeTarget} {nextAlarm.shakeTarget === 1 ? 'agitación' : 'agitaciones'} para apagar
                </Text>
              </View>
              <Pressable
                onPress={() => startRinging(nextAlarm.id)}
                accessibilityRole="button"
                accessibilityLabel="Probar el reto de agitación"
                style={({ pressed }) => [
                  styles.playButton,
                  { backgroundColor: colors.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Icon name="play" size={15} color={colors.accentOn} />
              </Pressable>
            </View>
          </Card>
        ) : null}

        <View style={styles.statGrid}>
          <Card style={styles.statCard}>
            <StatTile
              label="Alarmas activas"
              value={String(enabledAlarms.length)}
              icon={<Icon name="alarm" size={13} color={colors.textFaint} strokeWidth={2.2} />}
              delta={
                alarms.length > 0
                  ? { text: `${alarms.length - enabledAlarms.length} pausadas`, direction: 'flat' }
                  : undefined
              }
            />
          </Card>

          <Card style={styles.statCard}>
            <StatTile
              label="Pendientes"
              value={String(pending.length)}
              icon={<Icon name="bell" size={13} color={colors.textFaint} strokeWidth={2.2} />}
              delta={overdue.length > 0 ? { text: `${overdue.length} vencidos`, direction: 'down' } : undefined}
            />
          </Card>

          <Card style={styles.statCard}>
            <StatTile
              label="Completados"
              value={`${Math.round(completionRate * 100)}%`}
              icon={<Icon name="check-circle" size={13} color={colors.textFaint} strokeWidth={2.2} />}
              delta={{ text: `${completedThisWeek} esta semana`, direction: 'up' }}
            />
          </Card>

          <Card style={styles.statCard}>
            <StatTile
              label="Retos superados"
              value={String(stats.byShake)}
              icon={<Icon name="zap" size={13} color={colors.textFaint} strokeWidth={2.2} />}
              delta={stats.averageShakes > 0 ? { text: `${stats.averageShakes.toFixed(1)} media`, direction: 'flat' } : undefined}
            />
          </Card>
        </View>

        <QuickActions
          onCreateAlarm={() => router.push('/alarm/edit')}
          onCreateReminder={() => router.push('/reminder/edit')}
          onOpenCalendar={() => router.push('/calendar')}
          onOpenSounds={() => router.push('/sounds')}
        />

        <View style={styles.section}>
          <SectionHeader
            title="Tus alarmas"
            action={{ label: 'Ver todas', onPress: () => router.push('/(tabs)/alarms') }}
            subtitle={`${enabledAlarms.length} de ${alarms.length} activas`}
          />

          {upcomingAlarms.length === 0 ? (
            <Card>
              <View style={styles.emptyAlarms}>
                <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                  Todavía no tienes alarmas activas.{'\n'}Crea una y ya no te CUENTAS de dormido.
                </Text>
                <Pressable
                  onPress={() => router.push('/alarm/edit')}
                  style={[styles.inlineButton, { backgroundColor: colors.accent }]}
                >
                  <Icon name="plus" size={16} color={colors.accentOn} strokeWidth={2.4} />
                  <Text style={[typography.bodyStrong, { color: colors.accentOn }]}>Nueva alarma</Text>
                </Pressable>
              </View>
            </Card>
          ) : (
            <View style={styles.gap}>
              {upcomingAlarms.map((alarm) => (
                <AlarmRow
                  key={alarm.id}
                  alarm={alarm}
                  use24Hour={settings.use24Hour}
                  showCountdown
                  onToggle={(enabled) => toggleAlarm(alarm.id, enabled)}
                  onPress={() => router.push({ pathname: '/alarm/edit', params: { id: alarm.id } })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Próximos recordatorios"
            action={{ label: 'Ver todos', onPress: () => router.push('/(tabs)/reminders') }}
            subtitle={upcomingSoon.length > 0 ? `${upcomingSoon.length} en las próximas 48 h` : undefined}
          />

          {upcomingSoon.length === 0 ? (
            <Card>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
                Nada pendiente en las próximas 48 horas.
              </Text>
            </Card>
          ) : (
            <View style={styles.gap}>
              {upcomingSoon.slice(0, 4).map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  use24Hour={settings.use24Hour}
                  onToggleComplete={() => toggleComplete(reminder.id)}
                  onSnooze={() => snoozeReminder(reminder.id, 10)}
                  onPress={() => router.push({ pathname: '/reminder/edit', params: { id: reminder.id } })}
                />
              ))}
            </View>
          )}
        </View>

        <TodayCard
          completed={completedThisWeek}
          total={reminders.length}
          rate={completionRate}
          streaks={stats.bestStreak}
          lastRings={stats.lastSevenDays}
        />
      </ScrollView>
    </View>
  );
}

function nextAlarmSortValue(alarm: { hour: number; minute: number; weekdays: number[] }) {
  const next = new Date();
  next.setSeconds(0, 0);
  for (let offset = 0; offset <= 8; offset++) {
    const candidate = new Date(next);
    candidate.setDate(next.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);
    const matches = alarm.weekdays.length === 0 || alarm.weekdays.includes(candidate.getDay());
    if (matches && candidate.getTime() > Date.now()) return candidate.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

/* ----------------------------- PermissionBanner -------------------------- */

function PermissionBanner() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/settings')}
      accessibilityRole="button"
      accessibilityLabel="Activar notificaciones"
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: colors.warningSoft, borderColor: colors.warning },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icon name="info" size={18} color={colors.warning} />
      <View style={styles.bannerText}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>Activa las notificaciones</Text>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          Sin ellas tus alarmas no pueden avisarte a la hora.
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.warning} />
    </Pressable>
  );
}

/* ------------------------------- QuickActions ---------------------------- */

type QuickActionsProps = {
  onCreateAlarm: () => void;
  onCreateReminder: () => void;
  onOpenCalendar: () => void;
  onOpenSounds: () => void;
};

function QuickActions({ onCreateAlarm, onCreateReminder, onOpenCalendar, onOpenSounds }: QuickActionsProps) {
  const { colors } = useTheme();
  const actions: { id: string; label: string; icon: IconName; onPress: () => void; tint: string }[] = [
    { id: 'alarm', label: 'Alarma', icon: 'alarm', onPress: onCreateAlarm, tint: colors.accent },
    { id: 'reminder', label: 'Tarea', icon: 'bell', onPress: onCreateReminder, tint: colors.secondary },
    { id: 'calendar', label: 'Agenda', icon: 'calendar', onPress: onOpenCalendar, tint: colors.info },
    { id: 'sounds', label: 'Sonido', icon: 'volume', onPress: onOpenSounds, tint: colors.warning },
  ];

  return (
    <View style={styles.quickRow}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name={action.icon} size={20} color={action.tint} />
          </View>
          <Text numberOfLines={1} style={[typography.micro, { color: colors.textMuted }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* -------------------------------- TodayCard ------------------------------ */

function TodayCard({
  completed,
  total,
  rate,
  streaks,
  lastRings,
}: {
  completed: number;
  total: number;
  rate: number;
  streaks: number;
  lastRings: { label: string; rings: number; shakes: number }[];
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const max = Math.max(1, ...lastRings.map((d) => d.rings));

  return (
    <Card style={styles.todayCard}>
      <SectionHeader
        title="Tu semana"
        action={{ label: 'Ver detalle', onPress: () => router.push('/stats') }}
        style={{ marginBottom: spacing.sm }}
      />

      <View style={styles.todayTop}>
        <ProgressRing progress={rate} size={78} thickness={9} color={colors.accent}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{Math.round(rate * 100)}%</Text>
        </ProgressRing>

        <View style={styles.todayStats}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>
            {completed} de {total} completados
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {streaks > 0 ? `Mejor racha: ${streaks} días seguidos.` : 'Completa recordatorios para encadenar días.'}
          </Text>
          <View style={styles.todayPill}>
            <Icon name="zap" size={12} color={colors.accent} strokeWidth={2.4} />
            <Text style={[typography.micro, { color: colors.accent }]}>
              {lastRings.reduce((sum, d) => sum + d.shakes, 0)} agitaciones esta semana
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.weekBars}>
        {lastRings.map((day) => (
          <View key={day.label} style={styles.weekBar}>
            <View style={[styles.weekTrack, { backgroundColor: colors.surfaceSunken }]}>
              <View
                style={[
                  styles.weekFill,
                  {
                    backgroundColor: day.rings > 0 ? colors.accent : 'transparent',
                    height: `${Math.max(day.rings > 0 ? 14 : 4, (day.rings / max) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[typography.micro, { color: colors.textFaint, fontSize: 10 }]}>{day.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  testCard: {
    paddingVertical: spacing.sm,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  testIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testText: {
    flex: 1,
    gap: 2,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickItem: {
    alignItems: 'center',
    gap: 6,
    width: '22%',
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: {
    gap: spacing.xs,
  },
  gap: {
    gap: spacing.sm,
  },
  emptyAlarms: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  todayCard: {
    gap: spacing.sm,
  },
  todayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  todayStats: {
    flex: 1,
    gap: 5,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  weekBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 84,
    gap: spacing.xs,
  },
  weekBar: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  weekTrack: {
    width: '100%',
    flex: 1,
    borderRadius: radius.pill,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekFill: {
    width: '100%',
    borderRadius: radius.pill,
  },
});
