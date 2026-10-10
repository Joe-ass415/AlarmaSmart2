import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from '../../hooks/useRouter';

import { formatClock, formatRelative, nextOccurrence } from '../../core/date';
import { impactFeedback } from '../../core/haptics';
import type { Alarm } from '../../core/types';
import { useAlarms } from '../../state/AlarmsContext';
import { useSettings } from '../../state/SettingsContext';
import { tabBarStore } from '../../state/useTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';
import { AlarmRow } from '../../components/rows';
import { Button, Card, EmptyState, SegmentedControl , SectionHeader , Icon } from '../../components/ui';
import { ScreenHeader } from '../../components/screen-header';

type Filter = 'all' | 'active' | 'paused';

export default function AlarmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { alarms, toggleAlarm, deleteAlarm, permission, rescheduleAll, startRinging } = useAlarms();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const filtered = alarms.filter((alarm) => {
      if (filter === 'active') return alarm.enabled;
      if (filter === 'paused') return !alarm.enabled;
      return true;
    });
    return [...filtered].sort((a, b) => nextOccurrence(a.hour, a.minute, a.weekdays).getTime() - nextOccurrence(b.hour, b.minute, b.weekdays).getTime());
  }, [alarms, filter]);

  const confirmDelete = (alarm: Alarm) => {
    Alert.alert(
      'Eliminar alarma',
      `¿Seguro que quieres eliminar "${alarm.label || formatClock(alarm.hour, alarm.minute, settings.use24Hour)}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            impactFeedback();
            deleteAlarm(alarm.id);
          },
        },
      ]
    );
  };

  const activeCount = alarms.filter((alarm) => alarm.enabled).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title="Alarmas"
          subtitle={`${activeCount} activas · ${alarms.length} en total`}
          right={
            <Button
              label="Nueva"
              size="sm"
              icon={<Icon name="plus" size={15} color={colors.accentOn} strokeWidth={2.6} />}
              onPress={() => router.push('/alarm/edit')}
            />
          }
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        onScroll={(event) => tabBarStore.setVisible(event.nativeEvent.contentOffset.y < 120)}
        scrollEventThrottle={16}
      >
        {permission === 'granted' ? (
          <Card style={styles.resyncCard}>
            <View style={[styles.resyncIcon, { backgroundColor: colors.successSoft }]}>
              <Icon name="shield" size={18} color={colors.success} />
            </View>
            <View style={styles.resyncText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>Notificaciones activas</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Cada alarma activa tiene su aviso programado en el sistema.
              </Text>
            </View>
            <Button label="Resinc." size="sm" variant="ghost" onPress={rescheduleAll} />
          </Card>
        ) : (
          <Card style={[styles.resyncCard, { borderColor: colors.warning }]}>
            <View style={[styles.resyncIcon, { backgroundColor: colors.warningSoft }]}>
              <Icon name="info" size={18} color={colors.warning} />
            </View>
            <View style={styles.resyncText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>Sin permiso de notificaciones</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Tus alarmas se guardan, pero no podrán avisarte.
              </Text>
            </View>
            <Button label="Ir" size="sm" variant="ghost" onPress={() => router.push('/(tabs)/settings')} />
          </Card>
        )}

        {alarms.length > 0 ? (
          <SegmentedControl<Filter>
            segments={[
              { id: 'all', label: `Todas (${alarms.length})` },
              { id: 'active', label: `Activas (${activeCount})` },
              { id: 'paused', label: `Pausadas (${alarms.length - activeCount})` },
            ]}
            value={filter}
            onChange={setFilter}
          />
        ) : null}

        {visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="alarm" size={26} color={colors.accent} />}
              title={alarms.length === 0 ? 'Aún no hay alarmas' : 'Nada en este filtro'}
              message={
                alarms.length === 0
                  ? 'Crea tu primera alarma y agita el teléfono para despertarte de verdad.'
                  : 'Prueba con otro filtro para ver tus alarmas.'
              }
              action={
                alarms.length === 0 ? (
                  <Button label="Crear alarma" onPress={() => router.push('/alarm/edit')} style={{ marginTop: spacing.sm }} />
                ) : undefined
              }
            />
          </Card>
        ) : (
          <View style={styles.gap}>
            <SectionHeader
              title={filter === 'all' ? 'Próximas' : filter === 'active' ? 'Activas' : 'Pausadas'}
              subtitle="Toca una alarma para editarla"
            />
            {visible.map((alarm) => (
              <View key={alarm.id} style={styles.alarmWrapper}>
                <AlarmRow
                  alarm={alarm}
                  use24Hour={settings.use24Hour}
                  showCountdown
                  onToggle={(enabled) => toggleAlarm(alarm.id, enabled)}
                  onPress={() => router.push({ pathname: '/alarm/edit', params: { id: alarm.id } })}
                />
                {alarm.enabled && alarm.nextOccurrenceAt ? (
                  <Text style={[typography.micro, styles.nextHint, { color: colors.textFaint }]}>
                    Suena {formatRelative(alarm.nextOccurrenceAt)}
                  </Text>
                ) : null}
                <View style={styles.rowActions}>
                  <Button
                    label="Probar"
                    size="sm"
                    variant="ghost"
                    icon={<Icon name="play" size={13} color={colors.text} />}
                    onPress={() => startRinging(alarm.id, false, true)}
                  />
                  <Button
                    label="Eliminar"
                    size="sm"
                    variant="danger"
                    icon={<Icon name="trash" size={13} color={colors.danger} />}
                    onPress={() => confirmDelete(alarm)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  gap: {
    gap: spacing.sm,
  },
  resyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  resyncIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resyncText: {
    flex: 1,
    gap: 2,
  },
  alarmWrapper: {
    gap: 4,
  },
  nextHint: {
    paddingLeft: spacing.md,
    paddingTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: 2,
  },
});
