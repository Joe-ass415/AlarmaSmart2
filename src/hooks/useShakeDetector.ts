import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_INTERVAL_MS = 50; // ~20 Hz. Comfortably under the Android 200 Hz cap.
const CALIBRATION_SAMPLES = 12;
const PEAK_COOLDOWN_MS = 320;

/** Samples retained to compute a stable resting baseline. */
const BASELINE_WINDOW = 40;

export type SensorState = 'checking' | 'ready' | 'denied' | 'unavailable';

export type UseShakeDetectorOptions = {
  enabled: boolean;
  /** Number of shakes needed to complete the challenge. */
  target: number;
  /** 1 (strict) to 10 (very sensitive). */
  sensitivity: number;
  /** Runs on every registered shake with the new count. */
  onShake?: (count: number) => void;
  /** Runs once when the target is reached. */
  onComplete?: (shakeCount: number) => void;
};

export type ShakeDetector = {
  shakeCount: number;
  sensorState: SensorState;
  /** True while the resting baseline is still being measured. */
  calibrating: boolean;
  /** Most recent magnitude deviation in g, for the live meter. */
  intensity: number;
  reset: () => void;
  /** Feeds a synthetic peak. Used by the manual fallback button. */
  simulateShake: () => void;
};

/**
 * Maps the 1-10 sensitivity to the g-force deviation that counts as a peak.
 * At 1 the phone must be thrown hard; at 10 a gentle wrist flick is enough.
 */
function thresholdFor(sensitivity: number) {
  const clamped = Math.min(10, Math.max(1, sensitivity));
  const high = 3.4 - ((clamped - 1) / 9) * 2.4; // 3.4 g → 1.0 g
  return { high, low: high * 0.5 };
}

/**
 * Shake detection over the raw accelerometer.
 *
 * A single physical shake produces several acceleration peaks, so detection
 * uses hysteresis (a peak must fall below the low threshold before another can
 * count) plus a time cooldown. The resting baseline is calibrated from the
 * first samples so the detector is orientation independent.
 */
export function useShakeDetector({
  enabled,
  target,
  sensitivity,
  onShake,
  onComplete,
}: UseShakeDetectorOptions): ShakeDetector {
  const [shakeCount, setShakeCount] = useState(0);
  const [sensorState, setSensorState] = useState<SensorState>('checking');
  const [calibrating, setCalibrating] = useState(true);
  const [intensity, setIntensity] = useState(0);

  const armedRef = useRef(true);
  const baselineRef = useRef<number[]>([]);
  const baselineMeanRef = useRef(0);
  const calibrationRef = useRef<number[]>([]);
  const lastPeakAtRef = useRef(0);
  const completedRef = useRef(false);

  // Latest-callback refs: the sensor listener is registered once, so it reads
  // the current handlers through refs instead of closing over stale ones.
  const onShakeRef = useRef(onShake);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onShakeRef.current = onShake;
    onCompleteRef.current = onComplete;
  }, [onShake, onComplete]);

  /** Clears the non-render bookkeeping; refs must only be touched outside render. */
  const resetChallengeRefs = useCallback(() => {
    completedRef.current = false;
    armedRef.current = true;
    lastPeakAtRef.current = 0;
    calibrationRef.current = [];
  }, []);

  const reset = useCallback(() => {
    resetChallengeRefs();
    setShakeCount(0);
    setCalibrating(true);
    setIntensity(0);
  }, [resetChallengeRefs]);

  /** Shared by the sensor listener and the manual fallback. */
  const registerPeak = useCallback(
    (now: number) => {
      if (completedRef.current) return;
      if (now - lastPeakAtRef.current < PEAK_COOLDOWN_MS) return;
      lastPeakAtRef.current = now;

      setShakeCount((previous) => {
        const next = previous + 1;
        onShakeRef.current?.(next);
        if (next >= target && !completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.(next);
        }
        return next;
      });
    },
    [target]
  );

  const simulateShake = useCallback(() => {
    setCalibrating(false);
    registerPeak(Date.now());
  }, [registerPeak]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let subscription: { remove: () => void } | null = null;

    const start = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!mounted) return;
        if (!available) {
          setSensorState('unavailable');
          return;
        }

        // iOS exposes motion permission for DeviceMotion; the accelerometer has
        // none, but requesting is harmless and catches web.
        const permission = await Accelerometer.getPermissionsAsync();
        if (!mounted) return;
        if (permission.status === 'denied') {
          setSensorState('denied');
          return;
        }

        setSensorState('ready');
        Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

        subscription = Accelerometer.addListener((data: AccelerometerMeasurement) => {
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);

          if (calibrationRef.current.length < CALIBRATION_SAMPLES) {
            calibrationRef.current.push(magnitude);
            if (calibrationRef.current.length === CALIBRATION_SAMPLES) {
              const sorted = [...calibrationRef.current].sort((a, b) => a - b);
              baselineMeanRef.current = sorted[Math.floor(sorted.length / 2)];
              if (mounted) setCalibrating(false);
            }
            return;
          }

          if (baselineRef.current.length >= BASELINE_WINDOW) {
            baselineRef.current.shift();
          }
          baselineRef.current.push(magnitude);

          // Track the resting magnitude slowly so a change in how the phone is
          // held (bedside table, under a pillow) re-centers the detector.
          const drift = baselineMeanRef.current === 0 ? 0 : (magnitude - baselineMeanRef.current) * 0.02;
          if (Math.abs(drift) > 0.01) baselineMeanRef.current += drift;

          const deviation = Math.abs(magnitude - baselineMeanRef.current);
          if (mounted) setIntensity(deviation);

          const { high, low } = thresholdFor(sensitivity);
          const now = Date.now();

          if (deviation >= high) {
            if (armedRef.current) {
              armedRef.current = false;
              registerPeak(now);
            }
          } else if (deviation <= low) {
            armedRef.current = true;
          }
        });
      } catch (error) {
        console.warn('[shake] failed to start accelerometer', error);
        if (mounted) setSensorState('unavailable');
      }
    };

    start();

    return () => {
      mounted = false;
      subscription?.remove();
      subscription = null;
    };
  }, [enabled, sensitivity, registerPeak]);

  // A new target restarts the challenge. Adjusting state during render is the
  // supported way to react to a changed input without an extra commit.
  const [seenTarget, setSeenTarget] = useState(target);
  if (seenTarget !== target) {
    setSeenTarget(target);
    setShakeCount(0);
    setCalibrating(true);
    setIntensity(0);
  }

  useEffect(() => {
    resetChallengeRefs();
  }, [resetChallengeRefs, target]);

  return { shakeCount, sensorState, calibrating, intensity, reset, simulateShake };
}
