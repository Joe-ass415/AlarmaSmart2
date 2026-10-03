import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock, formatCountdown, formatDays, formatRelative, formatTime, nextOccurrence } from '../core/date';
import { getSound } from '../core/sounds';
import type { Alarm, Reminder } from '../core/types';
import { useTheme } from '../theme/ThemeProvider';
import { useNow } from '../hooks/useNow';
import { fonts, radius, spacing, typography } from '../theme/tokens';
import { Icon, type IconName } from './ui/icon';
import { Switch } from './ui/primitives';

type AlarmRowProps = {
  alarm: Alarm;
  use24Hour: boolean;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
  /** Shows "En X" / "Mañana" instead of the days summary. */
  showCountdown?: boolean;
};

export function AlarmRow({ alarm, use24Hour, onToggle, onPress, showCountdown }: AlarmRowProps) {
  const { colors } = useTheme();
  const sound = getSound(alarm.soundId);
  const time = formatClock(alarm.hour, alarm.minute, use24Hour);

  const meta = alarm.weekdays.length === 0
    ? 'Una vez'
    : showCountdown && alarm.nextOccurrenceAt
      ? formatRelative(alarm.nextOccurrenceAt)
      : formatDays(alarm.weekdays);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${alarm.label || 'Alarma'} a las ${time}`}
      style={({ pressed }) => [
        styles.alarmRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !alarm.enabled && styles.dimmed,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.alarmAccent, { backgroundColor: alarm.enabled ? colors.accent : colors.border }]} />

      <View style={styles.alarmBody}>
        <View style={styles.alarmTop}>
          <Text
            numberOfLines={1}
            style={[
              typography.title,
              { color: colors.text, fontFamily: fonts.display, flexShrink: 1 },
            ]}
          >
            {time}
          </Text>
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            accessibilityLabel={`Activar alarma ${alarm.label || time}`}
          />
        </View>

        <Text numberOfLines={1} style={[typography.bodyStrong, { color: alarm.enabled ? colors.text : colors.textFaint }]}>
          {alarm.label || 'Despertar'}
        </Text>

        <View style={styles.tagRow}>
          <Tag icon="repeat" label={meta} />
          <Tag icon="volume" label={sound.name} />
          {alarm.dismissMode !== 'shake' ? <Tag icon="zap" label="Sin reto" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Tag({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.surfaceSunken }]}>
      <Icon name={icon} size={12} color={colors.textFaint} strokeWidth={2.2} />
      <Text numberOfLines={1} style={[typography.micro, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------- Reminder ------------------------------- */

type ReminderRowProps = {
  reminder: Reminder;
  use24Hour: boolean;
  onPress?: () => void;
  onToggleComplete?: () => void;
  onSnooze?: () => void;
  showCategory?: boolean;
  /** Compact rows are used inside the home screen's upcoming card. */
  compact?: boolean;
};

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  school: { emoji: '🎓', color: '#7C5CF6' },
  work: { emoji: '💼', color: '#2C86E8' },
  health: { emoji: '💚', color: '#16B884' },
  personal: { emoji: '⭐', color: '#F5A623' },
};

export function ReminderRow({
  reminder,
  use24Hour,
  onPress,
  onToggleComplete,
  onSnooze,
  showCategory = true,
  compact,
}: ReminderRowProps) {
  const { colors } = useTheme();
  const now = useNow();
  const category = CATEGORY_META[reminder.category] ?? CATEGORY_META.personal;
  const fireAt = reminder.dueAt - reminder.leadMinutes * 60_000;
  const overdue = !reminder.completed && now > 0 && fireAt <= now;

  return (
    <View
      style={[
        styles.reminderRow,
        compact && styles.reminderRowCompact,
        { backgroundColor: colors.surface, borderColor: colors.border },
        reminder.completed && { opacity: 0.55 },
      ]}
    >
      <Pressable
        onPress={onToggleComplete}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: reminder.completed }}
        accessibilityLabel={`Marcar ${reminder.title} como ${reminder.completed ? 'pendiente' : 'hecho'}`}
        style={[styles.checkbox, { borderColor: reminder.completed ? colors.success : colors.borderStrong }]}
      >
        {reminder.completed ? <Icon name="check" size={14} color={colors.success} strokeWidth={2.8} /> : null}
      </Pressable>

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        style={styles.reminderBody}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.bodyStrong,
            { color: colors.text, textDecorationLine: reminder.completed ? 'line-through' : 'none' },
          ]}
        >
          {showCategory ? `${category.emoji} ` : ''}
          {reminder.title}
        </Text>

        <View style={styles.reminderMeta}>
          <Text
            style={[
              typography.micro,
              { color: overdue ? colors.danger : colors.textMuted },
            ]}
          >
            {reminder.completed && reminder.completedAt
              ? `Hecho · ${formatTime(new Date(reminder.completedAt), use24Hour)}`
              : formatTime(new Date(fireAt), use24Hour)}
          </Text>
          {reminder.leadMinutes > 0 && !reminder.completed ? (
            <>
              <Dot />
              <Text style={[typography.micro, { color: colors.textFaint }]}>{reminder.leadMinutes} min antes</Text>
            </>
          ) : null}
          {reminder.weekdays.length > 0 && !reminder.completed ? (
            <>
              <Dot />
              <Text style={[typography.micro, { color: colors.textFaint }]}>{formatDays(reminder.weekdays)}</Text>
            </>
          ) : null}
        </View>
      </Pressable>

      {onSnooze && !reminder.completed ? (
        <Pressable
          onPress={onSnooze}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Posponer ${reminder.title} 10 minutos`}
          style={({ pressed }) => [styles.snoozeButton, { backgroundColor: colors.surfaceSunken }, pressed && { opacity: 0.6 }]}
        >
          <Icon name="skip" size={15} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Dot() {
  const { colors } = useTheme();
  return <Text style={[typography.micro, { color: colors.textFaint }]}>·</Text>;
}

/* ------------------------------- Countdown ------------------------------- */

/** Hero block showing the next alarm and a live countdown. */
export function NextAlarmHero({ alarm, use24Hour }: { alarm: Alarm | null; use24Hour: boolean }) {
  const { colors, shadows } = useTheme();

  if (!alarm) {
    return (
      <View style={[styles.hero, styles.heroEmpty, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.card]}>
        <View style={[styles.heroIconCircle, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name="alarm" size={26} color={colors.textFaint} />
        </View>
        <Text style={[typography.title, { color: colors.text, fontFamily: fonts.display }]}>Sin alarmas activas</Text>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', maxWidth: 250 }]}>
          Crea tu primera alarma y agítala para despertarte de verdad.
        </Text>
      </View>
    );
  }

  const occurrenceAt = nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays).getTime();
  const countdown = formatCountdown(occurrenceAt);

  return (
    <View style={[styles.hero, shadows.raised]}>
      <LinearGradient
        colors={[colors.accent, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.heroHeader}>
        <Text style={[typography.micro, { color: 'rgba(255,255,255,0.78)' }]}>PRÓXIMA ALARMA</Text>
        <View style={styles.heroHeaderRight}>
          <Icon name="alarm" size={15} color="rgba(255,255,255,0.9)" strokeWidth={2.3} />
          <Text style={[typography.micro, { color: 'rgba(255,255,255,0.9)' }]}>
            {formatClock(alarm.hour, alarm.minute, use24Hour)}
          </Text>
        </View>
      </View>

      <Text numberOfLines={1} style={[typography.display, styles.heroLabel, { color: '#FFFFFF' }]}>
        {alarm.label || 'Despertar'}
      </Text>

      <View style={styles.countdownRow}>
        <CountdownUnit value={countdown.hoursText} label="h" />
        <Text style={[styles.countdownSeparator, { color: 'rgba(255,255,255,0.45)' }]}>:</Text>
        <CountdownUnit value={countdown.minutesText} label="m" />
        <Text style={[styles.countdownSeparator, { color: 'rgba(255,255,255,0.45)' }]}>:</Text>
        <CountdownUnit value={String(countdown.seconds).padStart(2, '0')} label="s" />
      </View>

      <View style={styles.heroFooter}>
        <View style={styles.heroPill}>
          <Icon name="repeat" size={13} color="rgba(255,255,255,0.95)" strokeWidth={2.4} />
          <Text style={[typography.micro, { color: 'rgba(255,255,255,0.95)' }]}>
            {alarm.weekdays.length === 0 ? 'Una vez' : formatDays(alarm.weekdays)}
          </Text>
        </View>
        <Text style={[typography.micro, { color: 'rgba(255,255,255,0.8)' }]}>{formatRelative(occurrenceAt)}</Text>
      </View>
    </View>
  );
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={[styles.countdownValue, { color: '#FFFFFF' }]}>{value}</Text>
      <Text style={[typography.micro, { color: 'rgba(255,255,255,0.6)' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alarmRow: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.6,
  },
  alarmAccent: {
    width: 5,
  },
  alarmBody: {
    flex: 1,
    padding: spacing.md,
    gap: 3,
  },
  alarmTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reminderRowCompact: {
    padding: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  snoozeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  heroEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    marginTop: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 52,
  },
  countdownValue: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  countdownSeparator: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 46,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
