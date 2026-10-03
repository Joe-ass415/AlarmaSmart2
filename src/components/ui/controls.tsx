import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tapFeedback } from '../../core/haptics';
import { Switch } from './primitives';
import { WEEKDAYS, type Weekday } from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from './icon';

type WeekdayPickerProps = {
  selected: Weekday[];
  onChange: (next: Weekday[]) => void;
  /** When false the row cannot be changed, e.g. inside a locked Premium row. */
  editable?: boolean;
  compact?: boolean;
};

export function WeekdayPicker({ selected, onChange, editable = true, compact }: WeekdayPickerProps) {
  const { colors } = useTheme();
  const set = new Set(selected);

  const toggle = (day: Weekday) => {
    if (!editable) return;
    tapFeedback();
    const next = set.has(day) ? selected.filter((d) => d !== day) : [...selected, day];
    onChange(next.sort((a, b) => WEEKDAYS.findIndex((w) => w.value === a) - WEEKDAYS.findIndex((w) => w.value === b)));
  };

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((day) => {
        const active = set.has(day.value);
        const isToday = new Date().getDay() === day.value;
        return (
          <Pressable
            key={day.value}
            onPress={() => toggle(day.value)}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !editable }}
            accessibilityLabel={day.long}
            style={({ pressed }) => [
              styles.day,
              compact && styles.dayCompact,
              { backgroundColor: active ? colors.accent : colors.surface },
              { borderColor: active ? colors.accent : colors.border },
              isToday && !active && { borderColor: colors.accent, borderStyle: 'dashed' },
              pressed && editable && { opacity: 0.7 },
              !editable && { opacity: 0.5 },
            ]}
          >
            <Text
              style={[
                compact ? typography.micro : typography.caption,
                { color: active ? colors.accentOn : colors.textMuted },
              ]}
            >
              {day.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type SummaryRowProps = {
  label: string;
  /** Rendered on the right; pressable rows get a chevron. */
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  locked?: boolean;
  lockedHint?: string;
  danger?: boolean;
  /** Right-aligned custom content instead of `value`. */
  children?: React.ReactNode;
  stacked?: boolean;
};

export function SummaryRow({
  label,
  value,
  onPress,
  icon,
  locked,
  lockedHint,
  danger,
  children,
  stacked,
}: SummaryRowProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.summaryRow, stacked && styles.summaryRowStacked]}>
      <View style={styles.summaryLeft}>
        {icon}
        <View style={styles.summaryText}>
          <Text style={[typography.bodyStrong, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
          {locked && lockedHint ? (
            <Text style={[typography.micro, { color: colors.textFaint }]}>{lockedHint}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.summaryRight}>
        {children}
        {!children && value !== undefined ? (
          <Text numberOfLines={1} style={[typography.body, { color: locked ? colors.textFaint : colors.textMuted }]}>
            {value}
          </Text>
        ) : null}
        {locked ? <Icon name="lock" size={16} color={colors.warning} /> : null}
        {onPress ? <Icon name="chevron-right" size={18} color={colors.textFaint} /> : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      {content}
    </Pressable>
  );
}

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function ToggleRow({ label, description, value, onValueChange, icon, disabled }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryRow, disabled && { opacity: 0.5 }]}>
      <View style={styles.summaryLeft}>
        {icon}
        <View style={styles.summaryText}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{label}</Text>
          {description ? <Text style={[typography.caption, { color: colors.textMuted }]}>{description}</Text> : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompact: {
    aspectRatio: 1,
    maxHeight: 38,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  summaryRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  summaryText: {
    gap: 2,
    flexShrink: 1,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
});
