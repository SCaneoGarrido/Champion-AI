# Functions y Triggers

tags: #database #functions #triggers #postgresql

---

## Functions de negocio

### fn_can_process_ai_job

**Ejecutado por:** Azure Function (antes de comenzar el procesamiento)

**Propósito:** Verificar si un job puede ser procesado. Actúa como guard de idempotencia para evitar reprocesar jobs ya completados o fallidos.

**Firma:**
```sql
SELECT * FROM fn_can_process_ai_job(p_job_id VARCHAR(100))
-- Devuelve: can_process BOOLEAN, reason TEXT, current_status VARCHAR(50)
```

**Lógica:**

| Estado del job | can_process | reason |
|---|---|---|
| No existe | `false` | `'JOB_NOT_FOUND'` |
| `completed` | `false` | `'JOB_ALREADY_COMPLETED'` |
| `failed` | `false` | `'JOB_ALREADY_FAILED'` |
| Otro estado inválido | `false` | `'INVALID_JOB_STATUS'` |
| `queued` o `processing` | `true` | `NULL` |

**Por qué existe:** Azure Queue garantiza at-least-once delivery. Esta función previene el reprocesamiento cuando el mismo mensaje llega más de una vez.

Ver [[ADR-006-idempotent-stored-procedures]].

---

### fn_get_stt_live_recording_job_context

**Ejecutado por:** Azure Function (después de confirmar que puede procesar)

**Propósito:** Obtener todo el contexto necesario para procesar un job STT con una sola consulta.

**Firma:**
```sql
SELECT * FROM fn_get_stt_live_recording_job_context(p_job_id VARCHAR(100))
```

**Devuelve:**

| Campo | Tipo | Origen |
|---|---|---|
| `job_id` | VARCHAR(100) | `ai_job` |
| `user_id` | UUID | `ai_job.requested_by` |
| `service_code` | VARCHAR(50) | `ai_job` |
| `feature_code` | VARCHAR(100) | `ai_job` |
| `flow` | VARCHAR(100) | `ai_job` |
| `status` | VARCHAR(50) | `ai_job` |
| `current_step` | VARCHAR(100) | `ai_job` |
| `recording_id` | UUID | `stt_recording` |
| `language_locale` | VARCHAR(20) | `stt_recording` |
| `language_name` | VARCHAR(100) | `stt_recording` |
| `audio_format` | VARCHAR(20) | `stt_recording` |
| `sample_rate` | INTEGER | `stt_recording` |
| `duration_seconds` | NUMERIC(10,3) | `stt_recording` |
| `blob_name` | TEXT | `stt_recording` |
| `blob_url` | TEXT | `stt_recording` |
| `upload_status` | VARCHAR(50) | `stt_recording` |
| `request_payload` | JSONB | `ai_job` |
| `job_metadata` | JSONB | `ai_job.metadata` |

**Implementación:** JOIN entre `ai_job` y `stt_recording` usando `job_id`.

**Por qué existe:** La Azure Function recibe solo el `job_id`. Esta función le da todo lo necesario para operar sin múltiples roundtrips a la BD.

---

## Functions de infraestructura

### set_updated_at()

**Tipo:** Trigger function

**Propósito:** Actualizar automáticamente la columna `updated_at` en cada UPDATE.

```sql
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
```

**Tablas donde aplica:**

| Trigger | Tabla |
|---|---|
| `trg_ai_job_updated_at` | `ai_job` |
| `trg_sec_user_updated_at` | `sec_user` |
| `trg_sec_user_password_updated_at` | `sec_user_password` |
| `trg_stt_recording_updated_at` | `stt_recording` |
| `trg_stt_recording_result_updated_at` | `stt_recording_result` |

Todos son `BEFORE UPDATE FOR EACH ROW`.

---

### sync_ai_job_from_history()

**Tipo:** Trigger function (en `ai_job_status_history`)

**Propósito:** Mantener `ai_job` sincronizado cuando se inserta un nuevo registro de historial con `is_current = true`.

**Cuándo se activa:** `AFTER INSERT ON ai_job_status_history FOR EACH ROW`

**Lógica:**
```
Si NEW.is_current = TRUE:
  1. SET is_current = FALSE en historial anterior
  2. UPDATE ai_job:
     - status = NEW.status
     - current_step = NEW.step_name
     - started_at = NOW() si status='processing' Y started_at IS NULL
     - completed_at = NOW() si status='completed' Y completed_at IS NULL
     - failed_at = NOW() si status='failed' Y failed_at IS NULL
     - last_error_code/message/retryable si status='failed'
```

**Relación con SPs:** Los Stored Procedures (`sp_update_ai_job_status_v1`) también actualizan `ai_job` directamente. Este trigger es una segunda vía de sincronización — útil si se insertan registros en `ai_job_status_history` fuera de los SPs.

> **Nota:** Existe cierta duplicación entre la lógica del trigger y la del SP. El trigger actúa como red de seguridad.

---

## Migración: duration_seconds INTEGER → NUMERIC(10,3)

Existe una migración documentada que cambió el tipo de `stt_recording.duration_seconds` de `INTEGER` a `NUMERIC(10,3)`.

Los objetos afectados fueron:
1. `stt_recording.duration_seconds` — columna + constraint
2. `vw_stt_recording_result` — recreada (DROP + CREATE)
3. `sp_create_stt_live_recording_job_v1` — parámetro `p_duration_seconds`
4. `fn_get_stt_live_recording_job_context` — tipo de retorno

El estado actual en `init.sql` ya refleja `NUMERIC(10,3)`.

---

## Referencias cruzadas

- [[schema-overview]] — Diagrama del modelo
- [[tables]] — Tablas donde operan estos triggers
- [[stored-procedures]] — SPs que trabajan junto a estas functions
- [[stt-processing]] — Flujo que usa `fn_can_process_ai_job` y `fn_get_stt_live_recording_job_context`
- [[ADR-006-idempotent-stored-procedures]] — Por qué existe `fn_can_process_ai_job`
