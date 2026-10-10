import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'shake:v1:';

export const StorageKeys = {
  settings: `${PREFIX}settings`,
  alarms: `${PREFIX}alarms`,
  reminders: `${PREFIX}reminders`,
  dismissLog: `${PREFIX}dismissLog`,
  servedOccurrences: `${PREFIX}servedOccurrences`,
  seeded: `${PREFIX}seeded`,
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] failed to read ${key}`, error);
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] failed to write ${key}`, error);
  }
}

export const storage = {
  readJson,
  writeJson,
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[storage] failed to remove ${key}`, error);
    }
  },
  /** Test/demo helper: wipes every key this app owns. */
  async clearAll() {
    const keys = Object.values(StorageKeys);
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.warn('[storage] failed to clear', error);
    }
  },
};

export function createId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
