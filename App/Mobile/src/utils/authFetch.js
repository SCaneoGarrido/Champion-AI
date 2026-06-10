/**
 * fetch con Authorization: Bearer <JWT> usando la sesión guardada.
 * Para FormData no fuerza Content-Type (el runtime añade boundary).
 */
import { API_BASE_URL } from '../config';
import { getSession, getAccessTokenFromSession } from './session';

function resolveUrl(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  const path = input.startsWith('/') ? input : `/${input}`;
  return `${API_BASE_URL}${path}`;
}

/**
 * @param {string} input - URL absoluta o ruta relativa a API_BASE_URL (ej. /AIServices/Speechv2/init)
 * @param {RequestInit} [init]
 */
export async function authenticatedFetch(input, init = {}) {
  const session = await getSession();
  const token = getAccessTokenFromSession(session);

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const body = init.body;
  const isFormData =
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (body && typeof body === 'object' && typeof body.append === 'function');

  if (!isFormData && body != null && typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (isFormData && headers.has('Content-Type')) {
    headers.delete('Content-Type');
  }

  const url = resolveUrl(input);

  return fetch(url, {
    ...init,
    headers,
  });
}

export { API_BASE_URL };
