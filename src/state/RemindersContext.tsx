import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { DAY_MS } from '../core/date';
import {
  cancelScheduled,
  requestNotificationPermissions,
  scheduleAll,
  scheduleReminder,
  type NotificationPermissionState,
} from '../core/notifications';
import { impactFeedback } from '../core/haptics';
import { useNow } from '../hooks/useNow';
import { StorageKeys, createId, storage } from '../core/storage';
import type { Reminder } from '../core/types';
import { useSettings } from './SettingsContext';

type RemindersContextValue = {
  reminders: Reminder[];
  ready: boolean;
  permission: NotificationPermissionState;

  pending: Reminder[];
  completed: Reminder[];
  overdue: Reminder[];
  /** Due within the next `days` days, used by the home card. */
  upcomingSoon: Reminder[];
  completionRate: number;
  completedThisWeek: number;

  createReminder: (draft: ReminderDraft) => Promise<Reminder>;
  updateReminder: (id: string, patch: Partial<ReminderDraft>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
};

export type ReminderDraft = Omit<Reminder, 'id' | 'createdAt' | 'completedAt' | 'notificationIds' | 'nextTriggerAt'>;

const RemindersContext = createContext<RemindersContextValue | null>(null);

function persist(reminders: Reminder[]) {
  void storage.writeJson(StorageKeys.reminders, reminders);
}

/** Moment the reminder notification actually fires. */
export function fireTime(reminder: Pick<Reminder, 'dueAt' | 'leadMinutes'>) {
  return reminder.dueAt - reminder.leadMinutes * 60_000;
}

export function RemindersProvider({ children }: PropsWithChildren) {
  const { settings, ready: settingsReady } = useSettings();
  const now = useNow();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');

  useEffect(() => {
    let mounted = true;
    storage.readJson<Reminder[]>(StorageKeys.reminders, []).then((stored) => {
      if (!mounted) return;
      setReminders(stored);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    requestNotificationPermissions().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const scheduleSignature = useMemo(() => JSON.stringify(reminders), [reminders]);

  useEffect(() => {
    if (!ready || !settingsReady) return;
    if (!settings.reminderNotificationsEnabled || permission !== 'granted') return;

    let cancelled = false;
    const current: Reminder[] = JSON.parse(scheduleSignature);

    scheduleAll([], current).then((results) => {
      if (cancelled) return;
      setReminders((existing) => {
        const next = existing.map((reminder) => {
          const result = results.get(reminder.id);
          if (!result) return reminder;
          if (
            reminder.notificationIds.length === result.ids.length &&
            reminder.nextTriggerAt === result.nextTriggerAt &&
            reminder.notificationIds.every((id, i) => id === result.ids[i])
          ) {
            return reminder;
          }
          return { ...reminder, notificationIds: result.ids, nextTriggerAt: result.nextTriggerAt };
        });
        persist(next);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [ready, settingsReady, settings.reminderNotificationsEnabled, permission, scheduleSignature]);

  const createReminder = useCallback(async (draft: ReminderDraft) => {
    const reminder: Reminder = {
      ...draft,
      id: createId('rem'),
      createdAt: Date.now(),
      completedAt: null,
      notificationIds: [],
      nextTriggerAt: null,
    };
    reminder.nextTriggerAt = fireTime(reminder);

    setReminders((current) => {
      const next = [...current, reminder];
      persist(next);
      return next;
    });
    return reminder;
  }, []);

  const updateReminder = useCallback(async (id: string, patch: Partial<ReminderDraft>) => {
    setReminders((current) => {
      const next = current.map((reminder) => {
        if (reminder.id !== id) return reminder;
        const merged: Reminder = { ...reminder, ...patch };
        const timingChanged =
          merged.dueAt !== reminder.dueAt ||
          merged.leadMinutes !== reminder.leadMinutes ||
          JSON.stringify(merged.weekdays) !== JSON.stringify(reminder.weekdays) ||
          merged.enabled !== reminder.enabled ||
          merged.completed !== reminder.completed;
        if (timingChanged) merged.nextTriggerAt = merged.enabled && !merged.completed ? fireTime(merged) : null;
        return merged;
      });
      persist(next);
      return next;
    });
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setReminders((current) => {
      const target = current.find((reminder) => reminder.id === id);
      if (target) void cancelScheduled(target.notificationIds);
      const next = current.filter((reminder) => reminder.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const toggleReminder = useCallback(async (id: string, enabled: boolean) => {
    setReminders((current) => {
      const next = current.map((reminder) => {
        if (reminder.id !== id) return reminder;
        const merged = { ...reminder, enabled, nextTriggerAt: enabled && !reminder.completed ? fireTime(reminder) : null };
        if (!enabled) void cancelScheduled(reminder.notificationIds);
        return merged;
      });
      persist(next);
      return next;
    });
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    impactFeedback();
    setReminders((current) => {
      const next = current.map((reminder) => {
        if (reminder.id !== id) return reminder;
        const completing = !reminder.completed;
        if (completing) void cancelScheduled(reminder.notificationIds);
        return {
          ...reminder,
          completed: completing,
          completedAt: completing ? Date.now() : null,
          nextTriggerAt: completing ? null : reminder.enabled ? fireTime(reminder) : null,
        };
      });
      persist(next);
      return next;
    });
  }, []);

  /** Pushes the due date out by `minutes`, keeping everything else intact. */
  const snoozeReminder = useCallback(
    async (id: string, minutes: number) => {
      impactFeedback();
      const target = reminders.find((reminder) => reminder.id === id);
      if (!target) return;

      const dueAt = Math.max(Date.now() + minutes * 60_000, target.dueAt + minutes * 60_000);
      const updated: Reminder = { ...target, dueAt, nextTriggerAt: fireTime({ ...target, dueAt }) };

      if (updated.enabled && !updated.completed && settings.reminderNotificationsEnabled && permission === 'granted') {
        const result = await scheduleReminder(updated);
        updated.notificationIds = result.ids;
        updated.nextTriggerAt = result.nextTriggerAt;
      }

      setReminders((current) => {
        const next = current.map((reminder) => (reminder.id === id ? updated : reminder));
        persist(next);
        return next;
      });
    },
    [reminders, settings.reminderNotificationsEnabled, permission]
  );

  /* ---------------------------- derived ---------------------------- */

  const pending = useMemo(
    () =>
      reminders
        .filter((reminder) => !reminder.completed)
        .sort((a, b) => a.dueAt - b.dueAt),
    [reminders]
  );

  const completed = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.completed)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [reminders]
  );

  const overdue = useMemo(
    () => pending.filter((reminder) => fireTime(reminder) <= now),
    [pending, now]
  );

  const upcomingSoon = useMemo(() => {
    const limit = now + 2 * DAY_MS;
    return pending.filter((reminder) => {
      const at = fireTime(reminder);
      return at >= now && at <= limit;
    });
  }, [pending, now]);

  const completionRate = useMemo(() => {
    if (reminders.length === 0) return 0;
    return completed.length / reminders.length;
  }, [reminders.length, completed.length]);

  const completedThisWeek = useMemo(() => {
    const weekAgo = now - 7 * DAY_MS;
    return completed.filter((reminder) => (reminder.completedAt ?? 0) >= weekAgo).length;
  }, [completed, now]);

  const value = useMemo<RemindersContextValue>(
    () => ({
      reminders,
      ready,
      permission,
      pending,
      completed,
      overdue,
      upcomingSoon,
      completionRate,
      completedThisWeek,
      createReminder,
      updateReminder,
      deleteReminder,
      toggleReminder,
      toggleComplete,
      snoozeReminder,
    }),
    [
      reminders,
      ready,
      permission,
      pending,
      completed,
      overdue,
      upcomingSoon,
      completionRate,
      completedThisWeek,
      createReminder,
      updateReminder,
      deleteReminder,
      toggleReminder,
      toggleComplete,
      snoozeReminder,
    ]
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) throw new Error('useReminders must be used inside <RemindersProvider>');
  return context;
}

