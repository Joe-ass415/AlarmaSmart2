import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { configureHaptics } from '../core/haptics';
import { StorageKeys, storage } from '../core/storage';
import { DAY_MS } from '../core/date';
import { DEFAULT_SETTINGS, type Settings } from '../core/types';
import { useNow } from '../hooks/useNow';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

const TRIAL_DAYS = 7;

type SettingsContextValue = {
  settings: Settings;
  /** Resolved from `colorScheme: 'system'`. */
  colorScheme: 'light' | 'dark';
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  startTrial: () => void;
  setPremium: (premium: boolean) => void;
  /** Trial days remaining, or null when no trial is running. */
  trialDaysLeft: number | null;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const now = useNow();
  const systemScheme = useSystemColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    storage.readJson<Settings>(StorageKeys.settings, DEFAULT_SETTINGS).then((stored) => {
      if (!mounted) return;
      // Merge so keys added in later versions get their defaults.
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void storage.writeJson(StorageKeys.settings, next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void storage.writeJson(StorageKeys.settings, DEFAULT_SETTINGS);
  }, []);

  const startTrial = useCallback(() => {
    update({ premium: true, trialEndsAt: Date.now() + TRIAL_DAYS * 86_400_000 });
  }, [update]);

  const setPremium = useCallback((premium: boolean) => {
    update({ premium, trialEndsAt: null });
  }, [update]);

  const colorScheme: 'light' | 'dark' =
    settings.colorScheme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.colorScheme;

  useEffect(() => {
    configureHaptics(settings.hapticsEnabled, settings.hapticStrength);
  }, [settings.hapticsEnabled, settings.hapticStrength]);

  const trialDaysLeft = useMemo(() => {
    if (!settings.premium || !settings.trialEndsAt || now === 0) return null;
    const left = Math.ceil((settings.trialEndsAt - now) / DAY_MS);
    return Math.max(0, left);
  }, [settings.premium, settings.trialEndsAt, now]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, colorScheme, ready, update, resetSettings, startTrial, setPremium, trialDaysLeft }),
    [settings, colorScheme, ready, update, resetSettings, startTrial, setPremium, trialDaysLeft]
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider colorScheme={colorScheme} accent={settings.accent}>
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}

/** Convenience hook: settings plus the resolved theme. */
export function useThemedSettings() {
  const settings = useSettings();
  const theme = useTheme();
  return { ...settings, theme };
}
