import { useSyncExternalStore } from 'react';

type TabBarState = {
  /** Collapsed by scrolling down, restored by scrolling up or on tab change. */
  visible: boolean;
};

let state: TabBarState = { visible: true };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const tabBarStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setVisible(visible: boolean) {
    if (state.visible === visible) return;
    state = { ...state, visible };
    emit();
  },
  /** Called on every tab press so the bar always reappears. */
  reset() {
    tabBarStore.setVisible(true);
  },
};

/**
 * Lets long screens (home, alarms, reminders) collapse the floating tab bar
 * while scrolling, as in the reference designs.
 */
export function useTabBarVisible() {
  return useSyncExternalStore(tabBarStore.subscribe, tabBarStore.getSnapshot, tabBarStore.getSnapshot).visible;
}
