# Champion AI — Azure Function (Procesamiento)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Responsabilidad de este componente

La Azure Function es el **procesador** del sistema. Se activa automáticamente cuando la API publica un mensaje en la queue.

**Procesa. No orquesta entre componentes. No llama a la API.**

## Lenguaje y modelo de ejecución

**Python**. El pipeline usa **Azure Durable Functions** con el patrón Orchestrator + Activities.

## Estructura de archivos

```
procesamiento/
  function_app.py              ← punto de entrada — registra todos los blueprints
  config.py                    ← variables de entorno
  requirements.txt

  orchestrators/
    stt_live_recording.py      ← orquestador Durable (solo flujo, sin I/O)

  activities/                  ← un archivo por dominio funcional
    context_activity.py        ← check_and_get_context, set_job_status
    transcription_activity.py  ← transcribe_audio
    ai_activity.py             ← generate_summary, generate_notes, generate_mind_map
    completion_activity.py     ← complete_job_activity

  trigger/
    queue_trigger.py           ← Queue trigger → arranca stt_live_recording

  shared/
    database/
      db_client.py             ← pool de conexiones PostgreSQL
      job_repository.py        ← wrappers para SPs y SQL functions
    services/
      blob_service.py          ← descarga de audio desde Azure Blob
      speech_service.py        ← transcripción via Fast Transcription REST API
      openai_service.py        ← resumen, notas, mapa mental via OpenAI
    utils/
      constants.py             ← JobStatus, ProcessingStep, ErrorCode, ACTOR_TYPE
      __init__.py              ← validate_job_payload

  prompts/                     ← prompts de Azure OpenAI
    system.md                  ← system prompt de Champion AI
    summary.md
    notes.md
    notes_json.md
    mind_map.md
```

## Trigger

```
Queue:   championaiqueue
Mensaje: { "job_id": "..." }
```

La Function recibe solo el `job_id`. El contexto completo lo obtiene de PostgreSQL (paso 2).

## Flujo de ejecución completo

El pipeline corre como Durable Function `stt_live_recording`. Cada paso es una activity independiente.

```
[Queue: { job_id }]
        │
        ▼ queue_trigger.py → client.start_new("stt_live_recording", instance_id=job_id)
        │
        ▼ ORCHESTRATOR: stt_live_recording
        │
        ▼ ACTIVITY: check_and_get_context(job_id)
   ┌─────────────────────────────┐
   │ can_process = false?        │──► return (silencioso — redelivery)
   └─────────────────────────────┘
        │ can_process = true → job_context = { blob_url, audio_format, language_locale }
        │
        ▼ ACTIVITY: set_job_status → processing / transcription
        │
        ▼ ACTIVITY: transcribe_audio(blob_url, audio_format, language_locale)
        │   Blob Storage → bytes (formato original) → Fast Transcription REST API → transcription_text
        │ error → set_job_status(failed, STT_ENGINE_UNAVAILABLE) → return
        │
        ▼ ACTIVITY: set_job_status → processing / summary
        │
        ▼ ACTIVITY: generate_summary_activity(transcription_text) → summary_text
        │ error → set_job_status(failed, OPENAI_UNAVAILABLE) → return
        │
        ▼ ACTIVITY: set_job_status → processing / notes
        │
        ▼ ACTIVITY: generate_notes_activity(transcription_text) → { notes_text, notes_json }
        │ error → set_job_status(failed, OPENAI_UNAVAILABLE) → return
        │
        ▼ ACTIVITY: set_job_status → processing / mind_map
        │
        ▼ ACTIVITY: generate_mind_map_activity(transcription_text) → mind_map_json
        │ error → set_job_status(failed, OPENAI_UNAVAILABLE) → return
        │
        ▼ ACTIVITY: complete_job_activity (retry x3, intervalo 5s)
            sp_complete_stt_live_recording_job_v1(...)
        │ error → set_job_status(failed, INTERNAL_ERROR)
```

## Regla absoluta de acceso a base de datos

> **La Azure Function NUNCA ejecuta DML directo. Solo puede llamar Stored Procedures o Functions SQL.**

Esta es la restricción más importante del componente. Toda escritura en BD pasa por:

| Función SQL | Cuándo |
|---|---|
| `fn_can_process_ai_job(job_id)` | Paso 1 — guard de idempotencia |
| `fn_get_stt_live_recording_job_context(job_id)` | Paso 2 — obtener contexto + resultados parciales |
| `sp_update_ai_job_status_v1(...)` | Pasos 3, 6, 8, 10 y en errores |
| `sp_save_stt_partial_result_v1(...)` | Tras cada paso de IA exitoso (smart retry) |
| `sp_complete_stt_live_recording_job_v1(...)` | Paso final — guardar resultado completo |

Conexión directa a PostgreSQL en `:5432`. **No pasa por la Champion API.**

## Pipeline planificado (próxima implementación)

El siguiente paso a implementar es **Transcript Cleanup** entre `transcription` y `summary`:

```
transcription → transcript_cleanup → summary → notes → mind_map
```

- Nueva activity: `cleanup_activity.py`
- Nuevo prompt: `prompts/transcript_cleanup.md`
- Step name: `transcript_cleanup`
- Campo en resultado: `transcript_clean_text` (requiere extensión de SP y tabla)
- Smart retry ya soporta el nuevo paso — solo agregar al COALESCE de `sp_save_stt_partial_result_v1`

## Idempotencia

Azure Queue garantiza **at-least-once delivery**: el mismo mensaje puede llegar más de una vez.

La Function lo maneja con defensa en profundidad:

**Primera línea — `fn_can_process_ai_job`:**
- Si el job ya está `completed` o `failed` → detiene el procesamiento silenciosamente
- No lanza error, no registra nada — simplemente descarta el mensaje duplicado

**Segunda línea — SPs con `ON CONFLICT DO UPDATE`:**
- `sp_complete_stt_live_recording_job_v1` usa `ON CONFLICT (recording_id) DO UPDATE` en `stt_recording_result`
- Si llega el resultado dos veces, el segundo intento actualiza con los mismos datos sin error

No se requiere tabla de deduplicación separada.

## Stored Procedures — firmas y cuándo usarlos

### sp_update_ai_job_status_v1

```sql
CALL sp_update_ai_job_status_v1(
  p_job_id         VARCHAR(100),   -- requerido
  p_status         VARCHAR(50),    -- 'processing' | 'failed'
  p_step_name      VARCHAR(100),   -- 'transcription' | 'summary' | 'notes' | 'mind_map'
  p_message        TEXT            DEFAULT NULL,
  p_error_code     VARCHAR(100)    DEFAULT NULL,  -- ej: 'STT_ENGINE_UNAVAILABLE'
  p_error_message  TEXT            DEFAULT NULL,
  p_retryable      BOOLEAN         DEFAULT NULL,
  p_actor_type     VARCHAR(30)     DEFAULT 'azure_function'
)
```

Llamar en:
- Inicio de cada paso → `status='processing'`, `step_name='{paso}'`
- Error en cualquier paso → `status='failed'`, `error_code='{código}'`

### sp_complete_stt_live_recording_job_v1

```sql
CALL sp_complete_stt_live_recording_job_v1(
  p_job_id              VARCHAR(100),
  p_final_status        VARCHAR(50),      -- 'completed'
  p_final_step          VARCHAR(100),     -- 'mind_map'
  p_completion_message  TEXT,
  p_actor_type          VARCHAR(30),      -- 'azure_function'
  p_transcription_text  TEXT,
  p_summary_text        TEXT,
  p_notes_text          TEXT,
  p_notes_json          JSONB,
  p_mind_map_json       JSONB,
  p_raw_result_json     JSONB DEFAULT NULL
)
```

Si `recording_id` no existe para el `job_id` → SP lanza excepción. Esto previene resultados huérfanos.

### fn_can_process_ai_job

```sql
SELECT * FROM fn_can_process_ai_job(p_job_id VARCHAR(100))
-- Devuelve: can_process BOOLEAN, reason TEXT, current_status VARCHAR(50)
```

Siempre llamar como **primer paso**. Si `can_process = false` → no continuar.

### fn_get_stt_live_recording_job_context

```sql
SELECT * FROM fn_get_stt_live_recording_job_context(p_job_id VARCHAR(100))
-- Devuelve: job_id, user_id, service_code, feature_code, flow, status, current_step,
--           recording_id, language_locale, audio_format, sample_rate, duration_seconds,
--           blob_name, blob_url, upload_status, request_payload, job_metadata
```

## Manejo de errores

En cualquier paso que falle, la Function debe:

1. Capturar la excepción
2. Llamar `sp_update_ai_job_status_v1` con `status='failed'` y el `error_code` correspondiente
3. No relanzar el error (el job queda en `failed`, no se reintenta el mensaje)

El job queda con:
- `ai_job.status = 'failed'`
- `ai_job.last_error_code` = código del error
- `ai_job_status_history` con el registro de fallo y `is_current = TRUE`

## Outputs del procesamiento

Todo el resultado se almacena en `stt_recording_result`:

| Campo | Tipo | Contenido |
|---|---|---|
| `transcription_text` | TEXT | Transcripción completa del audio |
| `summary_text` | TEXT | Resumen en formato texto |
| `notes_text` | TEXT | Notas en formato texto |
| `notes_json` | JSONB | Notas estructuradas (estructura no documentada) |
| `mind_map_json` | JSONB | Mapa mental estructurado (estructura no documentada) |
| `raw_result_json` | JSONB | Respuesta cruda de los servicios AI |

**Nota:** La estructura interna de `notes_json` y `mind_map_json` no está documentada en las fuentes disponibles.

## Reglas de desarrollo en este componente

- Nunca ejecutar `INSERT`, `UPDATE` o `DELETE` directamente sobre tablas de BD — siempre via SP
- Nunca llamar a la Champion API — la conexión a PostgreSQL es directa
- Nunca asumir que el mensaje llega exactamente una vez — siempre llamar `fn_can_process_ai_job` primero
- Si se agrega un nuevo paso de procesamiento, crear o reutilizar un SP para la transición de estado
- Cada paso del pipeline debe actualizar el estado en BD antes de comenzar el trabajo (no después)
- Los errores de IA deben quedar registrados con un `error_code` específico — no solo `INTERNAL_ERROR`
