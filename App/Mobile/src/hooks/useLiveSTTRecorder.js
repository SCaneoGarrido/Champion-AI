/**
 * Hook que gestiona la grabación STT en vivo:
 * idle → initializing → recording → processing (deteniendo mic) → confirming → idle
 *
 * A partir de 'confirming' el audio ya está en disco local — el upload real
 * (uploadBlobInChunks + submitSTTJob) NO ocurre acá: se delega a
 * UploadManagerContext vía confirmAndUpload(name), que sigue corriendo aunque
 * este componente se desmonte (ej. el usuario navega a otra pantalla).
 * Ver ADR-012.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { deleteAsync } from 'expo-file-system/legacy';
import { initSTTJob } from '../utils/speechApi';
import { useUploadManager } from '../context/UploadManagerContext';

const FORMAT = 'm4a';
const SAMPLE_RATE = 44100;

/**
 * @param {{ locale?: string, localeName?: string }} [opts]
 */
export function useLiveSTTRecorder({ locale = 'es-AR', localeName = 'Spanish (Argentina)' } = {}) {
    const [status, setStatus] = useState('idle'); // idle|initializing|recording|processing|confirming|error
    const [step, setStep] = useState('');
    const [error, setError] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [pendingRecording, setPendingRecording] = useState(null); // { fileUri, durationSeconds }

    const ctxRef = useRef(null);   // { recording, jobId, uploadUrl, blobName }
    const timerRef = useRef(null);
    const { startUpload } = useUploadManager();

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // Limpieza si el componente se desmonta mientras graba (no afecta un
    // upload ya delegado — ese vive en UploadManagerContext, fuera de acá).
    useEffect(() => {
        return () => {
            clearTimer();
            ctxRef.current?.recording?.stopAndUnloadAsync().catch(() => {});
        };
    }, []);

    const start = useCallback(async () => {
        clearTimer();
        setError('');
        setPendingRecording(null);
        setElapsed(0);
        setStatus('initializing');
        setStep('Preparando job...');

        // 1. Llamar a /init para obtener SAS URL y job_id
        let initData;
        try {
            initData = await initSTTJob(FORMAT);
        } catch (e) {
            setStatus('error');
            setError(e.message || 'Error al inicializar el job.');
            return;
        }

        // 2. Pedir permiso de micrófono y comenzar grabación
        try {
            const { status: perm } = await Audio.requestPermissionsAsync();
            if (perm !== 'granted') {
                setStatus('error');
                setError('Se necesita permiso de micrófono.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            ctxRef.current = {
                recording,
                jobId: initData.job_id,
                uploadUrl: initData.upload_url,
                blobName: initData.blob_name,
            };

            const startTs = Date.now();
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTs) / 1000));
            }, 1000);

            setStatus('recording');
            setStep('Grabando...');
        } catch (e) {
            setStatus('error');
            setError(e.message || 'No se pudo iniciar la grabación.');
        }
    }, []);

    /** Detiene el micrófono y deja el audio listo, a la espera de confirmación. */
    const stopRecording = useCallback(async () => {
        clearTimer();

        const ctx = ctxRef.current;
        if (!ctx) {
            setStatus('idle');
            return;
        }
        const { recording, jobId, uploadUrl, blobName } = ctx;
        ctxRef.current = null;

        setStatus('processing');
        setStep('Deteniendo grabación...');

        try {
            const statusBefore = await recording.getStatusAsync();
            const durationMs = statusBefore.durationMillis || 0;
            await recording.stopAndUnloadAsync();
            const fileUri = recording.getURI();
            if (!fileUri) throw new Error('No se obtuvo el archivo de audio.');
            const durationSeconds = Math.max(durationMs / 1000, 1);

            setPendingRecording({ fileUri, durationSeconds, jobId, uploadUrl, blobName });
            setStatus('confirming');
            setStep('');
        } catch (e) {
            setStatus('error');
            setError(e.message || 'Error al detener la grabación.');
        }
    }, []);

    /** Usuario confirmó nombre + subida — se delega a UploadManagerContext. */
    const confirmAndUpload = useCallback((name) => {
        if (!pendingRecording) return;
        startUpload({
            name,
            fileUri: pendingRecording.fileUri,
            jobId: pendingRecording.jobId,
            uploadUrl: pendingRecording.uploadUrl,
            blobName: pendingRecording.blobName,
            format: FORMAT,
            sampleRate: SAMPLE_RATE,
            durationSeconds: pendingRecording.durationSeconds,
            locale,
            localeName,
        });
        setPendingRecording(null);
        setStatus('idle');
    }, [pendingRecording, startUpload, locale, localeName]);

    /** Usuario descartó la grabación — no se sube nada. */
    const discardRecording = useCallback(() => {
        if (pendingRecording?.fileUri) {
            deleteAsync(pendingRecording.fileUri, { idempotent: true }).catch(() => {});
        }
        setPendingRecording(null);
        setStatus('idle');
    }, [pendingRecording]);

    const reset = useCallback(() => {
        clearTimer();
        ctxRef.current?.recording?.stopAndUnloadAsync().catch(() => {});
        ctxRef.current = null;
        setStatus('idle');
        setError('');
        setPendingRecording(null);
        setElapsed(0);
        setStep('');
    }, []);

    return {
        status, step, error, elapsed, pendingRecording,
        start, stopRecording, confirmAndUpload, discardRecording, reset,
    };
}
