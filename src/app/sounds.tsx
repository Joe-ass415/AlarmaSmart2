import { useAudioPlayer } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalHeader } from '../components/modal-header';
import { Button, Card, Chip, Icon, SegmentedControl } from '../components/ui';
import { tapFeedback } from '../core/haptics';
import { SOUNDS, freeSoundCount, isSoundLocked, type SoundEntry } from '../core/sounds';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

type Tier = 'all' | 'free' | 'premium';

export default function SoundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, setPremium } = useSettings();
  const params = useLocalSearchParams<{ selectedId?: string; alarmId?: string }>();

  const [tier, setTier] = useState<Tier>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const visible = useMemo(() => SOUNDS.filter((sound) => tier === 'all' || sound.tier === tier), [tier]);

  const handleSelectSound = (sound: SoundEntry) => {
    const locked = isSoundLocked(sound, settings.premium);
    if (locked) {
      Alert.alert(
        'Sonido Premium',
        'Este sonido requiere una suscripción Premium. ¿Deseas adquirir el plan Premium?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Premium', onPress: () => router.push('/(tabs)/premium') },
        ]
      );
      return;
    }

    tapFeedback();
    // Si la pantalla fue abierta desde la edición de alarma, regresa devolviendo el soundId seleccionado
    if (params.selectedId !== undefined) {
      router.navigate({
        pathname: '/alarm/edit',
        params: { id: params.alarmId, soundId: sound.id },
      } as any);
    }
  };

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
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                Desbloquea los {SOUNDS.length - freeSoundCount()} sonidos Premium
              </Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Obtén acceso completo para usarlos en cualquiera de tus alarmas.
              </Text>
            </View>
            <Button label="Mejorar" size="sm" onPress={() => router.push('/(tabs)/premium')} />
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
              isSelected={sound.id === params.selectedId}
              locked={isSoundLocked(sound, settings.premium)}
              previewing={previewingId === sound.id}
              onTogglePreview={() => setPreviewingId((current) => (current === sound.id ? null : sound.id))}
              onSelect={() => handleSelectSound(sound)}
            />
          ))}
        </View>

        <Card style={styles.noteCard}>
          <Icon name="info" size={17} color={colors.textMuted} />
          <Text style={[typography.micro, { color: colors.textMuted, flex: 1 }]}>
            Toca el botón de reproducción para escuchar una vista previa o toca la tarjeta para seleccionar el sonido de tu alarma.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

type SoundRowProps = {
  sound: SoundEntry;
  isSelected: boolean;
  locked: boolean;
  previewing: boolean;
  onTogglePreview: () => void;
  onSelect: () => void;
};

function SoundRow({ sound, isSelected, locked, previewing, onTogglePreview, onSelect }: SoundRowProps) {
  const { colors } = useTheme();
  const player = useAudioPlayer(sound.source);

  useEffect(() => {
    player.loop = false;
  }, [player]);

  useEffect(() => {
    if (!previewing) {
      player.pause();
      return;
    }
    player.seekTo(0).catch(() => {});
    player.play();
  }, [previewing, player]);

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${sound.name}${locked ? ', bloqueado' : ''}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: isSelected ? colors.accent : previewing ? colors.accentSoft : colors.border },
        isSelected && { borderWidth: 2 },
        pressed && { opacity: 0.8 },
        locked && { opacity: 0.6 },
      ]}
    >
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          tapFeedback();
          onTogglePreview();
        }}
        hitSlop={8}
        style={[styles.playButton, { backgroundColor: previewing ? colors.accent : colors.accentSoft }]}
      >
        <Icon
          name={previewing ? 'pause' : 'play'}
          size={16}
          color={previewing ? colors.accentOn : colors.accent}
        />
      </Pressable>

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

      {locked ? (
        <Icon name="lock" size={16} color={colors.warning} />
      ) : isSelected ? (
        <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} />
      ) : (
        <Icon name="chevron-right" size={18} color={colors.textFaint} />
      )}
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