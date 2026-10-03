import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { tapFeedback } from '../../core/haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the label. */
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors, shadows } = useTheme();
  const isDisabled = disabled || loading;

  const height = size === 'lg' ? 56 : size === 'sm' ? 38 : 48;
  const textVariant = size === 'lg' ? typography.heading : size === 'sm' ? typography.caption : typography.bodyStrong;

  const background: Record<ButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.secondary,
    ghost: colors.surfaceSunken,
    danger: colors.dangerSoft,
    outline: 'transparent',
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: colors.accentOn,
    secondary: '#FFFFFF',
    ghost: colors.text,
    danger: colors.danger,
    outline: colors.text,
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={foreground[variant]} />
      ) : (
        <>
          {icon}
          <Text numberOfLines={1} style={[textVariant, { color: foreground[variant] }]}>
            {label}
          </Text>
        </>
      )}
    </>
  );

  const inner = (
    <View style={[styles.base, { height, paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl }]}>{content}</View>
  );

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      accessibilityLabel={label}
      onPress={(event) => {
        if (!isDisabled) tapFeedback();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.wrapper,
        { backgroundColor: background[variant] },
        variant === 'primary' && shadows.card,
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.borderStrong },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.accent, shiftAccent(colors.accent)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {inner}
    </Pressable>
  );
}

/** Darkens a hex color slightly for the gradient's second stop. */
function shiftAccent(hex: string) {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const value = parseInt(hex.slice(1, 7), 16);
  const r = Math.max(0, ((value >> 16) & 0xff) - 24);
  const g = Math.max(0, ((value >> 8) & 0xff) - 14);
  const b = Math.max(0, (value & 0xff) - 6);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
