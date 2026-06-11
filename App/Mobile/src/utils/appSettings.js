/**
 * Preferencias de la app (persisten tras cerrar sesión).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@champion_app_settings';
const LEGACY_THEME_KEY = '@champion_theme';

const defaults = {
  notificationsEnabled: true,
};

/**
 * @returns {Promise<{ notificationsEnabled: boolean }>}
 */
export async function getAppSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { darkMode: _removed, ...rest } = parsed;
      return { ...defaults, ...rest };
    }

    // Limpiar clave legacy del toggle de tema en login (ya no se usa).
    await AsyncStorage.removeItem(LEGACY_THEME_KEY);

    return { ...defaults };
  } catch {
    return { ...defaults };
  }
}

/**
 * @param {Partial<{ notificationsEnabled: boolean }>} partial
 */
export async function setAppSettings(partial) {
  const prev = await getAppSettings();
  const { darkMode: _removed, ...rest } = partial;
  const next = { ...prev, ...rest };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
