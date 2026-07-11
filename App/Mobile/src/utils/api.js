/**
 * api.js – Llamadas al backend (Node/Express) para autenticación.
 *
 * Usa las URLs definidas en src/config.js. Las pantallas Login y SignUp
 * consumen login() y register() respectivamente.
 */
import { config } from '../config';

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Normaliza formatos actuales y legacy del login de la API. */
function normalizeLoginResponse(data) {
  const inner = data?.data ?? {};
  const accessToken =
    data?.access_token ?? inner?.jwt ?? inner?.access_token ?? null;
  const refreshToken =
    data?.refresh_token ?? inner?.refresh_token ?? null;
  const userId =
    inner?.user_id ?? data?.user_id ?? decodeJwtPayload(accessToken)?.id ?? null;

  return {
    success: Boolean(data?.success),
    user_id: userId,
    accessToken,
    refreshToken,
    error: data?.error ?? null,
  };
}

/**
 * Inicia sesión con email y contraseña.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{
 *   ok: boolean,
 *   success: boolean,
 *   user_id: string | null,
 *   accessToken: string | null,
 *   refreshToken: string | null,
 *   data: object,
 *   error?: { message?: string }
 * }>}
 */
export async function login(email, password) {
  console.log('Realizando login hacia: ' + config.login.url);
  const res = await fetch(config.login.url, {
    method: config.login.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  const normalized = normalizeLoginResponse(data);

  if (!res.ok && !normalized.error?.message) {
    normalized.error = { message: `HTTP ${res.status} en login` };
  }

  return {
    ok: res.ok,
    success: res.ok && normalized.success,
    user_id: normalized.user_id,
    accessToken: normalized.accessToken,
    refreshToken: normalized.refreshToken,
    data,
    error: normalized.error ?? undefined,
  };
}

/**
 * Registra un usuario (nombre, email, contraseña, etc.).
 * @param {object} body - Objeto con los campos que espera la API (ej. name, email, password).
 * @returns {Promise<{ ok: boolean, data: object }>}
 */
export async function register(body) {
  const res = await fetch(config.register.url, {
    method: config.register.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data?.error?.message) {
    data.error = { message: `HTTP ${res.status} en registro` };
  }
  return { ok: res.ok, data };
}

// ─── Perfil de usuario ────────────────────────────────────────────────────────

import { authenticatedFetch } from './authFetch';

export async function getUserProfile() {
  const res = await authenticatedFetch('/API/USER/me');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data;
}

export async function updateUserProfile(data) {
  const res = await authenticatedFetch('/API/USER/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data;
}

export async function initAvatarUpload(ext = 'jpg') {
  const res = await authenticatedFetch('/API/USER/avatar/init', {
    method: 'POST',
    body: JSON.stringify({ ext }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data; // { upload_url, avatar_url }
}

// ─── Jobs / Estadísticas ──────────────────────────────────────────────────────

export async function getRecentJobs(limit = 20) {
  const res = await authenticatedFetch(`/AIServices/Speechv2/jobs?limit=${limit}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data?.items ?? [];
}

export async function getUserStats() {
  const res = await authenticatedFetch('/AIServices/Speechv2/jobs/stats');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data ?? { total_jobs: 0, completed: 0, total_duration_seconds: 0 };
}

export async function retryJob(jobId) {
  const res = await authenticatedFetch(`/AIServices/Speechv2/jobs/${jobId}/retry`, { method: 'POST' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.code ?? `HTTP ${res.status}`);
  return json.data ?? null;
}

export async function getJobResult(jobId) {
  const res = await authenticatedFetch(`/AIServices/Speechv2/jobs/${jobId}/result`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data ?? null;
}

export async function patchJobName(jobId, name) {
  const res = await authenticatedFetch(`/AIServices/Speechv2/jobs/${jobId}/name`, {
    method: 'PATCH',
    body: JSON.stringify({ blob_name: name }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.data;
}
