# Champion AI — Azure Function (Procesamiento)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Responsabilidad de este componente

La Azure Function es el **procesador** del sistema. Se activa automáticamente cuando la API publica un mensaje en la queue.

**Procesa. No orquesta. No coordina. No llama a la API.**

## Trigger

```
Queue:   champion-ai-stt-live-recording
Mensaje: { "job_id": "job_{uuid}" }
```

La Function recibe solo el `job_id`. El contexto completo lo obtiene de PostgreSQL en el paso 2.

## Lenguaje

**Advertencia:** Existe una contradicción en las fuentes del proyecto.
- `README.md` (sección Arquitectura): menciona **Java**
- `README.md` (sección Tecnologías): menciona **Python**

Verificar el código fuente en `App/procesamiento/` para determinar el lenguaje real antes de modificar.

## Flujo de ejecución completo

```
[Mensaje recibido: { job_id }]
        │
        ▼
1. fn_can_process_ai_job(job_id)
   ┌─────────────────────────────┐
   │ can_process = false?        │──► Detener silenciosamente (redelivery)
   │ Razones: JOB_NOT_FOUND      │
   │ JOB_ALREADY_COMPLETED       │
   │ JOB_ALREADY_FAILED          │
   │ INVALID_JOB_STATUS          │
   └─────────────────────────────┘
        │ can_process = true
        ▼
2. fn_get_stt_live_recording_job_context(job_id)
   → obtiene: blob_url, language_locale, audio_format, recording_id, user_id, etc.
        │
        ▼
3. sp_update_ai_job_status_v1(status='processing', step='transcription')
        │
        ▼
4. Descarga audio desde blob_url (Azure Blob Storage)
        │
        ▼
5. Azure Speech → transcription_text
        │ error → sp_update_ai_job_status_v1(status='failed', error_code='STT_ENGINE_UNAVAILABLE')
        ▼
6. sp_update_ai_job_status_v1(status='processing', step='summary')
        │
        ▼
7. Azure OpenAI(transcription_text) → summary_text
        │ error → sp_update_ai_job_status_v1(status='failed', ...)
        ▼
8. sp_update_ai_job_status_v1(status='processing', step='notes')
        │
        ▼
9. Azure OpenAI(transcription_text) → notes_text + notes_json
        │ error → sp_update_ai_job_status_v1(status='failed', ...)
        ▼
10. sp_update_ai_job_status_v1(status='processing', step='mind_map')
        │
        ▼
11. Azure OpenAI(transcription_text) → mind_map_json
        │ error → sp_update_ai_job_status_v1(status='failed', ...)
        ▼
12. sp_complete_stt_live_recording_job_v1(
      job_id, final_status='completed',
      transcription_text, summary_text,
      notes_text, notes_json, mind_map_json
    )
```

## Regla absoluta de acceso a base de datos

> **La Azure Function NUNCA ejecuta DML directo. Solo puede llamar Stored Procedures o Functions SQL.**

Esta es la restricción más importante del componente. Toda escritura en BD pasa por:

| Función SQL | Cuándo |
|---|---|
| `fn_can_process_ai_job(job_id)` | Paso 1 — guard de idempotencia |
| `fn_get_stt_live_recording_job_context(job_id)` | Paso 2 — obtener contexto |
| `sp_update_ai_job_status_v1(...)` | Pasos 3, 6, 8, 10 y en errores |
| `sp_complete_stt_live_recording_job_v1(...)` | Paso 12 — guardar resultado |

Conexión directa a PostgreSQL en `:5432`. **No pasa por la Champion API.**

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
