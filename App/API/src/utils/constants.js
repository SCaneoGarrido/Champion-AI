const JOBSTATUS = Object.freeze({
    QUEUED:     'queued',
    PROCESSING: 'processing',
    COMPLETED:  'completed',
    FAILED:     'failed'
});

const STT_LIVE_RECORDING_STEPS = Object.freeze({
    TRANSCRIPTION:  "transcription",
    SUMMARY:        "summary",
    NOTES:          "notes",
    MIND_MAP:       "mind_map"
});

const JOB_ACTOR_TYPES = Object.freeze({
  USER: 'user',
  SYSTEM: 'system',
  BACKEND: 'backend',
  AZURE_FUNCTION: 'azure_function',
  WORKER: 'worker'
});

const JOB_MESSAGES = Object.freeze({
  JOB_CREATED: 'Job creado y enviado a cola',
  JOB_QUEUED: 'Job encolado correctamente',
  
  TRANSCRIPTION_STARTED: 'Iniciando transcripción',
  TRANSCRIPTION_COMPLETED: 'Transcripción completada',

  SUMMARY_STARTED: 'Generando resumen',
  SUMMARY_COMPLETED: 'Resumen generado correctamente',

  NOTES_STARTED: 'Generando apuntes',
  NOTES_COMPLETED: 'Apuntes generados correctamente',

  MINDMAP_STARTED: 'Generando mapa mental',
  MINDMAP_COMPLETED: 'Mapa mental generado correctamente',

  JOB_COMPLETED: 'Job completado exitosamente',

  JOB_AUDIO_UPLOADED: 'Audio cargado correctamente',
  QUEUE_FAILED: 'Error enviando job a la cola',
  AUDIO_UPLOAD_FAILED: 'Error en carga de audio',
  STT_FAILED: 'Error en transcripción',
  SUMMARY_FAILED: 'Error generando resumen',
  NOTES_FAILED: 'Error generando apuntes',
  MINDMAP_FAILED: 'Error generando mapa mental',

  UNKNOWN_ERROR: 'Error interno desconocido'
});

const UPLOAD_STATUS = Object.freeze({
  UPLOADED: 'uploaded',
  FAILED: 'failed'
});

module.exports = {
  JOBSTATUS,
  STT_LIVE_RECORDING_STEPS,
  JOB_ACTOR_TYPES,
  JOB_MESSAGES,
  UPLOAD_STATUS
};
