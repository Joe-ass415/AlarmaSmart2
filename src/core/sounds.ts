export type SoundTier = 'free' | 'premium' | 'ui';

export type SoundEntry = {
  id: string;
  name: string;
  description: string;
  tier: SoundTier;
  /** Bundled asset. `require` must be statically analyzable, hence the map. */
  source: number;
  /** Suggested loop count for the ringing screen. */
  loop: boolean;
};

export const SOUNDS: SoundEntry[] = [
  {
    id: 'gentle-rise',
    name: 'Gentle Rise',
    description: 'Tres notas ascendentes, despertar suave',
    tier: 'free',
    source: require('../../assets/sounds/gentle-rise.wav'),
    loop: true,
  },
  {
    id: 'classic-beep',
    name: 'Classic Beep',
    description: 'Pitidos cuadrados cada 1,2 s',
    tier: 'free',
    source: require('../../assets/sounds/classic-beep.wav'),
    loop: true,
  },
  {
    id: 'digital-pulse',
    name: 'Digital Pulse',
    description: 'Pulso digital rápido de 4 Hz',
    tier: 'free',
    source: require('../../assets/sounds/digital-pulse.wav'),
    loop: true,
  },
  {
    id: 'soft-marimba',
    name: 'Soft Marimba',
    description: 'Quinta cálida con caída suave',
    tier: 'free',
    source: require('../../assets/sounds/soft-marimba.wav'),
    loop: true,
  },
  {
    id: 'sunrise-swell',
    name: 'Sunrise Swell',
    description: 'Colchón que crece lentamente',
    tier: 'premium',
    source: require('../../assets/sounds/sunrise-swell.wav'),
    loop: true,
  },
  {
    id: 'vintage-bell',
    name: 'Vintage Bell',
    description: 'Campana golpeada con parciales inarmónicos',
    tier: 'premium',
    source: require('../../assets/sounds/vintage-bell.wav'),
    loop: true,
  },
  {
    id: 'analog-radar',
    name: 'Analog Radar',
    description: 'Barrido que sube y baja',
    tier: 'premium',
    source: require('../../assets/sounds/analog-radar.wav'),
    loop: true,
  },
  {
    id: 'deep-rumble',
    name: 'Deep Rumble',
    description: 'Subgrave pulsante, difícil dormir con él',
    tier: 'premium',
    source: require('../../assets/sounds/deep-rumble.wav'),
    loop: true,
  },
];

const UI_SOUNDS: Record<string, number> = {
  'success-chime': require('../../assets/sounds/success-chime.wav'),
  'alarm-silent': require('../../assets/sounds/alarm-silent.wav'),
};

export const DEFAULT_SOUND_ID = 'gentle-rise';

export function getSound(id: string | undefined | null): SoundEntry {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}

export function getSoundSource(id: string | undefined | null): number {
  const sound = getSound(id);
  return sound.source;
}

export function getUiSoundSource(id: keyof typeof UI_SOUNDS) {
  return UI_SOUNDS[id];
}

export function isSoundLocked(sound: SoundEntry, isPremium: boolean) {
  return sound.tier === 'premium' && !isPremium;
}

export function freeSoundCount() {
  return SOUNDS.filter((s) => s.tier === 'free').length;
}
