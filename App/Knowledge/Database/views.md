# Vistas de la Base de Datos

tags: #database #views #postgresql

---

## Propósito de las vistas

Las vistas en Champion AI sirven como capa de lectura optimizada para la API.
La API nunca construye joins ad-hoc en el código: consulta vistas.

---

## vw_ai_job_current_status

**Propósito:** Exponer el estado actual de un job para el endpoint de polling (`GET /jobs/{id}/status`).

**Qué une:**
```
ai_job (j)
LEFT JOIN ai_job_status_history (h) ON h.job_id = j.job_id AND h.is_current = true
```

El `LEFT JOIN` garantiza que devuelva el job incluso si por alguna razón no hay historial activo.

**Columnas expuestas:**

| Columna | Fuente |
|---|---|
| `job_id` | `ai_job.job_id` |
| `requested_by` | `ai_job.requested_by` |
| `service_code` | `ai_job.service_code` |
| `feature_code` | `ai_job.feature_code` |
| `flow` | `ai_job.flow` |
| `status` | `ai_job.status` |
| `current_step` | `ai_job.current_step` |
| `polling_url` | `ai_job.polling_url` |
| `requested_at` | `ai_job.requested_at` |
| `started_at` | `ai_job.started_at` |
| `completed_at` | `ai_job.completed_at` |
| `failed_at` | `ai_job.failed_at` |
| `last_error_code` | `ai_job.last_error_code` |
| `last_error_message` | `ai_job.last_error_message` |
| `last_error_retryable` | `ai_job.last_error_retryable` |
| `id_history` | `ai_job_status_history.id_history` |
| `step_name` | `ai_job_status_history.step_name` |
| `message` | `ai_job_status_history.message` |
| `error_code` | `ai_job_status_history.error_code` |
| `error_message` | `ai_job_status_history.error_message` |
| `error_field` | `ai_job_status_history.error_field` |
| `retryable` | `ai_job_status_history.retryable` |
| `steps_snapshot` | `ai_job_status_history.steps_snapshot` |
| `history_metadata` | `ai_job_status_history.metadata` |
| `created_by_type` | `ai_job_status_history.created_by_type` |
| `last_status_at` | `ai_job_status_history.created_at` |

**Usada por:** `GET /AIServices/Speechv2/jobs/{job_id}/status` (endpoint pendiente)

---

## vw_stt_recording_result

**Propósito:** Exponer el resultado completo de un job STT para el endpoint de resultado (`GET /jobs/{id}/result`).

**Qué une:**
```
stt_recording (r)
JOIN ai_job (j) ON j.job_id = r.job_id
LEFT JOIN stt_recording_result (result) ON result.recording_id = r.recording_id
                                       AND result.job_id = r.job_id
```

El `LEFT JOIN` a `stt_recording_result` permite que la vista devuelva datos incluso si el resultado aún no existe (job en processing).

**Columnas expuestas:**

| Columna | Fuente |
|---|---|
| `recording_id` | `stt_recording.recording_id` |
| `job_id` | `stt_recording.job_id` |
| `user_id` | `stt_recording.user_id` |
| `language_locale` | `stt_recording.language_locale` |
| `language_name` | `stt_recording.language_name` |
| `audio_format` | `stt_recording.audio_format` |
| `sample_rate` | `stt_recording.sample_rate` |
| `duration_seconds` | `stt_recording.duration_seconds` |
| `blob_name` | `stt_recording.blob_name` |
| `blob_url` | `stt_recording.blob_url` |
| `upload_id` | `stt_recording.upload_id` |
| `upload_status` | `stt_recording.upload_status` |
| `size_bytes` | `stt_recording.size_bytes` |
| `checksum_sha256` | `stt_recording.checksum_sha256` |
| `expires_at` | `stt_recording.expires_at` |
| `job_status` | `ai_job.status` |
| `current_step` | `ai_job.current_step` |
| `polling_url` | `ai_job.polling_url` |
| `result_id` | `stt_recording_result.result_id` |
| `transcription_text` | `stt_recording_result.transcription_text` |
| `summary_text` | `stt_recording_result.summary_text` |
| `notes_text` | `stt_recording_result.notes_text` |
| `notes_json` | `stt_recording_result.notes_json` |
| `mind_map_json` | `stt_recording_result.mind_map_json` |
| `raw_result_json` | `stt_recording_result.raw_result_json` |
| `generated_at` | `stt_recording_result.generated_at` |
| `recording_created_at` | `stt_recording.created_at` |
| `recording_updated_at` | `stt_recording.updated_at` |
| `result_created_at` | `stt_recording_result.created_at` |
| `result_updated_at` | `stt_recording_result.updated_at` |
| `mind_map_mermaid_code` | `stt_recording_result.mind_map_mermaid_code` (Presentation Layer — agregada al final de la lista, `CREATE OR REPLACE VIEW` no permite insertar columnas en medio) |
| `mind_map_svg` | `stt_recording_result.mind_map_svg` (Presentation Layer — ídem) |

**Usada por:** `GET /AIServices/Speechv2/jobs/{job_id}/result` (endpoint pendiente)

---

## Por qué vistas y no queries directas

Las vistas actúan como **contrato de lectura** entre la base de datos y la API:
- Si cambia la estructura interna de las tablas, solo se actualiza la vista
- El código de la API no conoce los joins subyacentes
- Facilita el testing: se puede mockear la vista sin cambiar las tablas

---

## Referencias cruzadas

- [[schema-overview]] — Diagrama relacional
- [[tables]] — Tablas que componen estas vistas
- [[polling]] — Endpoints que consumen estas vistas
- [[stored-procedures]] — SPs que escriben los datos que las vistas leen
