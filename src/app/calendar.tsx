import { useFocusEffect } from 'expo-router';
import { useRouter } from '../hooks/useRouter';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CalendarUnavailableError,
  createEvent,
  detectCalendarSupport,
  getPermission,
  listCalendars,
  listUpcomingEvents,
  openSystemCalendarSettings,
  requestPermission,
  type CalendarOption,
  type CalendarPermission,
  type UpcomingEvent,
} from '../core/calendar';
import { formatDateLong, formatTime, isSameDay } from '../core/date';
import { impactFeedback } from '../core/haptics';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, typography } from '../theme/tokens';
import { Button, Card, Chip, EmptyState, Icon } from '../components/ui';
import { ModalHeader } from '../components/modal-header';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, update } = useSettings();

  const support = detectCalendarSupport();
  const [permission, setPermission] = useState<CalendarPermission>('undetermined');
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(settings.calendarId);

  const load = useCallback(async () => {
    if (!support.supported) return;
    setLoading(true);
    setError(null);
    try {
      const state = await getPermission();
      setPermission(state);
      if (state !== 'granted') return;

      const list = await listCalendars();
      setCalendars(list);

      const filter = selectedId ? [selectedId] : undefined;
      setEvents(await listUpcomingEvents({ calendarIds: filter, days: 14 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron leer los eventos.');
    } finally {
      setLoading(false);
    }
  }, [support.supported, selectedId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ask = async () => {
    try {
      const state = await requestPermission();
      setPermission(state);
      if (state === 'granted') await load();
    } catch (err) {
      setError(
        err instanceof CalendarUnavailableError ? err.message : 'No se pudo solicitar el permiso del calendario.'
      );
    }
  };

  const makeTestEvent = async () => {
    try {
      impactFeedback();
      const start = new Date();
      start.setHours(start.getHours() + 2, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60_000);
      await createEvent({
        calendarId: selectedId ?? undefined,
        title: 'Evento creado desde Shake',
        startDate: start,
        endDate: end,
        notes: 'Creado desde la pantalla de calendario de SmartAlarm.',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento.');
    }
  };

  /* ------------------------- not available ---------------------------- */
  if (!support.supported) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ModalHeader title="Calendario" onClose={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Card>
            <EmptyState
              icon={<Icon name="calendar" size={26} color={colors.warning} />}
              title="Requiere un development build"
              message={
                support.reason === 'expo-go'
                  ? 'expo-calendar no está incluido en Expo Go. Para usar la integración con el calendario necesitas compilar la app con EAS o expo run.'
                  : 'La integración con calendario solo está disponible en iOS y Android.'
              }
              action={
                <Button
                  label="Entendido"
                  variant="ghost"
                  style={{ marginTop: spacing.sm }}
                  onPress={() => router.back()}
                />
              }
            />
          </Card>

          <Card style={styles.infoCard}>
            <Text style={[typography.heading, { color: colors.text }]}>Mientras tanto</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              El resto de la app funciona sin calendario. Puedes crear una alarma y un recordatorio con la misma hora
              que tu clase o cita, y la app te avisará igual.
            </Text>
            <View style={styles.hintRow}>
              <Icon name="alarm" size={16} color={colors.accent} />
              <Text style={[typography.micro, { color: colors.textMuted, flex: 1 }]}>
                Ejemplo: clase a las 8:00 → alarma a las 6:45 y un recordatorio 30 min antes.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  /* --------------------------- permission ----------------------------- */
  if (permission !== 'granted') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ModalHeader title="Calendario" onClose={() => router.back()} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Card>
            <EmptyState
              icon={<Icon name="calendar" size={26} color={colors.accent} />}
              title="Conecta tu calendario"
              message="SmartAlarm solo lee los eventos de los próximos días para mostrártelos junto a tus alarmas. No envía nada a ningún servidor y puedes revocar el permiso cuando quieras."
              action={
                permission === 'denied' ? (
                  <Button label="Abrir ajustes del sistema" style={{ marginTop: spacing.sm }} onPress={openSystemCalendarSettings} />
                ) : (
                  <Button label="Permitir acceso" style={{ marginTop: spacing.sm }} onPress={ask} />
                )
              }
            />
            {error ? <Text style={[typography.micro, { color: colors.danger, textAlign: 'center' }]}>{error}</Text> : null}
          </Card>
        </ScrollView>
      </View>
    );
  }

  /* ------------------------------ events ------------------------------ */
  const grouped = groupByDay(events);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="Calendario"
        subtitle={`${events.length} eventos en 14 días`}
        onClose={() => router.back()}
        right={
          <Pressable
            onPress={makeTestEvent}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Crear evento de prueba"
            style={({ pressed }) => [styles.addButton, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}
          >
            <Icon name="plus" size={16} color={colors.accentOn} strokeWidth={2.6} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {error ? (
          <Card style={[styles.errorCard, { borderColor: colors.danger }]}>
            <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
          </Card>
        ) : null}

        {calendars.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarRow}>
            <Chip
              label="Todos"
              size="sm"
              selected={selectedId === null}
              onPress={() => {
                setSelectedId(null);
                update({ calendarId: null });
              }}
            />
            {calendars.map((calendar) => (
              <Chip
                key={calendar.id}
                label={calendar.isPrimary ? `${calendar.title} ★` : calendar.title}
                size="sm"
                selected={selectedId === calendar.id}
                onPress={() => {
                  setSelectedId(calendar.id);
                  update({ calendarId: calendar.id });
                }}
              />
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.xxl }} />
        ) : events.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="calendar" size={26} color={colors.textFaint} />}
              title="Sin eventos próximos"
              message="No hay eventos en los próximos 14 días en los calendarios seleccionados."
            />
          </Card>
        ) : (
          grouped.map(([day, dayEvents]) => (
            <View key={day} style={styles.dayGroup}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {isSameDay(new Date(day), new Date()) ? 'Hoy' : capitalize(formatDateLong(new Date(day)))}
              </Text>

              <View style={styles.eventList}>
                {dayEvents.map((event) => (
                  <Card key={event.id} style={styles.eventCard} variant="alt">
                    <View style={[styles.eventStripe, { backgroundColor: event.color ?? colors.accent }]} />
                    <View style={styles.eventBody}>
                      <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
                        {event.title}
                      </Text>
                      <View style={styles.eventMeta}>
                        <Text style={[typography.micro, { color: colors.accent }]}>
                          {event.allDay ? 'Todo el día' : `${formatTime(event.startDate, settings.use24Hour)} – ${formatTime(event.endDate, settings.use24Hour)}`}
                        </Text>
                        {event.location ? (
                          <>
                            <Text style={[typography.micro, { color: colors.textFaint }]}>·</Text>
                            <Text numberOfLines={1} style={[typography.micro, { color: colors.textMuted, flex: 1 }]}>
                              {event.location}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => createAlarmFromEvent(event)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Crear alarma 15 minutos antes de ${event.title}`}
                      style={({ pressed }) => [
                        styles.eventAction,
                        { backgroundColor: colors.accentSoft },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Icon name="alarm" size={15} color={colors.accent} />
                    </Pressable>
                  </Card>
                ))}
              </View>
            </View>
          ))
        )}

        <Text style={[typography.micro, styles.footnote, { color: colors.textFaint }]}>
          Toca el icono de la alarma para crear una alarma 15 minutos antes de un evento.
        </Text>
      </ScrollView>
    </View>
  );

  function createAlarmFromEvent(event: UpcomingEvent) {
    impactFeedback();
    const alarmAt = new Date(event.startDate.getTime() - 15 * 60_000);
    router.push({
      pathname: '/alarm/edit',
      params: { hour: String(alarmAt.getHours()), minute: String(alarmAt.getMinutes()), fromEvent: event.title },
    });
  }
}

function groupByDay(events: UpcomingEvent[]) {
  const map = new Map<string, UpcomingEvent[]>();
  events.forEach((event) => {
    const key = new Date(event.startDate).toDateString();
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  });
  return Array.from(map.entries());
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarRow: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  errorCard: {
    borderWidth: 1.5,
  },
  infoCard: {
    gap: spacing.sm,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  dayGroup: {
    gap: spacing.sm,
  },
  eventList: {
    gap: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  eventStripe: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  eventBody: {
    flex: 1,
    gap: 3,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});