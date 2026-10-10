import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from '../../hooks/useRouter';

import { formatDateShort, formatTime, isSameDay, nextOccurrence } from '../../core/date';
import { impactFeedback } from '../../core/haptics';
import { REMINDER_CATEGORIES, type Reminder, type ReminderCategory } from '../../core/types';
import { fireTime, useReminders } from '../../state/RemindersContext';
import { useSettings } from '../../state/SettingsContext';
import { tabBarStore } from '../../state/useTabBar';
import { useTheme } from '../../theme/ThemeProvider';
import { useNow } from '../../hooks/useNow';
import { radius, spacing, typography } from '../../theme/tokens';
import { ReminderRow } from '../../components/rows';
import { Button, Card, Chip, EmptyState, ProgressRing , SectionHeader , Icon } from '../../components/ui';
import { ScreenHeader } from '../../components/screen-header';

type Tab = 'pending' | 'completed';

export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { pending, completed, overdue, completionRate, toggleComplete, deleteReminder, snoozeReminder } = useReminders();

  const [tab, setTab] = useState<Tab>('pending');
  const [category, setCategory] = useState<ReminderCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const source = tab === 'pending' ? pending : completed;
    return category === 'all' ? source : source.filter((reminder) => reminder.category === category);
  }, [tab, pending, completed, category]);

  const confirmDelete = (reminder: Reminder) => {
    Alert.alert('Eliminar recordatorio', `¿Eliminar "${reminder.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          impactFeedback();
          deleteReminder(reminder.id);
        },
      },
    ]);
  };

  const byCategory = useMemo(
    () =>
      REMINDER_CATEGORIES.map((c) => ({
        ...c,
        count: pending.filter((reminder) => reminder.category === c.id).length,
      })),
    [pending]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title="Recordatorios"
          subtitle={`${pending.length} pendientes · ${overdue.length} vencidos`}
          right={
            <Button
              label="Nuevo"
              size="sm"
              icon={<Icon name="plus" size={15} color={colors.accentOn} strokeWidth={2.6} />}
              onPress={() => router.push('/reminder/edit')}
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
        <Card style={styles.summaryCard}>
          <ProgressRing progress={completionRate} size={72} thickness={9} color={colors.accent}>
            <Text style={[typography.caption, { color: colors.text }]}>{Math.round(completionRate * 100)}%</Text>
          </ProgressRing>

          <View style={styles.summaryText}>
            <Text style={[typography.heading, { color: colors.text }]}>Tus hábitos</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {completed.length} completados en total. {byCategory.some((c) => c.count > 0) ? 'Vas bien.' : 'Empieza por uno pequeño.'}
            </Text>
          </View>
        </Card>

        <View style={styles.tabRow}>
          {(['pending', 'completed'] as Tab[]).map((id) => (
            <Pressable
              key={id}
              onPress={() => {
                impactFeedback();
                setTab(id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              style={[
                styles.tab,
                tab === id && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[typography.caption, { color: tab === id ? colors.text : colors.textMuted }]}>
                {id === 'pending' ? `Pendientes (${pending.length})` : `Completados (${completed.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'pending' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Chip label="Todas" selected={category === 'all'} onPress={() => setCategory('all')} size="sm" />
            {byCategory.map((c) => (
              <Chip
                key={c.id}
                label={`${c.emoji} ${c.label} ${c.count}`}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
                size="sm"
              />
            ))}
          </ScrollView>
        ) : null}

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="bell" size={26} color={colors.accent} />}
              title={tab === 'pending' ? 'Nada pendiente' : 'Nada completado aún'}
              message={
                tab === 'pending'
                  ? 'Añade recordatorios para pagar facturas, tomar agua o preparar una clase.'
                  : 'Cuando marques un recordatorio como hecho aparecerá aquí.'
              }
              action={
                tab === 'pending' ? (
                  <Button label="Crear recordatorio" onPress={() => router.push('/reminder/edit')} style={{ marginTop: spacing.sm }} />
                ) : undefined
              }
            />
          </Card>
        ) : (
          <View style={styles.gap}>
            {tab === 'pending' && overdue.length > 0 ? (
              <SectionHeader title="Vencidos" subtitle={`${overdue.length} necesitan atención`} />
            ) : null}

            {filtered.map((reminder) => {
              const fireAt = fireTime(reminder);
              const isOverdue = !reminder.completed && now > 0 && fireAt <= now;
              const showDay = !isOverdue && now > 0 && !isSameDay(new Date(fireAt), new Date(now));

              return (
                <View key={reminder.id} style={styles.item}>
                  {showDay ? (
                    <Text style={[typography.micro, { color: colors.textFaint, paddingLeft: spacing.xs }]}>
                      {formatDateShort(new Date(fireTime(reminder)))}
                    </Text>
                  ) : null}
                  <ReminderRow
                    reminder={reminder}
                    use24Hour={settings.use24Hour}
                    onToggleComplete={() => toggleComplete(reminder.id)}
                    onSnooze={() => snoozeReminder(reminder.id, 10)}
                    onPress={() => router.push({ pathname: '/reminder/edit', params: { id: reminder.id } })}
                  />
                  {reminder.weekdays.length > 0 ? (
                    <Text style={[typography.micro, { color: colors.textFaint, paddingLeft: spacing.xs }]}>
                      Se repite {formatTime(nextOccurrence(new Date(reminder.dueAt).getHours(), new Date(reminder.dueAt).getMinutes(), reminder.weekdays), settings.use24Hour)} cada semana
                    </Text>
                  ) : null}
                  {tab === 'completed' ? (
                    <Pressable
                      onPress={() => confirmDelete(reminder)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${reminder.title}`}
                      style={styles.deleteLink}
                    >
                      <Icon name="trash" size={13} color={colors.danger} strokeWidth={2} />
                      <Text style={[typography.micro, { color: colors.danger }]}>Eliminar</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  gap: {
    gap: spacing.sm,
  },
  item: {
    gap: 3,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.xs,
    paddingTop: 2,
  },
});
