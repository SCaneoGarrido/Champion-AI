/**
 * Sesión persistente (AsyncStorage): user_id, accessToken (JWT), refreshToken.
 * Misma clave que antes (@champion_user) para no duplicar datos.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_KEY = '@champion_user';

/**
 * @returns {Promise<{
 *   user_id?: string,
 *   accessToken?: string,
 *   jwt?: string,
 *   refreshToken?: string,
 *   refresh_token?: string,
 *   email?: string,
 *   name?: string,
 *   phone?: string,
 *   location?: string,
 *   occupation?: string,
 *   avatarUri?: string | null
 * } | null>}
 */
export async function getSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setSession(partial) {
  const prev = (await getSession()) || {};
  const next = { ...prev, ...partial };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** JWT para Authorization (compat con accessToken o jwt). */
export function getAccessTokenFromSession(session) {
  if (!session) return null;
  return session.accessToken ?? session.jwt ?? null;
}
