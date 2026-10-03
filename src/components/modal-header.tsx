import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, spacing, typography } from '../theme/tokens';
import { Icon } from './ui/icon';

type ModalHeaderProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  right?: React.ReactNode;
};

/** Shared header for every modal screen. */
export function ModalHeader({ title, subtitle, onClose, right }: ModalHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs, borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={({ pressed }) => [
          styles.close,
          { backgroundColor: colors.surfaceSunken },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Icon name="close" size={18} color={colors.text} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.text}>
        <Text numberOfLines={1} style={[typography.title, { color: colors.text, fontFamily: fonts.display, fontSize: 19 }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.micro, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? <View style={styles.close} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
