import { WEEKDAYS, type Weekday } from './types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Next moment a (hour, minute) pair occurs, optionally restricted to a set of
 * weekdays. Always returns a strictly future instant so a ringing alarm does
 * not immediately reschedule itself.
 */
export function nextOccurrence(hour: number, minute: number, weekdays: Weekday[], from: Date = new Date()): Date {
  const base = new Date(from);
  base.setSeconds(0, 0);

  for (let offset = 0; offset <= 8; offset++) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    const matches = weekdays.length === 0 || weekdays.includes(candidate.getDay() as Weekday);
    if (matches && candidate.getTime() > from.getTime()) return candidate;
  }

  const fallback = new Date(base);
  fallback.setDate(base.getDate() + 1);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}

/** Previous occurrence, used to describe "rang at" in stats. */
export function previousOccurrence(hour: number, minute: number, weekdays: Weekday[], from: Date = new Date()): Date {
  const base = new Date(from);
  base.setSeconds(0, 0);

  for (let offset = 0; offset <= 8; offset++) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() - offset);
    candidate.setHours(hour, minute, 0, 0);
    const matches = weekdays.length === 0 || weekdays.includes(candidate.getDay() as Weekday);
    if (matches && candidate.getTime() <= from.getTime()) return candidate;
  }
  return base;
}

const WEEKDAY_ORDER: Weekday[] = WEEKDAYS.map((d) => d.value);

export function sortWeekdays(days: Weekday[]): Weekday[] {
  return [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

export function weekdaySet(days: Weekday[]) {
  return new Set(sortWeekdays(days));
}

export function formatDays(days: Weekday[]): string {
  if (days.length === 0) return 'Una vez';
  if (days.length === 7) return 'Todos los días';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as Weekday))) return 'Días laborables';
  if (days.length === 2 && days.includes(1) && days.includes(6)) return 'Lun y Sáb';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fin de semana';

  const sorted = sortWeekdays(days);
  const consecutive = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1 || (sorted[i - 1] === 6 && day === 0));
  if (consecutive && sorted.length <= 3) {
    return sorted.map((d) => WEEKDAYS.find((w) => w.value === d)?.long ?? '').join(' ');
  }
  return sorted.map((d) => WEEKDAYS.find((w) => w.value === d)?.short ?? '').join(' · ');
}

export function formatTime(date: Date, use24Hour: boolean) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  }).format(date);
}

export function formatClock(hour: number, minute: number, use24Hour: boolean) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return formatTime(date, use24Hour);
}

/** Splits a formatted clock into a big hour string and a small AM/PM suffix. */
export function splitClockParts(hour: number, minute: number, use24Hour: boolean) {
  const label = formatClock(hour, minute, use24Hour);
  if (use24Hour) return { value: label, suffix: '' as string };
  const [time, suffix] = label.split(' ');
  return { value: time, suffix: suffix ?? '' };
}

export function formatRelative(target: number, from: number = Date.now()) {
  const diff = target - from;
  const abs = Math.abs(diff);

  if (abs < MINUTE_MS) return diff >= 0 ? 'ahora mismo' : 'hace instantes';
  if (abs < HOUR_MS) {
    const mins = Math.round(abs / MINUTE_MS);
    return diff >= 0 ? `en ${mins} min` : `hace ${mins} min`;
  }
  if (abs < DAY_MS) {
    const hours = Math.round(abs / HOUR_MS);
    return diff >= 0 ? `en ${hours} h` : `hace ${hours} h`;
  }
  const days = Math.round(abs / DAY_MS);
  return diff >= 0 ? `en ${days} d` : `hace ${days} d`;
}

export function formatCountdown(target: number, from: number = Date.now()) {
  const diff = Math.max(0, target - from);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { hours, minutes, seconds, text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, hoursText: `${pad(hours)}`, minutesText: `${pad(minutes)}` };
}

export function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
}

export function formatDateWithTime(date: Date, use24Hour: boolean) {
  return `${formatDateShort(date)} · ${formatTime(date, use24Hour)}`;
}

export function startOfWeekDay(date: Date) {
  const next = new Date(date);
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** True when the moment falls on the same calendar day as `other`. */
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function greetingFor(date: Date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Whole days between now and a future instant, rounded up. */
export function daysUntil(target: number, from: number = Date.now()) {
  return Math.max(0, Math.ceil((target - from) / DAY_MS));
}
