/**
 * Flujo STT v2: init (SAS) → subida a blob → SpeechToTextv2.
 * Todas las peticiones usan authenticatedFetch (Bearer).
 */
import { uploadAsync } from 'expo-file-system/legacy';
import { authenticatedFetch } from './authFetch';
import { getSession } from './session';

const SPEECH_BASE = '/AIServices/Speechv2';

/**
 * @param {object} p
 * @param {string} p.fileUri - URI local del archivo grabado (expo-av)
 * @param {number} p.durationSeconds
 * @param {string} [p.format] - ej. m4a
 * @param {number} [p.sampleRate] - ej. 44100
 */
export async function submitRecordingToSpeechPipeline({
  fileUri,
  durationSeconds,
  format = 'm4a',
  sampleRate = 44100,
}) {
  const session = await getSession();
  const userId = session?.user_id;
  if (!userId) {
    throw new Error('No hay sesión. Inicia sesión de nuevo.');
  }

  const initRes = await authenticatedFetch(`${SPEECH_BASE}/init`, {
    method: 'POST',
    body: JSON.stringify({
      user_info: { user_id: userId },
      req_info: { audio: { format } },
    }),
  });

  const initJson = await initRes.json().catch(() => ({}));
  if (!initRes.ok || !initJson.success) {
    const err = initJson?.error;
    const msg =
      (typeof err === 'string' ? err : err?.message) ||
      `Error init STT (${initRes.status})`;
    throw new Error(msg);
  }

  const { job_id: jobId, upload_url: uploadUrl, blob_url: blobUrl } = initJson.data || {};
  if (!uploadUrl || !jobId) {
    throw new Error('Respuesta init incompleta (upload_url / job_id).');
  }

  const uploadResult = await uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': format === 'm4a' ? 'audio/m4a' : 'application/octet-stream',
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Error subiendo audio al almacenamiento (${uploadResult.status}).`);
  }

  const publicBlobUrl = blobUrl || uploadUrl.split('?')[0];

  const submitRes = await authenticatedFetch(`${SPEECH_BASE}/SpeechToTextv2`, {
    method: 'POST',
    body: JSON.stringify({
      user_info: { user_id: userId },
      req_info: {
        job_id: jobId,
        flow: 'stt',
        audio: {
          format,
          sample_rate: sampleRate,
          duration_seconds: Math.min(Math.max(durationSeconds, 1), 10800),
          blob_url: publicBlobUrl,
        },
      },
    }),
  });

  const submitJson = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok) {
    const msg = submitJson?.error?.message || `Error SpeechToTextv2 (${submitRes.status})`;
    throw new Error(msg);
  }

  return submitJson;
}
