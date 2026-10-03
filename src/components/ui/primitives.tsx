import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { tapFeedback } from '../../core/haptics';

import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius, spacing, typography } from '../../theme/tokens';

/* --------------------------------- Switch -------------------------------- */

type SwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Switch({ value, onValueChange, disabled, accessibilityLabel }: SwitchProps) {
  const { colors } = useTheme();
  const trackColor = value ? colors.accent : colors.borderStrong;

  return (
    <Pressable
      role="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        tapFeedback();
        onValueChange(!value);
      }}
      style={({ pressed }) => [
        styles.track,
        { backgroundColor: trackColor },
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={[styles.knob, { transform: [{ translateX: value ? 20 : 2 }] }]} />
    </Pressable>
  );
}

/* --------------------------------- Chip ---------------------------------- */

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  tone?: 'accent' | 'neutral' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected, onPress, icon, tone = 'accent', size = 'md', style }: ChipProps) {
  const { colors } = useTheme();

  const tones = {
    accent: { bg: colors.accent, fg: colors.accentOn, border: colors.accent },
    neutral: { bg: colors.surfaceSunken, fg: colors.textMuted, border: colors.border },
    success: { bg: colors.success, fg: '#FFFFFF', border: colors.success },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
    warning: { bg: colors.warning, fg: '#FFFFFF', border: colors.warning },
  } as const;

  const active = selected
    ? { backgroundColor: tones[tone].bg, borderColor: tones[tone].border }
    : { backgroundColor: colors.surface, borderColor: colors.border };
  const textColor = selected ? tones[tone].fg : colors.textMuted;

  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        tapFeedback();
        onPress();
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        size === 'sm' && styles.chipSm,
        active,
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {icon}
      <Text style={[size === 'sm' ? typography.micro : typography.caption, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------- IconButton ------------------------------ */

type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  tone?: 'plain' | 'filled' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, onPress, accessibilityLabel, size = 42, tone = 'plain', style }: IconButtonProps) {
  const { colors } = useTheme();
  const background = tone === 'filled' ? colors.surfaceSunken : tone === 'danger' ? colors.dangerSoft : 'transparent';

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed && { opacity: 0.65, transform: [{ scale: 0.94 }] },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

/* --------------------------------- Avatar -------------------------------- */

const AVATAR_COLORS = ['#7C5CF6', '#16B884', '#2C86E8', '#F5A623', '#F45563', '#6941E8'];

type AvatarProps = {
  name: string;
  size?: number;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Initials on a deterministic color, so a person keeps the same tint. */
export function Avatar({ name, size = 40, ring, style }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const fallback = name.trim()[0]?.toUpperCase() ?? '?';
  const text = initials || fallback;
  const colorIndex = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: AVATAR_COLORS[colorIndex],
          borderWidth: ring ? 2.5 : 0,
          borderColor: colors.surface,
        },
        style,
      ]}
    >
      <Text style={{ color: '#FFFFFF', fontFamily: fonts.displaySemi, fontSize: size * 0.38 }}>{text}</Text>
    </View>
  );
}

/* ------------------------------- ProgressRing ----------------------------- */

type ProgressRingProps = {
  /** 0-1 */
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
};

export function ProgressRing({ progress, size = 92, thickness = 9, color, trackColor, children }: ProgressRingProps) {
  const { colors } = useTheme();
  const radiusValue = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={trackColor ?? colors.surfaceSunken}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color ?? colors.accent}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ------------------------------- StatTile -------------------------------- */

type StatTileProps = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; tone?: 'success' | 'danger' | 'muted' };
  style?: StyleProp<ViewStyle>;
};

export function StatTile({ label, value, icon, delta, style }: StatTileProps) {
  const { colors } = useTheme();
  const deltaTone = delta?.tone ?? (delta?.direction === 'up' ? 'success' : delta?.direction === 'down' ? 'danger' : 'muted');
  const deltaColor =
    deltaTone === 'success' ? colors.success : deltaTone === 'danger' ? colors.danger : colors.textFaint;

  return (
    <View style={[styles.statTile, style]}>
      <View style={styles.statTileHeader}>
        {icon}
        <Text numberOfLines={1} style={[typography.micro, { color: colors.textFaint, flex: 1 }]}>
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} style={[typography.title, { color: colors.text, fontFamily: fonts.display }]}>
        {value}
      </Text>
      {delta ? (
        <View style={styles.deltaRow}>
          <Text style={[typography.micro, { color: deltaColor }]}>
            {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '•'} {delta.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ EmptyState ------------------------------- */

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({ icon, title, message, action, compact }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, compact && { paddingVertical: spacing.xl }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>{icon}</View>
      <Text style={[typography.heading, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', maxWidth: 280 }]}>{message}</Text>
      {action}
    </View>
  );
}

/* ---------------------------- SegmentedControl --------------------------- */

type Segment<T extends string> = { id: T; label: string };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({ segments, value, onChange, style }: SegmentedControlProps<T>) {
  const { colors, shadows } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceSunken }, style]}>
      {segments.map((segment) => {
        const active = segment.id === value;
        return (
          <Pressable
            key={segment.id}
            onPress={() => {
              tapFeedback();
              onChange(segment.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              active && { backgroundColor: colors.surface, ...shadows.card },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: active ? colors.text : colors.textMuted }]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------- Stepper --------------------------------- */

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the value for display. */
  format?: (value: number) => string;
  /** Unit label shown after the value. */
  unit?: string;
  style?: StyleProp<ViewStyle>;
};

export function Stepper({ value, onChange, min = 0, max = 100, step = 1, format, unit, style }: StepperProps) {
  const { colors } = useTheme();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <View style={[styles.stepper, style]}>
      <Pressable
        onPress={() => {
          tapFeedback();
          onChange(clamp(value - step));
        }}
        disabled={value <= min}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Restar"
        style={({ pressed }) => [
          styles.stepperButton,
          { backgroundColor: colors.surfaceSunken },
          value <= min && { opacity: 0.35 },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[typography.heading, { color: colors.text }]}>−</Text>
      </Pressable>

      <View style={styles.stepperValue}>
        <Text style={[typography.title, { color: colors.text, fontFamily: fonts.display }]}>
          {format ? format(value) : value}
        </Text>
        {unit ? <Text style={[typography.micro, { color: colors.textFaint }]}>{unit}</Text> : null}
      </View>

      <Pressable
        onPress={() => {
          tapFeedback();
          onChange(clamp(value + step));
        }}
        disabled={value >= max}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sumar"
        style={({ pressed }) => [
          styles.stepperButton,
          { backgroundColor: colors.surfaceSunken },
          value >= max && { opacity: 0.35 },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[typography.heading, { color: colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1F2E',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTile: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  statTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 72,
    alignItems: 'center',
    gap: 1,
  },
});
