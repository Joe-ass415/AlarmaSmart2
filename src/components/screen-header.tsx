import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

/** Screen header used by every tab, matching the reference layouts. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  left,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {left}
      <View style={styles.headerText}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function HeaderButton({
  children,
  onPress,
  label,
  badge,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  badge?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      {children}
      {badge && badge > 0 ? (
        <View style={[styles.headerBadge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Text style={styles.headerBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  headerBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
  },
});
