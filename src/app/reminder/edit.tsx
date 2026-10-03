import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateLong, formatTime } from '../../core/date';
import { REMINDER_CATEGORIES, WEEKDAYS, type ReminderCategory, type Weekday } from '../../core/types';
import { useReminders, type ReminderDraft } from '../../state/RemindersContext';
import { useSettings } from '../../state/SettingsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';
import { Button, Card, Chip, Stepper, SummaryRow, ToggleRow, WeekdayPicker, Icon } from '../../components/ui';
import { ModalHeader } from '../../components/modal-header';

const LEAD_OPTIONS = [
  { minutes: 0, label: 'A la hora' },
  { minutes: 10, label: '10 min antes' },
  { minutes: 30, label: '30 min antes' },
  { minutes: 60, label: '1 h antes' },
  { minutes: 120, label: '2 h antes' },
  { minutes: 1440, label: '1 día antes' },
];

/** Builds a date at a given time of day, `daysFromNow` days ahead. */
function defaultDueAt(daysFromNow = 0, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

const DEFAULT_DRAFT: ReminderDraft = {
  title: '',
  notes: '',
  category: 'personal',
  dueAt: defaultDueAt(),
  leadMinutes: 10,
  weekdays: [],
  enabled: true,
  completed: false,
};

export default function EditReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { reminders, createReminder, updateReminder, deleteReminder } = useReminders();
  const params = useLocalSearchParams<{ id?: string }>();

  const editing = useMemo(() => reminders.find((reminder) => reminder.id === params.id), [reminders, params.id]);

  const [draft, setDraft] = useState<ReminderDraft>(() => (editing ? toDraft(editing) : DEFAULT_DRAFT));
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | undefined>(params.id);

  // Adjusting state during render is the supported way to reload the form when
  // the screen switches to a different reminder; an effect would show stale
  // fields for one frame and can clobber unsaved edits.
  if (editing && loadedId !== editing.id) {
    setLoadedId(editing.id);
    setDraft(toDraft(editing));
  }

  const dueDate = new Date(draft.dueAt);
  const repeating = draft.weekdays.length > 0;
  const titleMissing = draft.title.trim().length === 0;

  const patch = (next: Partial<ReminderDraft>) => setDraft((current) => ({ ...current, ...next }));

  const setDayOffset = (offset: number) => {
    const hour = dueDate.getHours();
    const minute = dueDate.getMinutes();
    const next = new Date();
    next.setDate(next.getDate() + offset);
    next.setHours(hour, minute, 0, 0);
    patch({ dueAt: next.getTime() });
  };

  const shiftTime = (deltaMinutes: number) => {
    patch({ dueAt: draft.dueAt + deltaMinutes * 60_000 });
  };

  const shiftDay = (days: number) => {
    const next = new Date(draft.dueAt);
    next.setDate(next.getDate() + days);
    patch({ dueAt: next.getTime() });
  };

  const save = async () => {
    if (titleMissing) return;
    setSaving(true);
    try {
      if (editing) await updateReminder(editing.id, draft);
      else await createReminder(draft);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const categoryMeta = REMINDER_CATEGORIES.find((c) => c.id === draft.category) ?? REMINDER_CATEGORIES[3];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ModalHeader
        title={editing ? 'Editar recordatorio' : 'Nuevo recordatorio'}
        subtitle={editing ? undefined : 'Título, fecha y hora'}
        onClose={() => router.back()}
        right={
          <Pressable
            onPress={save}
            disabled={saving || titleMissing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Guardar"
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: titleMissing ? colors.borderStrong : colors.accent },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[typography.bodyStrong, { color: colors.accentOn }]}>Guardar</Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* -------------------------- Título --------------------------- */}
        <Card style={styles.card}>
          <TextInput
            value={draft.title}
            onChangeText={(title) => patch({ title })}
            placeholder="¿Qué hay que recordar?"
            placeholderTextColor={colors.textFaint}
            maxLength={60}
            autoFocus={!editing}
            style={[
              styles.titleInput,
              typography.title,
              { color: colors.text, fontFamily: undefined, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
            ]}
          />
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => patch({ notes })}
            placeholder="Detalles opcionales"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={160}
            style={[
              styles.notesInput,
              typography.body,
              { color: colors.text, backgroundColor: colors.surfaceSunken, borderColor: colors.border },
            ]}
          />
        </Card>

        {/* ------------------------- Categoría ------------------------- */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Categoría</Text>
          <View style={styles.chipRow}>
            {REMINDER_CATEGORIES.map((category) => (
              <Chip
                key={category.id}
                label={`${category.emoji} ${category.label}`}
                selected={draft.category === category.id}
                onPress={() => patch({ category: category.id as ReminderCategory })}
              />
            ))}
          </View>
        </Card>

        {/* --------------------------- Fecha --------------------------- */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>¿Cuándo?</Text>

          <View style={styles.quickRow}>
            <Chip label="Hoy" onPress={() => setDayOffset(0)} />
            <Chip label="Mañana" onPress={() => setDayOffset(1)} />
            <Chip label="En 3 días" onPress={() => setDayOffset(3)} />
            <Chip label="En 1 semana" onPress={() => setDayOffset(7)} />
          </View>

          <View style={[styles.dueBox, { backgroundColor: colors.surfaceSunken }]}>
            <View style={styles.dueText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {capitalize(formatDateLong(dueDate))}
              </Text>
              <Text style={[typography.micro, { color: categoryMeta.color }]}>
                {formatTime(dueDate, settings.use24Hour)} · {draft.leadMinutes > 0 ? `aviso ${formatLead(draft.leadMinutes)} antes` : 'avisará a la hora'}
              </Text>
            </View>
            <View style={styles.steppers}>
              <Stepper
                value={dueDate.getHours()}
                onChange={(hour) => {
                  const next = new Date(draft.dueAt);
                  next.setHours(hour, dueDate.getMinutes(), 0, 0);
                  patch({ dueAt: next.getTime() });
                }}
                min={0}
                max={23}
                unit="h"
              />
              <Stepper
                value={dueDate.getMinutes()}
                onChange={(minute) => {
                  const next = new Date(draft.dueAt);
                  next.setHours(dueDate.getHours(), minute, 0, 0);
                  patch({ dueAt: next.getTime() });
                }}
                min={0}
                max={55}
                step={5}
                format={(value) => String(value).padStart(2, '0')}
                unit="min"
              />
            </View>
          </View>

          <View style={styles.quickRow}>
            <Chip label="−1 día" onPress={() => shiftDay(-1)} />
            <Chip label="+1 día" onPress={() => shiftDay(1)} />
            <Chip label="−30 min" onPress={() => shiftTime(-30)} />
            <Chip label="+30 min" onPress={() => shiftTime(30)} />
          </View>
        </Card>

        {/* ----------------------- Anticipación ------------------------ */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Anticipación</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Cuánto antes quieres que te avisemos.
          </Text>
          <View style={styles.chipRow}>
            {LEAD_OPTIONS.map((option) => (
              <Chip
                key={option.minutes}
                label={option.label}
                selected={draft.leadMinutes === option.minutes}
                onPress={() => patch({ leadMinutes: option.minutes })}
              />
            ))}
          </View>
        </Card>

        {/* ------------------------- Repetición ------------------------ */}
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Repetición</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Sin días seleccionados es una tarea de un solo uso.
          </Text>
          <WeekdayPicker selected={draft.weekdays} onChange={(weekdays) => patch({ weekdays })} />
          <Text style={[typography.micro, { color: colors.textFaint }]}>
            {repeating
              ? `Se repetirá cada semana (${formatWeekdayNames(draft.weekdays)}). El recordatorio se renueva automáticamente.`
              : 'Tarea de una sola vez.'}
          </Text>
          {repeating ? (
            <View style={styles.quickRow}>
              <Chip label="Entre semana" onPress={() => patch({ weekdays: [1, 2, 3, 4, 5] })} />
              <Chip label="Fin de semana" onPress={() => patch({ weekdays: [6, 0] })} />
              <Chip label="Limpiar" tone="danger" onPress={() => patch({ weekdays: [] })} />
            </View>
          ) : null}
        </Card>

        {/* --------------------------- Extra --------------------------- */}
        <Card style={styles.card}>
          <ToggleRow
            label="Notificación activa"
            description="Programa el aviso en el sistema"
            icon={<Icon name="bell" size={17} color={colors.textMuted} />}
            value={draft.enabled}
            onValueChange={(enabled) => patch({ enabled })}
          />
          <View style={styles.divider} />
          <SummaryRow
            label="Posponer"
            value="10 minutos"
            icon={<Icon name="skip" size={17} color={colors.textMuted} />}
            locked={!settings.premium}
            lockedHint={settings.premium ? 'Desde la tarjeta del recordatorio' : 'Requiere Premium'}
          />
        </Card>

        <Button
          label={editing ? 'Guardar cambios' : 'Crear recordatorio'}
          size="lg"
          fullWidth
          disabled={titleMissing}
          loading={saving}
          onPress={save}
        />
        {titleMissing ? (
          <Text style={[typography.micro, { color: colors.textFaint, textAlign: 'center' }]}>
            Escribe un título para guardar el recordatorio.
          </Text>
        ) : null}

        {editing ? (
          <Button
            label="Eliminar recordatorio"
            variant="danger"
            fullWidth
            onPress={() => {
              deleteReminder(editing.id);
              router.back();
            }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function toDraft(reminder: {
  title: string;
  notes: string;
  category: ReminderCategory;
  dueAt: number;
  leadMinutes: number;
  weekdays: Weekday[];
  enabled: boolean;
  completed: boolean;
}): ReminderDraft {
  return {
    title: reminder.title,
    notes: reminder.notes,
    category: reminder.category,
    dueAt: reminder.dueAt,
    leadMinutes: reminder.leadMinutes,
    weekdays: reminder.weekdays,
    enabled: reminder.enabled,
    completed: reminder.completed,
  };
}

function formatLead(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} día${minutes >= 2880 ? 's' : ''}`;
}

function formatWeekdayNames(days: Weekday[]) {
  return days
    .map((day) => WEEKDAYS.find((w) => w.value === day)?.long ?? '')
    .filter(Boolean)
    .join(', ');
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
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  card: {
    gap: spacing.sm,
  },
  titleInput: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 19,
  },
  notesInput: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dueBox: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  dueText: {
    gap: 2,
  },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,138,150,0.25)',
    marginVertical: spacing.xxs,
  },
});