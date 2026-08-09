/**
 * API STT v2: init (SAS) → carga por bloques → submit.
 * Todas las peticiones usan authenticatedFetch (Bearer).
 */
import {
    getInfoAsync,
    readAsStringAsync,
    writeAsStringAsync,
    deleteAsync,
    cacheDirectory,
    EncodingType,
    uploadAsync,
} from 'expo-file-system/legacy';
import { authenticatedFetch } from './authFetch';
import { getSession } from './session';

const SPEECH_BASE = '/API/v1/AIServices/Speechv2';
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB por bloque

// ─── helpers internos ────────────────────────────────────────────────────────

function toBlockId(index) {
    return btoa(String(index).padStart(8, '0'));
}

// ─── Idiomas disponibles ─────────────────────────────────────────────────────

/**
 * Obtiene la lista de idiomas soportados por STT.
 * Normaliza el shape PascalCase del backend { Locale, LocalName } → { locale, locale_name }.
 * @returns {Promise<Array<{locale: string, locale_name: string}>>}
 */
export async function getSTTLanguages() {
    const res = await authenticatedFetch(`${SPEECH_BASE}/getAvailableLenguages`, { method: 'GET' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || `Error al obtener idiomas (${res.status})`);
    }
    const raw = json.data?.items ?? json.data ?? [];
    return raw.map(item => ({
        locale: item.Locale ?? item.locale ?? '',
        locale_name: item.LocalName ?? item.locale_name ?? item.localeName ?? item.Locale ?? '',
    })).filter(item => item.locale);
}

// ─── Nuevo flujo (LiveSTTRecorder) ──────────────────────────────────────────

/**
 * Llama a /init y devuelve { job_id, upload_url, blob_name }.
 */
export async function initSTTJob(format = 'm4a') {
    const res = await authenticatedFetch(`${SPEECH_BASE}/init`, {
        method: 'POST',
        body: JSON.stringify({ req_info: { audio: { format } } }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || `Error al inicializar STT (${res.status})`);
    }
    const { job_id, upload_url, blob_name } = json.data || {};
    if (!job_id || !upload_url) throw new Error('Respuesta de init incompleta (job_id / upload_url).');
    return { job_id, upload_url, blob_name };
}

/**
 * Sube fileUri a Azure Blob Storage usando Block Blob staged upload.
 * Divide el archivo en bloques de CHUNK_SIZE, sube cada uno via PUT ?comp=block,
 * luego confirma con PUT ?comp=blocklist.
 *
 * @param {string} sasUrl   URL con SAS token devuelta por /init
 * @param {string} fileUri  URI local del archivo grabado
 * @param {(p:{blocks:number,total:number,uploaded:number,fileSize:number}) => void} [onProgress]
 * @returns {Promise<string>} URL permanente del blob (sin SAS query string)
 */
export async function uploadBlobInChunks(sasUrl, fileUri, onProgress) {
    const info = await getInfoAsync(fileUri, { size: true });
    if (!info.exists) throw new Error('Archivo de audio no encontrado.');
    const fileSize = info.size ?? 0;
    if (fileSize === 0) throw new Error('El archivo de audio está vacío.');

    const [baseUrl, sasQuery] = sasUrl.split('?');
    const blockIds = [];
    let offset = 0;
    let blockIndex = 0;
    const totalBlocks = Math.ceil(fileSize / CHUNK_SIZE);

    while (offset < fileSize) {
        const chunkSize = Math.min(CHUNK_SIZE, fileSize - offset);
        const id = toBlockId(blockIndex);
        blockIds.push(id);

        // Leer chunk como base64 desde el archivo local (lectura parcial)
        const base64 = await readAsStringAsync(fileUri, {
            encoding: EncodingType.Base64,
            position: offset,
            length: chunkSize,
        });

        // Escribir chunk en archivo temporal para subirlo como binario
        const tempUri = `${cacheDirectory}stt_block_${blockIndex}.tmp`;
        await writeAsStringAsync(tempUri, base64, { encoding: EncodingType.Base64 });

        // PUT bloque a Azure Block Blob
        const blockUrl = `${baseUrl}?comp=block&blockid=${encodeURIComponent(id)}&${sasQuery}`;
        let result;
        try {
            result = await uploadAsync(blockUrl, tempUri, {
                httpMethod: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'x-ms-blob-type': 'BlockBlob',
                    'x-ms-version': '2020-04-08',
                },
            });
        } finally {
            await deleteAsync(tempUri, { idempotent: true });
        }

        if (result.status < 200 || result.status >= 300) {
            throw new Error(`Error subiendo bloque ${blockIndex}: HTTP ${result.status}`);
        }

        blockIndex++;
        offset += chunkSize;
        onProgress?.({ blocks: blockIndex, total: totalBlocks, uploaded: offset, fileSize });
    }

    // Confirmar lista de bloques en Azure
    const blockListXml = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<BlockList>',
        ...blockIds.map(id => `<Latest>${id}</Latest>`),
        '</BlockList>',
    ].join('');

    const commitUrl = `${baseUrl}?comp=blocklist&${sasQuery}`;
    const commitRes = await fetch(commitUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml', 'x-ms-version': '2020-04-08' },
        body: blockListXml,
    });

    if (!commitRes.ok) {
        const errText = await commitRes.text().catch(() => '');
        throw new Error(`Error al confirmar bloques: HTTP ${commitRes.status} ${errText}`);
    }

    return baseUrl; // URL permanente del blob (sin SAS)
}

/**
 * Envía el job a /SpeechToTextv2 una vez el blob está subido.
 */
export async function submitSTTJob({
    jobId,
    blobUrl,
    blobName,
    format = 'm4a',
    sampleRate = 44100,
    durationSeconds,
    locale = 'es-AR',
    localeName = null,
}) {
    const res = await authenticatedFetch(`${SPEECH_BASE}/SpeechToTextv2`, {
        method: 'POST',
        body: JSON.stringify({
            req_info: {
                job_id: jobId,
                service: 'STT',
                feature: 'LIVE_RECORDING',
                flow: 'stt_live_recording',
                language_info: { locale, locale_name: localeName },
            },
            audio_info: {
                format,
                sample_rate: sampleRate,
                duration_seconds: Math.min(Math.max(durationSeconds, 1), 10800),
                blob_url: blobUrl,
                blob_name: blobName ?? null,
            },
        }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.error?.message || `Error al enviar job (${res.status})`);
    }
    return json;
}

// ─── Flujo legado (AudioFileUploader) ───────────────────────────────────────

/**
 * @param {{ fileUri:string, durationSeconds:number, format?:string, sampleRate?:number, locale?:string, localeName?:string }} p
 */
export async function submitRecordingToSpeechPipeline({
    fileUri,
    durationSeconds,
    format = 'm4a',
    sampleRate = 44100,
    locale = 'es-AR',
    localeName = null,
}) {
    const initRes = await authenticatedFetch(`${SPEECH_BASE}/init`, {
        method: 'POST',
        body: JSON.stringify({ req_info: { audio: { format } } }),
    });
    const initJson = await initRes.json().catch(() => ({}));
    if (!initRes.ok || !initJson.success) {
        const err = initJson?.error;
        throw new Error((typeof err === 'string' ? err : err?.message) || `Error init STT (${initRes.status})`);
    }

    const { job_id: jobId, upload_url: uploadUrl } = initJson.data || {};
    if (!uploadUrl || !jobId) throw new Error('Respuesta init incompleta (upload_url / job_id).');

    const uploadResult = await uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'PUT',
        headers: {
            'x-ms-blob-type': 'BlockBlob',
            'Content-Type': format === 'm4a' ? 'audio/m4a' : 'application/octet-stream',
        },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Error subiendo audio (${uploadResult.status}).`);
    }

    const publicBlobUrl = uploadUrl.split('?')[0];

    const submitRes = await authenticatedFetch(`${SPEECH_BASE}/SpeechToTextv2`, {
        method: 'POST',
        body: JSON.stringify({
            req_info: {
                job_id: jobId,
                service: 'STT',
                feature: 'FILE_UPLOAD',
                flow: 'stt_file_upload',
                language_info: { locale, locale_name: localeName },
            },
            audio_info: {
                format,
                sample_rate: sampleRate,
                duration_seconds: Math.min(Math.max(durationSeconds, 1), 10800),
                blob_url: publicBlobUrl,
                blob_name: null,
            },
        }),
    });

    const submitJson = await submitRes.json().catch(() => ({}));
    if (!submitRes.ok) throw new Error(submitJson?.error?.message || `Error SpeechToTextv2 (${submitRes.status})`);
    return submitJson;
}
