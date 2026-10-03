import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarStore, useTabBarVisible } from '../state/useTabBar';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';
import { Icon, type IconName } from './ui/icon';

/**
 * SDK 57 no longer re-exports `BottomTabBarProps` from `expo-router`, so the
 * props are derived from the `Tabs` navigator's own `tabBar` signature.
 */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, IconName> = {
  index: 'home',
  alarms: 'alarm',
  reminders: 'bell',
  premium: 'crown',
  settings: 'settings',
};

const LABELS: Record<string, string> = {
  index: 'Inicio',
  alarms: 'Alarmas',
  reminders: 'Tareas',
  premium: 'Premium',
  settings: 'Ajustes',
};

/**
 * Floating pill tab bar: the active route expands into a dark capsule with its
 * label, mirroring the reference designs.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const visible = useTabBarVisible();

  const offset = useDerivedValue(() => withTiming(visible ? 0 : 130, { duration: 220 }), [visible]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }, animatedStyle]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { backgroundColor: colors.tabBar, borderColor: colors.border }, shadows.tab]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const name = route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            tabBarStore.reset();
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={LABELS[name] ?? name}
              style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && { opacity: 0.7 }]}
            >
              <Icon
                name={ICONS[name] ?? 'home'}
                size={focused ? 18 : 21}
                color={focused ? colors.accentOn : colors.textFaint}
                strokeWidth={focused ? 2.3 : 1.9}
              />
              {focused ? (
                <Text numberOfLines={1} style={[typography.micro, styles.activeLabel, { color: colors.accentOn }]}>
                  {LABELS[name]}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  item: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.pill,
  },
  itemActive: {
    backgroundColor: '#151A21',
    flex: 1.5,
  },
  activeLabel: {
    letterSpacing: 0.2,
  },
});
