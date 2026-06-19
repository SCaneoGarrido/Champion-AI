/**
 * Hook que gestiona el ciclo completo de grabación STT con carga por chunks:
 * idle → initializing → recording → processing → accepted | error
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { initSTTJob, uploadBlobInChunks, submitSTTJob } from '../utils/speechApi';

const FORMAT = 'm4a';
const SAMPLE_RATE = 44100;

/**
 * @param {{ locale?: string, localeName?: string }} [opts]
 */
export function useLiveSTTRecorder({ locale = 'es-AR', localeName = 'Spanish (Argentina)' } = {}) {
    const [status, setStatus] = useState('idle');       // idle|initializing|recording|processing|accepted|error
    const [step, setStep] = useState('');               // descripción del paso actual
    const [error, setError] = useState('');
    const [jobResult, setJobResult] = useState(null);   // respuesta de /SpeechToTextv2
    const [acceptedJobId, setAcceptedJobId] = useState(null); // job_id disponible al aceptarse
    const [uploadProgress, setUploadProgress] = useState(null); // { blocks, total, uploaded, fileSize }
    const [elapsed, setElapsed] = useState(0);          // segundos grabados

    const ctxRef = useRef(null);   // { recording, jobId, uploadUrl, blobName }
    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // Limpieza si el componente se desmonta mientras graba
    useEffect(() => {
        return () => {
            clearTimer();
            ctxRef.current?.recording?.stopAndUnloadAsync().catch(() => {});
        };
    }, []);

    const start = useCallback(async () => {
        clearTimer();
        setError('');
        setJobResult(null);
        setUploadProgress(null);
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

            // Temporizador de duración visible
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

    const stop = useCallback(async () => {
        clearTimer();

        const ctx = ctxRef.current;
        if (!ctx) {
            setStatus('idle');
            return;
        }
        const { recording, jobId, uploadUrl, blobName } = ctx; // extraer antes de nullear
        ctxRef.current = null;

        setStatus('processing');

        try {
            // 3. Detener grabación y obtener URI del archivo
            setStep('Deteniendo grabación...');
            const statusBefore = await recording.getStatusAsync();
            const durationMs = statusBefore.durationMillis || 0;
            await recording.stopAndUnloadAsync();
            const fileUri = recording.getURI();
            if (!fileUri) throw new Error('No se obtuvo el archivo de audio.');
            const durationSeconds = Math.max(durationMs / 1000, 1);

            // 4. Subir a Azure Blob Storage por bloques
            setStep('Subiendo audio...');
            setUploadProgress({ blocks: 0, total: 1, uploaded: 0, fileSize: 0 });

            const blobUrl = await uploadBlobInChunks(uploadUrl, fileUri, (prog) => {
                setUploadProgress(prog);
                setStep(`Subiendo bloque ${prog.blocks}/${prog.total}...`);
            });

            // 5. Enviar job a /SpeechToTextv2
            setStep('Enviando a procesar...');
            const result = await submitSTTJob({
                jobId,
                blobUrl,
                blobName,
                format: FORMAT,
                sampleRate: SAMPLE_RATE,
                durationSeconds,
                locale,
                localeName,
            });

            setJobResult(result?.data ?? result);
            setAcceptedJobId(jobId);
            setStatus('accepted');
            setStep('');
        } catch (e) {
            setStatus('error');
            setError(e.message || 'Error al procesar el audio.');
        }
    }, [locale, localeName]);

    const reset = useCallback(() => {
        clearTimer();
        ctxRef.current?.recording?.stopAndUnloadAsync().catch(() => {});
        ctxRef.current = null;
        setStatus('idle');
        setError('');
        setJobResult(null);
        setAcceptedJobId(null);
        setUploadProgress(null);
        setElapsed(0);
        setStep('');
    }, []);

    return { status, step, error, jobResult, acceptedJobId, uploadProgress, elapsed, start, stop, reset };
}
