# Stored Procedures

tags: #database #stored-procedures #domain

---

## Principio

> Los Stored Procedures son el contrato del dominio. Representan las operaciones válidas sobre los datos. Ni la API ni la Azure Function hacen DML directo.

Ver [[ADR-002-stored-procedures-only]].

---

## sp_create_stt_live_recording_job_v1

**Ejecutado por:** Backend API (al recibir `POST /AIServices/Speechv2/SpeechToTextv2`)

**Propósito:** Crear atómicamente un job completo con su estado inicial y su recording.

### Firma

```sql
CALL sp_create_stt_live_recording_job_v1(
  p_job_id            VARCHAR(100),
  p_user_id           UUID,
  p_service_code      VARCHAR(50),
  p_feature_code      VARCHAR(100),
  p_flow              VARCHAR(100),
  p_initial_status    VARCHAR(50),       -- 'queued'
  p_initial_message   TEXT,
  p_actor_type        VARCHAR(30),       -- 'backend'
  p_language_locale   VARCHAR(20),
  p_language_name     VARCHAR(100),
  p_audio_format      VARCHAR(20),
  p_sample_rate       INTEGER,
  p_duration_seconds  NUMERIC(10,3),
  p_blob_name         TEXT,
  p_blob_url          TEXT,
  p_upload_status     VARCHAR(50),
  p_request_payload   JSONB DEFAULT NULL
)
```

### Operaciones internas (en orden)

```
1. UPSERT en ai_job
   - INSERT con status = p_initial_status ('queued')
   - ON CONFLICT (job_id) → UPDATE status, service_code, etc.
   - polling_url = '/AIServices/Speechv2/jobs/{job_id}/status'

2. UPDATE ai_job_status_history → SET is_current = FALSE
   (desactiva estado anterior si hubiera)

3. INSERT en ai_job_status_history
   - status = 'queued', is_current = TRUE
   - created_by_type = 'backend'

4. UPSERT en stt_recording
   - INSERT con todos los campos de audio y blob
   - ON CONFLICT (job_id) → UPDATE campos del recording
```

### Idempotencia

Este SP puede recibir el mismo `job_id` dos veces sin error gracias a los `ON CONFLICT DO UPDATE`. Ver [[ADR-006-idempotent-stored-procedures]].

---

## sp_update_ai_job_status_v1

**Ejecutado por:** Backend API (fallo de queue) y Azure Function (transiciones de paso)

**Propósito:** Registrar una transición de estado/paso en el historial y actualizar el estado actual del job.

### Firma

```sql
CALL sp_update_ai_job_status_v1(
  p_job_id         VARCHAR(100),
  p_status         VARCHAR(50),
  p_step_name      VARCHAR(100),
  p_message        TEXT          DEFAULT NULL,
  p_error_code     VARCHAR(100)  DEFAULT NULL,
  p_error_message  TEXT          DEFAULT NULL,
  p_retryable      BOOLEAN       DEFAULT NULL,
  p_steps_snapshot JSONB         DEFAULT NULL,
  p_metadata       JSONB         DEFAULT NULL,
  p_actor_type     VARCHAR(30)   DEFAULT NULL
)
```

### Operaciones internas (en orden)

```
1. UPDATE ai_job_status_history
   SET is_current = FALSE WHERE job_id = p_job_id AND is_current = TRUE
   (desactiva el estado actual)

2. INSERT en ai_job_status_history
   - Nuevo registro con is_current = TRUE
   - Incluye error_code, error_message, retryable si aplica

3. UPDATE ai_job
   - status = p_status
   - current_step = p_step_name
   - started_at = NOW() si p_status='processing' Y started_at IS NULL
   - failed_at = NOW() si p_status='failed'
   - last_error_code, last_error_message, last_error_retryable
```

### Casos de uso

| Actor | Cuándo lo llama | Parámetros clave |
|---|---|---|
| Backend | Fallo al publicar en queue | `status='failed'`, `error_code='QUEUE_SEND_FAILED'` |
| Azure Function | Inicio de transcripción | `status='processing'`, `step_name='transcription'` |
| Azure Function | Cambio a summary | `status='processing'`, `step_name='summary'` |
| Azure Function | Error en cualquier paso | `status='failed'`, `error_code='STT_ENGINE_UNAVAILABLE'` |

---

## sp_complete_stt_live_recording_job_v1

**Ejecutado por:** Azure Function (al finalizar el procesamiento exitosamente)

**Propósito:** Guardar el resultado consolidado del procesamiento AI y marcar el job como completado.

### Firma

```sql
CALL sp_complete_stt_live_recording_job_v1(
  p_job_id              VARCHAR(100),
  p_final_status        VARCHAR(50),       -- 'completed'
  p_final_step          VARCHAR(100),
  p_completion_message  TEXT,
  p_actor_type          VARCHAR(30),       -- 'azure_function'
  p_transcription_text  TEXT,
  p_summary_text        TEXT,
  p_notes_text          TEXT,
  p_notes_json          JSONB,
  p_mind_map_json       JSONB,
  p_raw_result_json     JSONB DEFAULT NULL
)
```

### Operaciones internas (en orden)

```
1. SELECT recording_id FROM stt_recording WHERE job_id = p_job_id
   - Si no existe → RAISE EXCEPTION

2. UPSERT en stt_recording_result
   - INSERT con todos los campos de resultado
   - ON CONFLICT (recording_id) → UPDATE (idempotente)

3. UPDATE ai_job_status_history
   SET is_current = FALSE WHERE job_id AND is_current = TRUE

4. INSERT en ai_job_status_history
   - status = 'completed', is_current = TRUE

5. UPDATE ai_job
   - status = 'completed'
   - completed_at = NOW()
```

### Garantía de integridad

Si el `recording_id` no existe, el SP lanza una excepción antes de guardar cualquier resultado. Esto previene resultados huérfanos.

### Idempotencia

Si llega dos veces por redelivery, el `ON CONFLICT (recording_id) DO UPDATE` en `stt_recording_result` actualiza los datos sin error duplicado.

---

## Resumen de SPs por actor

| SP | Backend API | Azure Function |
|---|---|---|
| `sp_create_stt_live_recording_job_v1` | ✔ | — |
| `sp_update_ai_job_status_v1` | ✔ (solo fallo queue) | ✔ (transiciones) |
| `sp_complete_stt_live_recording_job_v1` | — | ✔ |

---

## Referencias cruzadas

- [[schema-overview]] — Modelo de datos
- [[tables]] — Tablas que manipulan estos SPs
- [[functions]] — Functions de soporte
- [[job-states]] — Máquina de estados
- [[stt-processing]] — Flujo que usa estos SPs
- [[ADR-002-stored-procedures-only]] — Por qué solo SPs
- [[ADR-006-idempotent-stored-procedures]] — Idempotencia
