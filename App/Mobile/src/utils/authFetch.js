/**
 * fetch con Authorization: Bearer <JWT> usando la sesión guardada.
 * Si la API responde 401 TOKEN_EXPIRED, intenta renovar el access token con el
 * refresh token y reintenta la petición original de forma transparente.
 * Si el refresh también falla (refresh token expirado), limpia la sesión y
 * llama al handler registrado con setSessionExpiredHandler (típicamente redirige al Login).
 *
 * Para FormData no fuerza Content-Type (el runtime añade boundary).
 */
import { API_BASE_URL } from '../config';
import {
  getSession,
  setSession,
  clearSession,
  getAccessTokenFromSession,
  getRefreshTokenFromSession,
} from './session';

// Handler global para sesión expirada (registrado desde App.jsx)
let _onSessionExpired = null;
export function setSessionExpiredHandler(fn) {
  _onSessionExpired = fn;
}

// Mutex: si ya hay un refresh en curso, todas las peticiones comparten el mismo Promise
let _refreshPromise = null;

async function attemptTokenRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const session = await getSession();
      const refreshToken = getRefreshTokenFromSession(session);
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/API/v1/AUTH/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json().catch(() => null);
      const newAccessToken = data?.data?.access_token ?? null;
      if (!newAccessToken) return null;

      await setSession({ accessToken: newAccessToken });
      return newAccessToken;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

function resolveUrl(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  const path = input.startsWith('/') ? input : `/${input}`;
  return `${API_BASE_URL}${path}`;
}

function buildHeaders(init, token, isFormData) {
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const body = init.body;
  if (!isFormData && body != null && typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (isFormData && headers.has('Content-Type')) {
    headers.delete('Content-Type');
  }
  return headers;
}

/**
 * @param {string} input - URL absoluta o ruta relativa a API_BASE_URL
 * @param {RequestInit} [init]
 */
export async function authenticatedFetch(input, init = {}) {
  const session = await getSession();
  const token = getAccessTokenFromSession(session);

  const body = init.body;
  const isFormData =
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (body && typeof body === 'object' && typeof body.append === 'function');

  const url = resolveUrl(input);
  let res = await fetch(url, { ...init, headers: buildHeaders(init, token, isFormData) });

  // Detectar token expirado y reintentar con token renovado
  if (res.status === 401) {
    let json = null;
    try { json = await res.clone().json(); } catch { /* ignorar */ }

    if (json?.error?.code === 'TOKEN_EXPIRED') {
      const newToken = await attemptTokenRefresh();

      if (!newToken) {
        await clearSession();
        _onSessionExpired?.();
        return res;
      }

      res = await fetch(url, { ...init, headers: buildHeaders(init, newToken, isFormData) });
    }
  }

  return res;
}

export { API_BASE_URL };
