import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { nextOccurrence } from './date';
import type { Alarm, Reminder, Weekday } from './types';

export const ALARM_CHANNEL_ID = 'shake-alarms';
export const REMINDER_CHANNEL_ID = 'shake-reminders';

/**
 * SDK 57 renamed `shouldShowAlert` to `shouldShowBanner` / `shouldShowList`.
 * Without a handler the OS drops the notification entirely.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function ensureChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: 'Alarmas Shake',
    description: 'Avisos de tus alarmas. Suenan en pantalla completa con sonido y vibración.',
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    vibrationPattern: [0, 600, 400, 600, 400],
    bypassDnd: true,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Recordatorios',
    description: 'Avisos de recordatorios personales.',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    vibrationPattern: [0, 250, 200, 250],
    sound: 'default',
  });
}

/**
 * Android 13+ will not show the permission dialog until at least one channel
 * exists, so channels are created before asking.
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionState> {
  try {
    await ensureChannels();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';

    const response = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return response.granted ? 'granted' : 'denied';
  } catch (error) {
    console.warn('[notifications] permission request failed', error);
    return 'unavailable';
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    // On iOS the granular `ios.status` is authoritative.
    if (existing.ios?.status === 3) return 'granted'; // PROVISIONAL
    if (existing.status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Opens the OS settings screen for this app so a denied permission can be fixed.
 * `Notifications.openSettingsForApp` was removed in SDK 57, so `Linking` is used.
 */
export function openSystemNotificationSettings() {
  Linking.openSettings().catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/**
 * `WeekdayTriggerInput` uses 1-7 where 1 is Sunday, while `Date#getDay()`
 * uses 0-6 where 0 is Sunday.
 */
function toTriggerWeekday(day: Weekday) {
  return day === 0 ? 1 : day + 1;
}

export type ScheduledIds = { ids: string[]; nextTriggerAt: number | null };

export async function cancelScheduled(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        // Already delivered or cancelled; nothing to do.
      })
    )
  );
}

export async function scheduleAlarm(alarm: Alarm): Promise<ScheduledIds> {
  await cancelScheduled(alarm.notificationIds);
  if (!alarm.enabled) return { ids: [], nextTriggerAt: null };

  const channelId = ALARM_CHANNEL_ID;
  const label = alarm.label.trim() || 'Despertar';
  const shakeTarget = alarm.dismissMode === 'shake' ? alarm.shakeTarget : alarm.dismissMode === 'both' ? alarm.shakeTarget : 0;
  const challenge =
    shakeTarget > 0
      ? `Agita el teléfono ${shakeTarget} ${shakeTarget === 1 ? 'vez' : 'veces'} para apagarla.`
      : 'Toca "Apagar" para detenerla.';

  const content: Notifications.NotificationContentInput = {
    title: `🔔 ${label}`,
    body: `${challenge} Abre la app para completar el reto.`,
    data: { type: 'alarm', alarmId: alarm.id },
    sound: true,
    // `timeSensitive` bypasses Focus modes on iOS, which is what an alarm needs.
    interruptionLevel: 'timeSensitive',
    priority: 'max',
    color: '#16B884',
  };

  const ids: string[] = [];

  if (alarm.weekdays.length === 0) {
    const when = nextOccurrence(alarm.hour, alarm.minute, []);
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId,
    };
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger }));
    return { ids, nextTriggerAt: when.getTime() };
  }

  let earliest: number | null = null;
  for (const day of alarm.weekdays) {
    const trigger: Notifications.WeeklyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      hour: alarm.hour,
      minute: alarm.minute,
      weekday: toTriggerWeekday(day),
      channelId,
    };
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger }));

    const occurrence = nextOccurrence(alarm.hour, alarm.minute, [day]).getTime();
    if (earliest === null || occurrence < earliest) earliest = occurrence;
  }

  return { ids, nextTriggerAt: earliest };
}

export async function scheduleReminder(reminder: Reminder): Promise<ScheduledIds> {
  await cancelScheduled(reminder.notificationIds);
  if (!reminder.enabled || reminder.completed) return { ids: [], nextTriggerAt: null };

  const channelId = REMINDER_CHANNEL_ID;
  const leadSuffix = reminder.leadMinutes > 0 ? ` · aviso ${reminder.leadMinutes} min antes` : '';
  const content: Notifications.NotificationContentInput = {
    title: reminder.title.trim() || 'Recordatorio',
    body: `${reminder.notes.trim() || 'Toca para marcarlo como hecho.'}${leadSuffix}`,
    data: { type: 'reminder', reminderId: reminder.id },
    sound: true,
    interruptionLevel: 'active',
    priority: 'high',
    color: '#7C5CF6',
  };

  const fireAt = reminder.dueAt - reminder.leadMinutes * 60_000;
  if (fireAt <= Date.now()) return { ids: [], nextTriggerAt: null };

  const ids: string[] = [];

  if (reminder.weekdays.length === 0) {
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId,
    };
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger }));
    return { ids, nextTriggerAt: fireAt };
  }

  let earliest: number | null = null;
  for (const day of reminder.weekdays) {
    const first = nextOccurrenceFrom(fireAt, day);
    if (first.getTime() <= Date.now()) continue;

    const trigger: Notifications.WeeklyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      hour: first.getHours(),
      minute: first.getMinutes(),
      weekday: toTriggerWeekday(day),
      channelId,
    };
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger }));
    if (earliest === null || first.getTime() < earliest) earliest = first.getTime();
  }

  return { ids, nextTriggerAt: earliest };
}

/** First future moment at or after `from` that lands on `day`, same clock time. */
function nextOccurrenceFrom(from: number, day: Weekday) {
  const date = new Date(from);
  date.setSeconds(0, 0);
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    candidate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    if (candidate.getDay() === day && candidate.getTime() >= from) return candidate;
  }
  const fallback = new Date(date);
  fallback.setDate(date.getDate() + 7);
  return fallback;
}

/**
 * iOS caps the number of pending local notifications (64). Scheduling is
 * best-effort: identifiers for skipped items are simply not stored.
 */
export async function scheduleAll(alarms: Alarm[], reminders: Reminder[]) {
  const results = await Promise.all([
    ...alarms.map(async (alarm) => ({ id: alarm.id, ...(await scheduleAlarm(alarm)) })),
    ...reminders.map(async (reminder) => ({ id: reminder.id, ...(await scheduleReminder(reminder)) })),
  ]);
  return new Map(results.map((r) => [r.id, { ids: r.ids, nextTriggerAt: r.nextTriggerAt }]));
}

export async function pendingCount() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}

/**
 * The OS drops pending notifications on app update in some cases and clears
 * them if the app data is wiped, so identifiers are re-registered on launch.
 */
export async function rehydrate(alarms: Alarm[], reminders: Reminder[]) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const liveIds = new Set(scheduled.map((n) => n.identifier));
    const lost: string[] = [];
    alarms.forEach((alarm) => {
      const missing = alarm.notificationIds.filter((id) => !liveIds.has(id));
      if (missing.length > 0) lost.push(...missing);
    });
    reminders.forEach((reminder) => {
      const missing = reminder.notificationIds.filter((id) => !liveIds.has(id));
      if (missing.length > 0) lost.push(...missing);
    });
    return lost;
  } catch (error) {
    console.warn('[notifications] rehydrate failed', error);
    return [];
  }
}
