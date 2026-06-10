/**
 * Preferencias de la app (persisten tras cerrar sesión).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@champion_app_settings';

const defaults = {
  notificationsEnabled: true,
  darkMode: false,
};

/**
 * @returns {Promise<{ notificationsEnabled: boolean, darkMode: boolean }>}
 */
export async function getAppSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

/**
 * @param {Partial<{ notificationsEnabled: boolean, darkMode: boolean }>} partial
 */
export async function setAppSettings(partial) {
  const prev = await getAppSettings();
  const next = { ...prev, ...partial };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
