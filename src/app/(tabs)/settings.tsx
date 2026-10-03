import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  detectCalendarSupport,
  getPermission as getCalendarPermission,
  listCalendars,
  openSystemCalendarSettings,
  requestPermission as requestCalendarPermission,
  type CalendarOption,
  type CalendarPermission,
} from '../../core/calendar';
import {
  getNotificationPermissionState,
  openSystemNotificationSettings,
  requestNotificationPermissions,
  type NotificationPermissionState,
} from '../../core/notifications';
import { storage } from '../../core/storage';
import { accents, type AccentName } from '../../theme/tokens';
import { useAlarms } from '../../state/AlarmsContext';
import { useReminders } from '../../state/RemindersContext';
import { useSettings } from '../../state/SettingsContext';
import { tabBarStore } from '../../state/useTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, radius, spacing, typography } from '../../theme/tokens';
import { Button, Card, Chip, SegmentedControl, Stepper , SummaryRow, ToggleRow , Icon } from '../../components/ui';
import { ScreenHeader } from '../../components/screen-header';

const ACCENTS: AccentName[] = ['mint', 'violet', 'sky', 'amber', 'coral'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, update, resetSettings, setPremium, trialDaysLeft } = useSettings();
  const { alarms, stats, rescheduleAll } = useAlarms();
  const { reminders } = useReminders();

  const [notificationState, setNotificationState] = useState<NotificationPermissionState>('undetermined');
  const [calendarState, setCalendarState] = useState<CalendarPermission>('undetermined');
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const calendarSupport = detectCalendarSupport();

  useEffect(() => {
    getNotificationPermissionState().then(setNotificationState).catch(() => setNotificationState('unavailable'));
  }, []);

  useEffect(() => {
    if (!calendarSupport.supported) return;
    getCalendarPermission()
      .then(async (state) => {
        setCalendarState(state);
        if (state === 'granted') setCalendars(await listCalendars().catch(() => []));
      })
      .catch(() => setCalendarState('unavailable'));
  }, [calendarSupport.supported]);

  const askNotifications = async () => {
    const state = await requestNotificationPermissions();
    setNotificationState(state);
    if (state === 'granted') {
      rescheduleAll();
    } else if (state === 'denied') {
      Alert.alert(
        'Permiso denegado',
        'Ve a los ajustes del sistema y activa las notificaciones para SmartAlarm.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: openSystemNotificationSettings },
        ]
      );
    }
  };

  const askCalendar = async () => {
    try {
      const state = await requestCalendarPermission();
      setCalendarState(state);
      if (state === 'granted') setCalendars(await listCalendars());
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : 'No se pudo solicitar el permiso.');
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán tus alarmas, recordatorios, historial y preferencias. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            await storage.clearAll();
            resetSettings();
            setPremium(false);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Ajustes" subtitle="Permisos, sensores y personalización" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        onScroll={(event) => tabBarStore.setVisible(event.nativeEvent.contentOffset.y < 120)}
        scrollEventThrottle={16}
      >
        {/* ---------------------------- Perfil ---------------------------- */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Tu nombre</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Solo se usa para el saludo de la pantalla de inicio.
          </Text>
          <TextInput
            value={settings.userName}
            onChangeText={(userName) => update({ userName })}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textFaint}
            maxLength={24}
            style={[
              styles.input,
              typography.body,
              { color: colors.text, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
            ]}
          />
        </Card>

        {/* ------------------------- Notificaciones ------------------------ */}
        <Card style={styles.card}>
          <GroupTitle
            icon="bell"
            title="Notificaciones"
            status={
              notificationState === 'granted'
                ? { text: 'Concedido', tone: 'success' }
                : notificationState === 'denied'
                  ? { text: 'Denegado', tone: 'danger' }
                  : { text: 'Sin permiso', tone: 'warning' }
            }
          />

          {notificationState !== 'granted' ? (
            <Button
              label={notificationState === 'denied' ? 'Abrir ajustes del sistema' : 'Solicitar permiso'}
              fullWidth
              onPress={notificationState === 'denied' ? openSystemNotificationSettings : askNotifications}
            />
          ) : null}

          <View style={styles.divider} />

          <ToggleRow
            label="Alarmas"
            description="Avisos de tus alarmas programadas"
            icon={<Icon name="alarm" size={17} color={colors.textMuted} />}
            value={settings.alarmNotificationsEnabled}
            onValueChange={(alarmNotificationsEnabled) => update({ alarmNotificationsEnabled })}
          />
          <ToggleRow
            label="Recordatorios"
            description="Avisos de tus recordatorios personales"
            icon={<Icon name="check-circle" size={17} color={colors.textMuted} />}
            value={settings.reminderNotificationsEnabled}
            onValueChange={(reminderNotificationsEnabled) => update({ reminderNotificationsEnabled })}
          />

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <MiniStat label="Alarmas" value={String(alarms.length)} />
            <MiniStat label="Recordatorios" value={String(reminders.length)} />
            <MiniStat
              label="Avisos"
              value={String(alarms.filter((a) => a.enabled).length + reminders.filter((r) => r.enabled && !r.completed).length)}
            />
            <MiniStat label="Racha" value={`${stats.bestStreak}d`} />
          </View>
        </Card>

        {/* --------------------------- Sensores ---------------------------- */}
        <Card style={styles.card}>
          <GroupTitle
            icon="shake"
            title="Sensor de movimiento"
            status={{ text: `Sensibilidad ${settings.shakeSensitivity}/10`, tone: 'neutral' }}
          />

          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Cuanto más alto el valor, menos fuerza necesita el teléfono para contar una agitación. Si se dispara solo,
            bájalo; si te cuesta completarlo, súbelo.
          </Text>

          <View style={styles.sensitivityRow}>
            <Stepper
              value={settings.shakeSensitivity}
              onChange={(shakeSensitivity) => update({ shakeSensitivity })}
              min={1}
              max={10}
              unit="/10"
            />
            <View style={styles.sensitivityLabels}>
              <Text style={[typography.micro, { color: colors.textFaint }]}>Estricto</Text>
              <Text style={[typography.micro, { color: colors.textFaint }]}>Permisivo</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <ToggleRow
            label="Vibración"
            description="Respuesta háptica al interactuar"
            icon={<Icon name="zap" size={17} color={colors.textMuted} />}
            value={settings.hapticsEnabled}
            onValueChange={(hapticsEnabled) => update({ hapticsEnabled })}
            disabled={settings.hapticStrength === 'off'}
          />

          <Text style={[typography.micro, { color: colors.textFaint, marginTop: spacing.xs }]}>Intensidad</Text>
          <SegmentedControl
            segments={[
              { id: 'off', label: 'Ninguna' },
              { id: 'light', label: 'Suave' },
              { id: 'medium', label: 'Media' },
              { id: 'strong', label: 'Fuerte' },
            ]}
            value={settings.hapticStrength}
            onChange={(hapticStrength) => update({ hapticStrength })}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {/* ---------------------------- Apariencia -------------------------- */}
        <Card style={styles.card}>
          <GroupTitle icon={settings.colorScheme === 'dark' ? 'moon' : 'sun'} title="Apariencia" />

          <Text style={[typography.micro, { color: colors.textFaint }]}>Tema</Text>
          <SegmentedControl
            segments={[
              { id: 'system', label: 'Sistema' },
              { id: 'light', label: 'Claro' },
              { id: 'dark', label: 'Oscuro' },
            ]}
            value={settings.colorScheme}
            onChange={(colorScheme) => update({ colorScheme })}
          />

          <Text style={[typography.micro, { color: colors.textFaint, marginTop: spacing.md }]}>Color de acento</Text>
          <View style={styles.accentRow}>
            {ACCENTS.map((accent) => (
              <Pressable
                key={accent}
                onPress={() => update({ accent })}
                accessibilityRole="button"
                accessibilityLabel={`Acento ${accent}`}
                accessibilityState={{ selected: settings.accent === accent }}
                style={[
                  styles.accentSwatch,
                  { backgroundColor: accents[accent][500] },
                  settings.accent === accent && { borderColor: colors.text, borderWidth: 3 },
                ]}
              >
                {settings.accent === accent ? <Icon name="check" size={15} color="#FFFFFF" strokeWidth={3} /> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <ToggleRow
            label="Reloj de 24 horas"
            description="Muestra 18:00 en lugar de 6:00 PM"
            icon={<Icon name="clock" size={17} color={colors.textMuted} />}
            value={settings.use24Hour}
            onValueChange={(use24Hour) => update({ use24Hour })}
          />
        </Card>

        {/* --------------------------- Calendario --------------------------- */}
        <Card style={styles.card}>
          <GroupTitle
            icon="calendar"
            title="Calendario"
            status={
              !calendarSupport.supported
                ? { text: 'No disponible', tone: 'warning' }
                : calendarState === 'granted'
                  ? { text: 'Conectado', tone: 'success' }
                  : { text: 'Sin permiso', tone: 'warning' }
            }
          />

          {!calendarSupport.supported ? (
            <>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {calendarSupport.reason === 'expo-go'
                  ? 'expo-calendar no está incluido en Expo Go. Necesitas un development build para usar la integración con el calendario.'
                  : 'La integración con calendario solo está disponible en iOS y Android.'}
              </Text>
              <Text style={[typography.micro, { color: colors.textFaint }]}>
                El resto de la app funciona con normalidad sin esta función.
              </Text>
            </>
          ) : (
            <>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                La app solo lee eventos para mostrarlos junto a tus alarmas. Puedes revocar el permiso cuando quieras y la
                app sigue funcionando.
              </Text>

              {calendarError ? <Text style={[typography.micro, { color: colors.danger }]}>{calendarError}</Text> : null}

              {calendarState !== 'granted' ? (
                <Button
                  label={calendarState === 'denied' ? 'Abrir ajustes del sistema' : 'Solicitar acceso'}
                  variant="secondary"
                  fullWidth
                  onPress={calendarState === 'denied' ? openSystemCalendarSettings : askCalendar}
                />
              ) : (
                <>
                  <ToggleRow
                    label="Mostrar eventos"
                    description="Ver tus próximos eventos en Inicio"
                    icon={<Icon name="calendar" size={17} color={colors.textMuted} />}
                    value={settings.calendarEnabled}
                    onValueChange={(calendarEnabled) => update({ calendarEnabled })}
                  />

                  <SummaryRow
                    label="Calendario preferido"
                    value={
                      calendars.find((c) => c.id === settings.calendarId)?.title ??
                      calendars.find((c) => c.isPrimary)?.title ??
                      'Todos'
                    }
                    onPress={() => {
                      if (calendars.length > 0) router.push('/calendar');
                    }}
                  />

                  <SummaryRow
                    label="Ver eventos"
                    value=""
                    icon={<Icon name="arrow-up-right" size={17} color={colors.textMuted} />}
                    onPress={() => router.push('/calendar')}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* ----------------------------- Premium ---------------------------- */}
        <Card style={styles.card}>
          <GroupTitle
            icon="crown"
            title="Plan"
            status={settings.premium ? { text: 'Premium activo', tone: 'success' } : { text: 'Gratuito', tone: 'neutral' }}
          />
          {settings.premium && trialDaysLeft !== null ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Prueba simulada: te quedan {trialDaysLeft} días.
            </Text>
          ) : null}
          <SummaryRow
            label={settings.premium ? 'Ver benefits' : 'Mejorar a Premium'}
            onPress={() => router.push('/(tabs)/premium')}
            icon={<Icon name="sparkles" size={17} color={colors.warning} />}
          />
          {settings.premium ? (
            <Button label="Cancelar Premium" variant="ghost" fullWidth onPress={() => setPremium(false)} />
          ) : null}
        </Card>

        {/* ----------------------------- Datos ------------------------------ */}
        <Card style={styles.card}>
          <GroupTitle icon="shield" title="Datos" />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Todo se guarda solo en este dispositivo. No hay servidor, cuenta ni sincronización.
          </Text>
          <Button label="Restablecer preferencias" variant="ghost" fullWidth onPress={resetSettings} />
          <Button label="Borrar todos los datos" variant="danger" fullWidth onPress={confirmReset} />
        </Card>

        <Text style={[typography.micro, styles.version, { color: colors.textFaint }]}>
          SmartAlarm · MVP v0.1 · Expo SDK 57
        </Text>
      </ScrollView>
    </View>
  );
}

/* ------------------------------- Subviews -------------------------------- */

type StatusTone = 'success' | 'danger' | 'warning' | 'neutral';

function GroupTitle({
  icon,
  title,
  status,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  status?: { text: string; tone: StatusTone };
}) {
  const { colors } = useTheme();
  const toneColor = {
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    neutral: colors.textFaint,
  }[status?.tone ?? 'neutral'];

  return (
    <View style={styles.groupTitle}>
      <Icon name={icon} size={18} color={colors.text} />
      <Text style={[typography.heading, { color: colors.text, flex: 1 }]}>{title}</Text>
      {status ? <Chip label={status.text} size="sm" tone="neutral" style={{ borderColor: toneColor }} /> : null}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.miniStat}>
      <Text style={[typography.title, { color: colors.text, fontFamily: fonts.display, fontSize: 19 }]}>{value}</Text>
      <Text numberOfLines={1} style={[typography.micro, { color: colors.textFaint, fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,138,150,0.25)',
    marginVertical: spacing.xxs,
  },
  sensitivityRow: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  sensitivityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
  },
  accentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  accentSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  miniStat: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-start',
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  version: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
