import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { DAY_MS, nextOccurrence } from '../core/date';
import { auth, db } from '../core/firebase';
import {
  cancelScheduled,
  rehydrate,
  requestNotificationPermissions,
  scheduleAll,
  type NotificationPermissionState,
} from '../core/notifications';
import { StorageKeys, createId, storage } from '../core/storage';
import type { Alarm, DismissLog, DismissOutcome, Weekday } from '../core/types';
import { useSettings } from './SettingsContext';

/** How often the foreground ticker checks for a due alarm. */
const TICK_MS = 15_000;
/** Grace period that catches an occurrence which started a moment ago. */
const OCCURRENCE_GRACE_MS = 90_000;
/** Served occurrences older than this are pruned from storage. */
const SERVED_RETENTION_MS = 7 * DAY_MS;
const MAX_LOG_ENTRIES = 100;

export type RingingState = {
  alarmId: string;
  rangAt: number;
  /** Set when the ring came from a local notification tap. */
  fromNotification: boolean;
} | null;

type AlarmsContextValue = {
  alarms: Alarm[];
  ready: boolean;
  permission: NotificationPermissionState;
  ringing: RingingState;
  dismissLog: DismissLog[];

  /** Alarm that will ring next, ignoring disabled alarms. */
  nextAlarm: Alarm | null;
  /** Epoch ms of `nextAlarm`, or null when nothing is scheduled. */
  nextAlarmAt: number | null;
  enabledCount: number;
  /** Average shakes needed across the log, for the stats screen. */
  stats: {
    totalRings: number;
    byShake: number;
    bySnooze: number;
    byEmergency: number;
    bySilent: number;
    averageShakes: number;
    lastSevenDays: { label: string; rings: number; shakes: number }[];
    bestStreak: number;
  };

  createAlarm: (draft: AlarmDraft) => Promise<Alarm>;
  updateAlarm: (id: string, patch: Partial<AlarmDraft>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>;
  rescheduleAll: () => Promise<void>;

  startRinging: (alarmId: string, fromNotification?: boolean, isPreview?: boolean) => void;
  completeRinging: (alarmId: string, outcome: DismissOutcome, shakes: number) => Promise<void>;
  snoozeRinging: (alarmId: string) => Promise<void>;
};

export type AlarmDraft = Omit<Alarm, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds' | 'nextOccurrenceAt'>;

const AlarmsContext = createContext<AlarmsContextValue | null>(null);

function persistAlarms(alarms: Alarm[]) {
  void storage.writeJson(StorageKeys.alarms, alarms);
}

/**
 * Maps an alarm id to the timestamp of the occurrence already served, so an
 * alarm is only rung once per scheduled event no matter how many times the
 * challenge is completed.
 */
type ServedMap = Record<string, number>;

function persistServed(served: Map<string, number>) {
  void storage.writeJson(StorageKeys.servedOccurrences, Object.fromEntries(served));
}

/**
 * The occurrence a ringing alarm is allowed to consume.
 *
 * Within the grace period this is the occurrence that just started; outside it,
 * the upcoming one. Returns null when the alarm is not due yet, which prevents
 * a manual "Probar" from swallowing a real, upcoming occurrence.
 */
function dueOccurrenceAt(alarm: Alarm, from: number): number | null {
  const due = nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays, new Date(from - OCCURRENCE_GRACE_MS)).getTime();
  if (due <= from) return due;
  const upcoming = nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays, new Date(from)).getTime();
  return upcoming - from <= OCCURRENCE_GRACE_MS ? upcoming : null;
}

export function AlarmsProvider({ children }: PropsWithChildren) {
  const { settings, ready: settingsReady } = useSettings();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [dismissLog, setDismissLog] = useState<DismissLog[]>([]);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>('undetermined');
  const [ringing, setRinging] = useState<RingingState>(null);

  /** Occurrence already served per alarm; guards against re-ringing the same event. */
  const servedRef = useRef(new Map<string, number>());

  /**
   * Marks an occurrence as consumed. Doing this instead of clearing a flag is
   * what makes "complete the challenge once" stick: the alarm stays silenced
   * until `nextOccurrence` moves past the recorded timestamp.
   */
  const markServed = useCallback((alarmId: string, occurrenceAt: number | null) => {
    if (occurrenceAt === null) return;
    const previous = servedRef.current.get(alarmId);
    if (previous !== undefined && previous >= occurrenceAt) return;
    servedRef.current.set(alarmId, occurrenceAt);
    persistServed(servedRef.current);
  }, []);

  const markServedForAlarm = useCallback(
    (alarmId: string, now: number) => {
      const alarm = alarms.find((item) => item.id === alarmId);
      if (!alarm) return;
      markServed(alarmId, dueOccurrenceAt(alarm, now));
    },
    [alarms, markServed]
  );

  /* ----------------------------- load local ----------------------------- */
  useEffect(() => {
    let mounted = true;
    Promise.all([
      storage.readJson<Alarm[]>(StorageKeys.alarms, []),
      storage.readJson<DismissLog[]>(StorageKeys.dismissLog, []),
      storage.readJson<ServedMap>(StorageKeys.servedOccurrences, {}),
    ]).then(([storedAlarms, storedLog, storedServed]) => {
      if (!mounted) return;
      // Restoring the served occurrences keeps an alarm silenced after an app
      // restart, so a completed challenge is never asked twice.
      const cutoff = Date.now() - SERVED_RETENTION_MS;
      servedRef.current = new Map(
        Object.entries(storedServed).filter(([, at]) => typeof at === 'number' && at > cutoff)
      );
      setAlarms(storedAlarms);
      setDismissLog(storedLog);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  /* --------------------- firebase sync (realtime) --------------------- */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const alarmsRef = collection(db, 'users', user.uid, 'alarms');
        const unsubscribeSnapshot = onSnapshot(alarmsRef, (snapshot) => {
          const remoteAlarms: Alarm[] = [];
          snapshot.forEach((docSnap) => {
            remoteAlarms.push(docSnap.data() as Alarm);
          });
          if (remoteAlarms.length > 0) {
            setAlarms(remoteAlarms);
            persistAlarms(remoteAlarms);
          }
        });
        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  /* --------------------- notification permission --------------------- */
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

  /* ------------------------- rescheduling --------------------------- */
  const scheduleSignature = useMemo(() => JSON.stringify(alarms), [alarms]);

  useEffect(() => {
    if (!ready || !settingsReady) return;
    if (!settings.alarmNotificationsEnabled || permission !== 'granted') return;

    let cancelled = false;
    const current: Alarm[] = JSON.parse(scheduleSignature);

    scheduleAll(current, []).then((results) => {
      if (cancelled) return;
      setAlarms((existing) => {
        const next = existing.map((alarm) => {
          const result = results.get(alarm.id);
          if (!result) return alarm;
          if (
            alarm.notificationIds.length === result.ids.length &&
            alarm.nextOccurrenceAt === result.nextTriggerAt &&
            alarm.notificationIds.every((id, i) => id === result.ids[i])
          ) {
            return alarm;
          }
          return { ...alarm, notificationIds: result.ids, nextOccurrenceAt: result.nextTriggerAt };
        });
        persistAlarms(next);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [ready, settingsReady, settings.alarmNotificationsEnabled, permission, scheduleSignature]);

  /* ------------------------- in-app ticker -------------------------- */
  useEffect(() => {
    if (!ready || !settingsReady) return;
    if (!settings.alarmNotificationsEnabled) return;

    const check = () => {
      const now = Date.now();
      setRinging((current) => {
        if (current) return current;
        const due = alarms.find((alarm) => {
          if (!alarm.enabled) return false;
          const occurrenceAt = dueOccurrenceAt(alarm, now);
          if (occurrenceAt === null) return false;
          // Already consumed by an earlier ring: wait for the next occurrence.
          const served = servedRef.current.get(alarm.id);
          if (served !== undefined && served >= occurrenceAt) return false;
          servedRef.current.set(alarm.id, occurrenceAt);
          persistServed(servedRef.current);
          return true;
        });
        return due ? { alarmId: due.id, rangAt: now, fromNotification: false } : null;
      });
    };

    check();
    const interval = setInterval(check, TICK_MS);
    return () => clearInterval(interval);
  }, [ready, settingsReady, settings.alarmNotificationsEnabled, alarms]);

  /* ----------------------------- CRUD ------------------------------ */

  const createAlarm = useCallback(
    async (draft: AlarmDraft) => {
      const now = Date.now();
      const alarm: Alarm = {
        ...draft,
        id: createId('alarm'),
        notificationIds: [],
        nextOccurrenceAt: null,
        createdAt: now,
        updatedAt: now,
      };
      alarm.nextOccurrenceAt = nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays).getTime();

      setAlarms((current) => {
        const next = [...current, alarm];
        persistAlarms(next);
        return next;
      });

      // Guardar en Firestore si el usuario está autenticado
      if (auth.currentUser) {
        const alarmRef = doc(db, 'users', auth.currentUser.uid, 'alarms', alarm.id);
        void setDoc(alarmRef, alarm);
      }

      return alarm;
    },
    []
  );

  const updateAlarm = useCallback(async (id: string, patch: Partial<AlarmDraft>) => {
    setAlarms((current) => {
      let updatedTarget: Alarm | null = null;
      const next = current.map((alarm) => {
        if (alarm.id !== id) return alarm;
        const merged: Alarm = { ...alarm, ...patch, updatedAt: Date.now() };
        const timeChanged = merged.hour !== alarm.hour || merged.minute !== alarm.minute;
        const daysChanged = JSON.stringify(sortForCompare(merged.weekdays)) !== JSON.stringify(sortForCompare(alarm.weekdays));
        if (timeChanged || daysChanged || !merged.enabled) {
          merged.nextOccurrenceAt = merged.enabled ? nextOccurrence(merged.hour, merged.minute, merged.weekdays).getTime() : null;
        }
        updatedTarget = merged;
        return merged;
      });

      persistAlarms(next);

      // Actualizar en Firestore
      if (auth.currentUser && updatedTarget) {
        const alarmRef = doc(db, 'users', auth.currentUser.uid, 'alarms', id);
        void setDoc(alarmRef, updatedTarget, { merge: true });
      }

      return next;
    });
  }, []);

  const deleteAlarm = useCallback(async (id: string) => {
    setAlarms((current) => {
      const target = current.find((alarm) => alarm.id === id);
      if (target) void cancelScheduled(target.notificationIds);
      const next = current.filter((alarm) => alarm.id !== id);
      persistAlarms(next);
      return next;
    });

    servedRef.current.delete(id);
    persistServed(servedRef.current);

    // Eliminar de Firestore
    if (auth.currentUser) {
      const alarmRef = doc(db, 'users', auth.currentUser.uid, 'alarms', id);
      void deleteDoc(alarmRef);
    }
  }, []);

  const toggleAlarm = useCallback(async (id: string, enabled: boolean) => {
    setAlarms((current) => {
      let toggledTarget: Alarm | null = null;
      const next = current.map((alarm) => {
        if (alarm.id === id) {
          const updated = {
            ...alarm,
            enabled,
            updatedAt: Date.now(),
            nextOccurrenceAt: enabled ? nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays).getTime() : null,
          };
          toggledTarget = updated;
          return updated;
        }
        return alarm;
      });

      persistAlarms(next);

      // Actualizar en Firestore
      if (auth.currentUser && toggledTarget) {
        const alarmRef = doc(db, 'users', auth.currentUser.uid, 'alarms', id);
        void setDoc(alarmRef, toggledTarget, { merge: true });
      }

      return next;
    });
  }, []);

  const rescheduleAll = useCallback(async () => {
    const results = await scheduleAll(alarms, []);
    setAlarms((current) => {
      const next = current.map((alarm) => {
        const result = results.get(alarm.id);
        if (!result) return alarm;
        return { ...alarm, notificationIds: result.ids, nextOccurrenceAt: result.nextTriggerAt };
      });
      persistAlarms(next);
      return next;
    });
    void rehydrate(alarms, []);
  }, [alarms]);

  /* ---------------------------- ringing ---------------------------- */

  const startRinging = useCallback(
    (alarmId: string, fromNotification = false, isPreview = false) => {
      const now = Date.now();
      // A manual "Probar" must not consume the upcoming occurrence, otherwise
      // testing an alarm would silently cancel the real one.
      if (!isPreview) markServedForAlarm(alarmId, now);
      setRinging({ alarmId, rangAt: now, fromNotification });
    },
    [markServedForAlarm]
  );

  const recordDismiss = useCallback((alarm: Alarm | undefined, alarmId: string, outcome: DismissOutcome, shakes: number, rangAt: number) => {
    const entry: DismissLog = {
      id: createId('log'),
      alarmId,
      label: alarm?.label?.trim() || 'Despertar',
      rangAt,
      outcome,
      shakes,
      secondsToDismiss: Math.max(0, Math.round((Date.now() - rangAt) / 1000)),
    };
    setDismissLog((current) => {
      const next = [entry, ...current].slice(0, MAX_LOG_ENTRIES);
      void storage.writeJson(StorageKeys.dismissLog, next);
      return next;
    });
  }, []);

  const completeRinging = useCallback(
    async (alarmId: string, outcome: DismissOutcome, shakes: number) => {
      const alarm = alarms.find((a) => a.id === alarmId);
      const rangAt = ringing?.rangAt ?? Date.now();
      recordDismiss(alarm, alarmId, outcome, shakes, rangAt);
      // The occurrence stays consumed on purpose. Clearing it here is what made
      // the alarm ring again right after the challenge was completed.
      markServedForAlarm(alarmId, Date.now());
      setRinging(null);
    },
    [alarms, ringing, recordDismiss, markServedForAlarm]
  );

  const snoozeRinging = useCallback(
    async (alarmId: string) => {
      const alarm = alarms.find((a) => a.id === alarmId);
      const rangAt = ringing?.rangAt ?? Date.now();
      recordDismiss(alarm, alarmId, 'snooze', 0, rangAt);

      const snoozeUntil = new Date(Date.now() + (alarm?.snoozeMinutes ?? 5) * 60_000);
      // The original occurrence is consumed; the snooze re-rings through its own
      // scheduled notification.
      markServedForAlarm(alarmId, Date.now());
      setRinging(null);

      if (alarm && settings.alarmNotificationsEnabled && permission === 'granted') {
        const { scheduleAlarm } = await import('../core/notifications');
        await cancelScheduled(alarm.notificationIds);
        const snoozeAlarm: Alarm = {
          ...alarm,
          hour: snoozeUntil.getHours(),
          minute: snoozeUntil.getMinutes(),
          weekdays: [],
        };
        const result = await scheduleAlarm(snoozeAlarm);
        setAlarms((current) => {
          const next = current.map((item) =>
            item.id === alarmId ? { ...item, notificationIds: result.ids, nextOccurrenceAt: snoozeUntil.getTime() } : item
          );
          persistAlarms(next);
          return next;
        });
      }
    },
    [alarms, ringing, recordDismiss, markServedForAlarm, settings.alarmNotificationsEnabled, permission]
  );

  /* ---------------------------- derived ---------------------------- */

  const nextAlarm = useMemo(() => {
    const candidates = alarms
      .filter((alarm) => alarm.enabled)
      .map((alarm) => ({ alarm, at: nextOccurrence(alarm.hour, alarm.minute, alarm.weekdays).getTime() }))
      .sort((a, b) => a.at - b.at);
    return candidates[0]?.alarm ?? null;
  }, [alarms]);

  const nextAlarmAt = useMemo(() => {
    if (!nextAlarm) return null;
    return nextOccurrence(nextAlarm.hour, nextAlarm.minute, nextAlarm.weekdays).getTime();
  }, [nextAlarm]);

  const stats = useMemo(() => {
    const byShake = dismissLog.filter((e) => e.outcome === 'shake').length;
    const bySnooze = dismissLog.filter((e) => e.outcome === 'snooze').length;
    const byEmergency = dismissLog.filter((e) => e.outcome === 'emergency').length;
    const bySilent = dismissLog.filter((e) => e.outcome === 'silent').length;
    const shakeEntries = dismissLog.filter((e) => e.outcome === 'shake');
    const averageShakes = shakeEntries.length ? shakeEntries.reduce((sum, e) => sum + e.shakes, 0) / shakeEntries.length : 0;

    const now = new Date();
    const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - i));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const entries = dismissLog.filter((e) => {
        const d = new Date(e.rangAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
      });
      return {
        label: new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', ''),
        rings: entries.length,
        shakes: entries.reduce((sum, e) => sum + e.shakes, 0),
      };
    });

    const dayKeys = Array.from(
      new Set(dismissLog.map((e) => {
        const d = new Date(e.rangAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }))
    )
      .map((key) => {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m, d).getTime();
      })
      .sort((a, b) => a - b);

    let bestStreak = 0;
    let streak = 0;
    let previous: number | null = null;
    dayKeys.forEach((time) => {
      streak = previous !== null && Math.round((time - previous) / 86_400_000) === 1 ? streak + 1 : 1;
      bestStreak = Math.max(bestStreak, streak);
      previous = time;
    });

    return {
      totalRings: dismissLog.length,
      byShake,
      bySnooze,
      byEmergency,
      bySilent,
      averageShakes,
      lastSevenDays,
      bestStreak,
    };
  }, [dismissLog]);

  const value = useMemo<AlarmsContextValue>(
    () => ({
      alarms,
      ready,
      permission,
      ringing,
      dismissLog,
      nextAlarm,
      nextAlarmAt,
      enabledCount: alarms.filter((alarm) => alarm.enabled).length,
      stats,
      createAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      rescheduleAll,
      startRinging,
      completeRinging,
      snoozeRinging,
    }),
    [
      alarms,
      ready,
      permission,
      ringing,
      dismissLog,
      nextAlarm,
      nextAlarmAt,
      stats,
      createAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      rescheduleAll,
      startRinging,
      completeRinging,
      snoozeRinging,
    ]
  );

  return <AlarmsContext.Provider value={value}>{children}</AlarmsContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmsContext);
  if (!context) throw new Error('useAlarms must be used inside <AlarmsProvider>');
  return context;
}

function sortForCompare(days: Weekday[]) {
  return [...days].sort((a, b) => a - b);
}