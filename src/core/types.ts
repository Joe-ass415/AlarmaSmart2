/** ISO weekday indexes that match `Date.prototype.getDay()` (0 = Sunday). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: 'Lun', long: 'Lunes' },
  { value: 2, short: 'Mar', long: 'Martes' },
  { value: 3, short: 'Mié', long: 'Miércoles' },
  { value: 4, short: 'Jue', long: 'Jueves' },
  { value: 5, short: 'Vie', long: 'Viernes' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
  { value: 0, short: 'Dom', long: 'Domingo' },
];

export type HapticStrength = 'off' | 'light' | 'medium' | 'strong';
export type ThemePreference = 'system' | 'light' | 'dark';
export type DismissMode = 'shake' | 'both';
export type ColorSchemePreference = 'light' | 'dark';

/** How an alarm was turned off, persisted for the stats screen. */
export type DismissOutcome = 'shake' | 'snooze' | 'emergency' | 'silent';

export type DismissLog = {
  id: string;
  alarmId: string;
  label: string;
  /** Epoch ms when the alarm rang. */
  rangAt: number;
  outcome: DismissOutcome;
  /** Number of shakes registered. */
  shakes: number;
  /** Seconds from ring to dismiss. */
  secondsToDismiss: number;
};

export type Alarm = {
  id: string;
  label: string;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
  /** Empty array = one-shot alarm. */
  weekdays: Weekday[];
  enabled: boolean;
  /** Id from the sound library. */
  soundId: string;
  vibrate: HapticStrength;
  /** Minutes between snoozes. */
  snoozeMinutes: number;
  dismissMode: DismissMode;
  /** Required number of shakes to dismiss. 1-20 */
  shakeTarget: number;
  /** Seconds the ring screen stays active before auto-stopping. 0 = unlimited. */
  ringTimeoutSeconds: number;
  /** Notification identifiers currently scheduled for this alarm. */
  notificationIds: string[];
  /** Epoch ms of the next upcoming occurrence, cached for the home screen. */
  nextOccurrenceAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type ReminderCategory = 'school' | 'work' | 'health' | 'personal';

export const REMINDER_CATEGORIES: {
  id: ReminderCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: 'school', label: 'Escuela', emoji: '🎓', color: '#7C5CF6' },
  { id: 'work', label: 'Trabajo', emoji: '💼', color: '#2C86E8' },
  { id: 'health', label: 'Salud', emoji: '💚', color: '#16B884' },
  { id: 'personal', label: 'Personal', emoji: '⭐', color: '#F5A623' },
];

export type Reminder = {
  id: string;
  title: string;
  notes: string;
  category: ReminderCategory;
  /** Epoch ms the reminder is actually about. */
  dueAt: number;
  /** Minutes before `dueAt` that the notification fires. */
  leadMinutes: number;
  /** Empty array = one-shot. */
  weekdays: Weekday[];
  enabled: boolean;
  completed: boolean;
  completedAt: number | null;
  /** Epoch ms of the next scheduled notification. */
  nextTriggerAt: number | null;
  notificationIds: string[];
  /** Optional link to a calendar event. */
  calendarEventId?: string;
  createdAt: number;
};

export type AlarmProfile = {
  id: string;
  name: string;
  soundId: string;
  vibrate: HapticStrength;
  shakeTarget: number;
  isPremium: boolean;
};

export type Settings = {
  userName: string;
  colorScheme: ThemePreference;
  accent: 'mint' | 'violet' | 'sky' | 'amber' | 'coral';
  /** 1 (strict) - 10 (very sensitive) */
  shakeSensitivity: number;
  hapticsEnabled: boolean;
  hapticStrength: HapticStrength;
  use24Hour: boolean;
  /** Notifications enabled per category, so users can mute reminders only. */
  alarmNotificationsEnabled: boolean;
  reminderNotificationsEnabled: boolean;
  calendarEnabled: boolean;
  calendarId: string | null;
  /** Simulated subscription state for the MVP. */
  premium: boolean;
  trialEndsAt: number | null;
  onboarded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  userName: 'Tú',
  colorScheme: 'system',
  accent: 'mint',
  shakeSensitivity: 6,
  hapticsEnabled: true,
  hapticStrength: 'medium',
  use24Hour: false,
  alarmNotificationsEnabled: true,
  reminderNotificationsEnabled: true,
  calendarEnabled: false,
  calendarId: null,
  premium: false,
  trialEndsAt: null,
  onboarded: false,
};

export const snoozePreset = { amount: 5, label: '5 min' } as const;
