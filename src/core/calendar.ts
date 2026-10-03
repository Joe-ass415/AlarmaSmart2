import * as Calendar from 'expo-calendar';
import { Linking, Platform } from 'react-native';

import { DAY_MS } from './date';

export type CalendarAvailability =
  | { supported: true }
  | { supported: false; reason: 'expo-go' | 'unsupported-platform' };

export type CalendarPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type UpcomingEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string | null;
  calendarId: string;
  calendarTitle: string;
  color?: string;
};

export type CalendarOption = {
  id: string;
  title: string;
  isPrimary: boolean;
  allowsModifications: boolean;
  color?: string;
};

/**
 * `expo-calendar` ships an Expo Go stub whose every method throws, so the
 * capability is probed once at startup instead of being assumed.
 */
let supported: boolean | null = null;

export function detectCalendarSupport(): CalendarAvailability {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { supported: false, reason: 'unsupported-platform' };
  }
  if (supported === null) return { supported: true };
  return supported ? { supported: true } : { supported: false, reason: 'expo-go' };
}

/** Throws a typed error instead of an opaque Expo Go stub error. */
export class CalendarUnavailableError extends Error {
  constructor(message = 'El calendario no está disponible en este entorno.') {
    super(message);
    this.name = 'CalendarUnavailableError';
  }
}

function assertSupported() {
  const availability = detectCalendarSupport();
  if (!availability.supported) {
    throw new CalendarUnavailableError(
      availability.reason === 'expo-go'
        ? 'expo-calendar requiere un development build. No está disponible en Expo Go.'
        : 'El calendario solo está disponible en iOS y Android.'
    );
  }
}

function isExpoGoStubError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Expo Go') || message.includes('not available in Expo Go');
}

/** Safe startup probe. Flips `supported` to false when running inside Expo Go. */
export async function probeCalendar(): Promise<CalendarAvailability> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    supported = false;
    return detectCalendarSupport();
  }
  try {
    await Calendar.getCalendars();
    supported = true;
  } catch (error) {
    console.warn('[calendar] unavailable', error);
    supported = isExpoGoStubError(error) ? false : true;
  }
  return detectCalendarSupport();
}

export async function getPermission(): Promise<CalendarPermission> {
  try {
    const response = await Calendar.getCalendarPermissions();
    return response.granted ? 'granted' : response.canAskAgain ? 'undetermined' : 'denied';
  } catch (error) {
    console.warn('[calendar] permission check failed', error);
    return 'unavailable';
  }
}

export async function requestPermission(): Promise<CalendarPermission> {
  try {
    assertSupported();
    const response = await Calendar.requestCalendarPermissions();
    return response.granted ? 'granted' : response.canAskAgain ? 'undetermined' : 'denied';
  } catch (error) {
    if (error instanceof CalendarUnavailableError) throw error;
    console.warn('[calendar] permission request failed', error);
    return 'unavailable';
  }
}

export async function listCalendars(): Promise<CalendarOption[]> {
  assertSupported();
  const calendars = await Calendar.getCalendars();
  return calendars.map((cal) => ({
    id: cal.id,
    title: cal.title,
    isPrimary: cal.isPrimary ?? false,
    allowsModifications: cal.allowsModifications,
    color: cal.color,
  }));
}

/**
 * Events in the next `days` days across the given calendars (or every
 * calendar when none is specified).
 */
export async function listUpcomingEvents(options: { calendarIds?: string[]; days?: number } = {}): Promise<UpcomingEvent[]> {
  assertSupported();
  const days = options.days ?? 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * DAY_MS);

  let calendars = await Calendar.getCalendars();
  if (options.calendarIds && options.calendarIds.length > 0) {
    const wanted = new Set(options.calendarIds);
    const filtered = calendars.filter((cal) => wanted.has(cal.id));
    if (filtered.length > 0) calendars = filtered;
  }

  const usable = calendars.filter((cal) => cal.allowsModifications || true);
  if (usable.length === 0) return [];

  const events = await Calendar.listEvents(
    usable.map((cal) => cal.id),
    start,
    end
  );

  const titlesById = new Map(calendars.map((cal) => [cal.id, cal.title]));

  return events
    .map((event) => ({
      id: event.id,
      title: event.title?.trim() || 'Sin título',
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      allDay: event.allDay,
      location: event.location ?? null,
      calendarId: event.calendarId,
      calendarTitle: titlesById.get(event.calendarId) ?? 'Calendario',
      color: calendars.find((cal) => cal.id === event.calendarId)?.color,
    }))
    .filter((event) => event.endDate.getTime() >= Date.now())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function createEvent(input: {
  calendarId?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  notes?: string;
  location?: string;
}): Promise<string> {
  assertSupported();

  let calendarId = input.calendarId;
  if (!calendarId) {
    const calendars = await Calendar.getCalendars();
    const writable = calendars.filter((cal) => cal.allowsModifications);
    const chosen = writable.find((cal) => cal.isPrimary) ?? writable[0] ?? calendars[0];
    if (!chosen) throw new Error('No hay calendarios disponibles en el dispositivo.');
    calendarId = chosen.id;
  }

  const calendar = await Calendar.ExpoCalendar.get(calendarId);
  const event = await calendar.createEvent({
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    allDay: input.allDay ?? false,
    notes: input.notes,
    location: input.location,
  });
  return event.id;
}

export function openSystemCalendarSettings() {
  Linking.openSettings().catch(() => {});
}
