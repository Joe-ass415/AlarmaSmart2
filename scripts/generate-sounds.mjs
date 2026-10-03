/**
 * Generates the bundled alarm sound library as 16-bit mono PCM WAV files.
 * Run with: node scripts/generate-sounds.mjs
 *
 * Sounds are synthesized so the app ships with a real, offline, in-app
 * library without depending on third-party audio assets or network access.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
const SAMPLE_RATE = 22050;

function writeWav(name, samples) {
  const bytesPerSample = 2;
  const data = Buffer.alloc(samples.length * bytesPerSample);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * bytesPerSample);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  writeFileSync(join(OUT_DIR, `${name}.wav`), Buffer.concat([header, data]));
  return samples.length / SAMPLE_RATE;
}

const TAU = Math.PI * 2;
const t = (seconds) => Math.floor(seconds * SAMPLE_RATE);

function envelope(index, total, attack = 0.01, release = 0.2) {
  const position = index / total;
  if (position < attack) return position / attack;
  if (position > 1 - release) return Math.max(0, (1 - position) / release);
  return 1;
}

/** Pads a generated phrase to `seconds` so the player can loop seamlessly. */
function loopBuffer(build, seconds) {
  const total = t(seconds);
  const out = new Float32Array(total);
  const scratch = { at: 0 };
  while (scratch.at < total) {
    for (let i = 0; i < total; i++) out[scratch.at + i] = build(scratch.at + i, total, scratch);
    scratch.at += total;
  }
  return out;
}

function silence() {
  return new Float32Array(t(1.5));
}

/* ------------------------------------------------------------------ */
/* Free sounds                                                         */
/* ------------------------------------------------------------------ */

// Three rising two-tone pips. Soft attack, no harsh edges: meant for waking up gently.
function gentleRise() {
  const total = t(3);
  const out = new Float32Array(total);
  const notes = [523.25, 659.25, 783.99];
  const noteLen = total / notes.length;
  notes.forEach((freq, i) => {
    for (let i2 = 0; i2 < noteLen; i2++) {
      const index = i * noteLen + i2;
      const local = i2 / noteLen;
      const env = Math.min(1, local / 0.08) * Math.min(1, (1 - local) / 0.35);
      out[index] =
        env * 0.42 * (Math.sin(TAU * freq * (index / SAMPLE_RATE)) + 0.3 * Math.sin(TAU * freq * 2 * (index / SAMPLE_RATE)));
    }
  });
  return out;
}

// The classic: short square-wave beeps on a 1.2s cadence.
function classicBeep() {
  const total = t(3);
  const out = new Float32Array(total);
  const period = t(1.2);
  for (let i = 0; i < total; i++) {
    if (i % period >= t(0.16)) continue;
    const local = (i % period) / t(0.16);
    const env = envelope(local, 1, 0.05, 0.3);
    const f = 880;
    out[i] = env * 0.4 * (Math.sign(Math.sin(TAU * f * (i / SAMPLE_RATE))) * 0.7 + 0.3 * Math.sin(TAU * f * 2 * (i / SAMPLE_RATE)));
  }
  return out;
}

// Fast pulsing digital blip, 4 Hz.
function digitalPulse() {
  const total = t(3);
  const out = new Float32Array(total);
  const period = t(0.25);
  for (let i = 0; i < total; i++) {
    const local = (i % period) / period;
    const env = Math.max(0, 1 - local * 2.2);
    const f = 1320;
    out[i] = env * 0.36 * Math.sin(TAU * f * (i / SAMPLE_RATE));
  }
  return out;
}

// Warm marimba-like tone with a decaying fifth, easy on the ears.
function softMarimba() {
  const total = t(3);
  const out = new Float32Array(total);
  const period = t(1);
  for (let i = 0; i < total; i++) {
    const local = (i % period) / period;
    const decay = Math.exp(-local * 3.4);
    const f = 440;
    out[i] =
      decay * 0.4 *
      (Math.sin(TAU * f * (i / SAMPLE_RATE)) + 0.45 * Math.sin(TAU * f * 1.5 * (i / SAMPLE_RATE)) + 0.18 * Math.sin(TAU * f * 3 * (i / SAMPLE_RATE)));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Premium sounds                                                      */
/* ------------------------------------------------------------------ */

// Slow swelling filtered pad, deliberately different in character from the free set.
function sunriseSwell() {
  const base = 220;
  const harmonic = (freq, phase) => Math.sin(TAU * freq * phase);
  const out = loopBuffer(
    (index, total) => {
      const seconds = index / SAMPLE_RATE;
      const cycle = (index / total) * 4;
      const swell = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * cycle) / 1, 2);
      const f = base * (1 + 0.08 * Math.sin(TAU * seconds / 3));
      return (
        swell * 0.34 *
        (harmonic(f, seconds) * 0.5 + harmonic(f * 1.5, seconds) * 0.3 + harmonic(f * 2, seconds) * 0.2 + harmonic(f * 0.5, seconds) * 0.25)
      );
    },
    3
  );
  return out;
}

// Struck bell: inharmonic partials with long decay.
function vintageBell() {
  const total = t(3);
  const out = new Float32Array(total);
  const partials = [1, 2.02, 2.98, 4.11, 5.43];
  const gains = [1, 0.5, 0.34, 0.2, 0.12];
  for (let i = 0; i < total; i++) {
    const seconds = i / SAMPLE_RATE;
    let v = 0;
    partials.forEach((p, idx) => {
      const struck = Math.max(0, seconds - idx * 0.012);
      v += gains[idx] * Math.exp(-struck * (2.2 + idx * 0.9)) * Math.sin(TAU * 660 * p * struck);
    });
    out[i] = v * 0.32 * Math.min(1, seconds / 0.004);
  }
  return out;
}

// Radar sweep: rising sine followed by a falling one, per 2s cycle.
function analogRadar() {
  const out = loopBuffer(
    (index, total) => {
      const position = index / total;
      const seconds = index / SAMPLE_RATE;
      const sweep = Math.pow((position * 2) % 1, 0.6);
      const f = 500 + sweep * 900;
      const body = Math.sin(TAU * f * seconds);
      const shimmer = 0.25 * Math.sin(TAU * f * 2 * seconds);
      const tremolo = 0.75 + 0.25 * Math.sin(TAU * 9 * seconds);
      return tremolo * 0.32 * (body + shimmer);
    },
    2
  );
  return out;
}

// Low sub-heavy rumble with a slow LFO. Loudest, hardest to sleep through.
function deepRumble() {
  const out = loopBuffer(
    (index, total) => {
      const seconds = index / SAMPLE_RATE;
      const lfo = 0.6 + 0.4 * Math.sin(TAU * seconds / 1.5);
      const base = 90;
      const v =
        0.55 * Math.sin(TAU * base * seconds) +
        0.28 * Math.sin(TAU * base * 1.5 * seconds) +
        0.16 * Math.sin(TAU * base * 2 * seconds) +
        0.1 * Math.sin(TAU * base * 3 * seconds);
      return lfo * 0.42 * v;
    },
    1.5
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* UI one-shots                                                        */
/* ------------------------------------------------------------------ */

// Short confirmation used after a challenge is completed.
function successChime() {
  const total = t(0.7);
  const out = new Float32Array(total);
  const notes = [659.25, 987.77];
  const noteLen = total / notes.length;
  notes.forEach((freq, idx) => {
    for (let i = 0; i < noteLen; i++) {
      const index = idx * noteLen + i;
      const local = i / noteLen;
      const env = Math.exp(-local * 3) * Math.min(1, local / 0.01);
      out[index] = env * 0.4 * (Math.sin(TAU * freq * (index / SAMPLE_RATE)) + 0.25 * Math.sin(TAU * freq * 2 * (index / SAMPLE_RATE)));
    }
  });
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });

const library = {
  'gentle-rise': gentleRise(),
  'classic-beep': classicBeep(),
  'digital-pulse': digitalPulse(),
  'soft-marimba': softMarimba(),
  'sunrise-swell': sunriseSwell(),
  'vintage-bell': vintageBell(),
  'analog-radar': analogRadar(),
  'deep-rumble': deepRumble(),
  'success-chime': successChime(),
  'alarm-silent': silence(),
};

for (const [name, samples] of Object.entries(library)) {
  const seconds = writeWav(name, samples);
  console.log(`  ${name}.wav  ${seconds.toFixed(2)}s`);
}
console.log(`\nGenerated ${Object.keys(library).length} sounds in assets/sounds/`);
