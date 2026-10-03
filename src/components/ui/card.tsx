import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

type CardProps = ViewProps & {
  /** Adds the soft elevated shadow used across the app. */
  raised?: boolean;
  padded?: boolean;
  variant?: 'surface' | 'alt' | 'sunken';
};

export function Card({ raised, padded = true, variant = 'surface', style, ...rest }: CardProps) {
  const { colors, shadows } = useTheme();
  const backgroundColor = variant === 'alt' ? colors.surfaceAlt : variant === 'sunken' ? colors.surfaceSunken : colors.surface;

  return (
    <View
      {...rest}
      style={[
        styles.base,
        { backgroundColor, borderColor: colors.border },
        raised && shadows.card,
        padded && styles.padded,
        style,
      ]}
    />
  );
}

type SectionHeaderProps = {
  title: string;
  /** Right-aligned affordance, e.g. "Ver todo" or an action button. */
  action?: { label: string; onPress: () => void };
  subtitle?: string;
  style?: ViewProps['style'];
};

export function SectionHeader({ title, action, subtitle, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderText}>
        <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.6 }]}
        >
          <Text style={[typography.caption, { color: colors.accent, fontFamily: typography.caption.fontFamily }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderText: {
    gap: 2,
  },
  sectionAction: {
    paddingVertical: spacing.xxs,
    paddingLeft: spacing.sm,
  },
});
