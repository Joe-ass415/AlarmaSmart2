import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { DAY_MS } from '../core/date';
import { auth, db } from '../core/firebase';
import { configureHaptics } from '../core/haptics';
import { StorageKeys, storage } from '../core/storage';
import { DEFAULT_SETTINGS, type Settings } from '../core/types';
import { useNow } from '../hooks/useNow';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

const TRIAL_DAYS = 7;

type SettingsContextValue = {
  settings: Settings;
  /** Resolved from `colorScheme: 'system'`. */
  colorScheme: 'light' | 'dark';
  ready: boolean;
  currentUser: User | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 1. Cargar configuración local guardada
  useEffect(() => {
    let mounted = true;
    storage.readJson<Settings>(StorageKeys.settings, DEFAULT_SETTINGS).then((stored) => {
      if (!mounted) return;
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Escuchar sesión de Firebase Auth y sincronizar Firestore en tiempo real
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.isPremium === 'boolean') {
              setSettings((current) => {
                const next = { ...current, premium: data.isPremium };
                void storage.writeJson(StorageKeys.settings, next);
                return next;
              });
            }
          }
        });
        return () => unsubscribeDoc();
      }
    });

    return () => unsubscribeAuth();
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

  // 3. Modificar setPremium para guardar en storage local Y en Firebase Firestore
  const setPremium = useCallback(
    (premium: boolean) => {
      update({ premium, trialEndsAt: null });

      // Si hay un usuario autenticado, guardar en Firestore
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        void setDoc(
          userRef,
          { isPremium: premium, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    },
    [update]
  );

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
    () => ({
      settings,
      colorScheme,
      ready,
      currentUser,
      update,
      resetSettings,
      startTrial,
      setPremium,
      trialDaysLeft,
    }),
    [settings, colorScheme, ready, currentUser, update, resetSettings, startTrial, setPremium, trialDaysLeft]
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