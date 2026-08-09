/**
 * config.js – Configuración de la API (backend Node/Express).
 *
 * - API_BASE_URL: base de la API. El servidor usa PORT del .env o 5051 por defecto.
 *   En Expo Go con dispositivo físico, en el móvil "localhost" es el propio teléfono.
 *   Para conectar al PC, crear en App/Mobile un .env con:
 *   EXPO_PUBLIC_API_URL=http://TU_IP:5000
 * - config: rutas y métodos para login y registro usados por src/utils/api.js.
 */
export const API_BASE_URL =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
    : 'http://100.84.11.35:5000';

export const config = {
  login: {
    url: `${API_BASE_URL}/API/v1/AUTH/login`,
    method: 'POST',
  },
  register: {
    url: `${API_BASE_URL}/API/v1/AUTH/register`,
    method: 'POST',
  },
};
