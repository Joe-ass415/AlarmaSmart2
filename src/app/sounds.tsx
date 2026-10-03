import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapFeedback } from '../core/haptics';
import { SOUNDS, freeSoundCount, isSoundLocked, type SoundEntry } from '../core/sounds';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';
import { Button, Card, Chip, SegmentedControl , Icon } from '../components/ui';
import { ModalHeader } from '../components/modal-header';

type Tier = 'all' | 'free' | 'premium';

export default function SoundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, setPremium } = useSettings();
  const [tier, setTier] = useState<Tier>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const visible = useMemo(() => SOUNDS.filter((sound) => tier === 'all' || sound.tier === tier), [tier]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="Biblioteca de sonidos"
        subtitle={`${SOUNDS.length} sonidos · ${freeSoundCount()} gratis`}
        onClose={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <SegmentedControl<Tier>
          segments={[
            { id: 'all', label: `Todos (${SOUNDS.length})` },
            { id: 'free', label: `Gratis (${freeSoundCount()})` },
            { id: 'premium', label: `Premium (${SOUNDS.length - freeSoundCount()})` },
          ]}
          value={tier}
          onChange={setTier}
        />

        {!settings.premium ? (
          <Card style={[styles.upgradeCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
            <Icon name="sparkles" size={20} color={colors.accent} />
            <View style={styles.upgradeText}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>Desbloquea los {SOUNDS.length - freeSoundCount()} sonidos Premium</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Activa la prueba simulada para escucharlos y usarlos en cualquier alarma.
              </Text>
            </View>
            <Button label="Probar" size="sm" onPress={() => setPremium(true)} />
          </Card>
        ) : (
          <View style={[styles.activePill, { backgroundColor: colors.successSoft }]}>
            <Icon name="check-circle" size={15} color={colors.success} strokeWidth={2.3} />
            <Text style={[typography.micro, { color: colors.success }]}>Todos los sonidos desbloqueados</Text>
          </View>
        )}

        <View style={styles.list}>
          {visible.map((sound) => (
            <SoundRow
              key={sound.id}
              sound={sound}
              locked={isSoundLocked(sound, settings.premium)}
              previewing={previewingId === sound.id}
              onTogglePreview={() => setPreviewingId((current) => (current === sound.id ? null : sound.id))}
            />
          ))}
        </View>

        <Card style={styles.noteCard}>
          <Icon name="info" size={17} color={colors.textMuted} />
          <Text style={[typography.micro, { color: colors.textMuted, flex: 1 }]}>
            El sonido dentro de la app y el sonido de la notificación del sistema son cosas distintas. Estos sonidos se
            reproducen en la pantalla de alarma; el aviso previo usa el sonido por defecto del teléfono, porque
            Expo Go no permite instalar sonidos de notificación personalizados.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

type SoundRowProps = {
  sound: SoundEntry;
  locked: boolean;
  previewing: boolean;
  onTogglePreview: () => void;
};

function SoundRow({ sound, locked, previewing, onTogglePreview }: SoundRowProps) {
  const { colors } = useTheme();
  // One player per row keeps previews independent and lets the OS stop a
  // preview when the row unmounts.
  const player = useAudioPlayer(sound.source);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- native player handle, mutated by design
    player.loop = false;
  }, [player]);

  useEffect(() => {
    if (!previewing) {
      player.pause();
      return;
    }
    // `seekTo` is the only async member here.
    player.seekTo(0).catch(() => {});
    player.play();
  }, [previewing, player]);

  return (
    <Pressable
      onPress={() => {
        if (locked) return;
        tapFeedback();
        onTogglePreview();
      }}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={`${sound.name}${locked ? ', bloqueado' : ''}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: previewing ? colors.accent : colors.border },
        pressed && !locked && { opacity: 0.75 },
        locked && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.playButton, { backgroundColor: previewing ? colors.accent : colors.accentSoft }]}>
        <Icon
          name={previewing ? 'pause' : 'play'}
          size={16}
          color={previewing ? colors.accentOn : colors.accent}
        />
      </View>

      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text, flexShrink: 1 }]}>
            {sound.name}
          </Text>
          <Chip
            label={sound.tier === 'premium' ? 'Premium' : 'Gratis'}
            size="sm"
            tone={sound.tier === 'premium' ? 'warning' : 'success'}
          />
        </View>
        <Text numberOfLines={1} style={[typography.micro, { color: colors.textMuted }]}>
          {sound.description}
        </Text>
      </View>

      {locked ? <Icon name="lock" size={16} color={colors.warning} /> : <Icon name="chevron-right" size={18} color={colors.textFaint} />}
    </Pressable>
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
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  upgradeText: {
    flex: 1,
    gap: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
});