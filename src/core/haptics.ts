import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { HapticStrength } from './types';

let enabled = true;
let strength: HapticStrength = 'medium';

export function configureHaptics(nextEnabled: boolean, nextStrength: HapticStrength) {
  enabled = nextEnabled;
  strength = nextStrength;
}

const IMPACT_BY_STRENGTH: Record<Exclude<HapticStrength, 'off'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  strong: Haptics.ImpactFeedbackStyle.Heavy,
};

function activeStrength(): Exclude<HapticStrength, 'off'> | null {
  if (!enabled || strength === 'off') return null;
  return strength;
}

function guard(run: () => Promise<void>) {
  if (!enabled || strength === 'off') return;
  run().catch(() => {
    // Haptics are unavailable on web without support, and are no-ops in some
    // device states. Feedback is decorative, so failures are ignored.
  });
}

/** Light tick for selection changes: toggles, chips, day pickers. */
export function tapFeedback() {
  guard(() => Haptics.selectionAsync());
}

/** Light tick for a registered shake. */
export function shakeFeedback() {
  guard(() => Haptics.impactAsync(IMPACT_BY_STRENGTH.light));
}

/** Medium bump for meaningful actions: saving, completing a reminder. */
export function impactFeedback() {
  const level = activeStrength();
  if (!level) return;
  guard(() => Haptics.impactAsync(IMPACT_BY_STRENGTH[level]));
}

/** Heavy bump used once when an alarm challenge is completed. */
export function successFeedback() {
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningFeedback() {
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorFeedback() {
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Repeating haptic used to keep an unanswered alarm present. */
export function alertFeedback() {
  const level = activeStrength();
  if (!level) return;
  if (Platform.OS === 'android') {
    guard(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject));
    return;
  }
  guard(() => Haptics.impactAsync(IMPACT_BY_STRENGTH[level]));
}
