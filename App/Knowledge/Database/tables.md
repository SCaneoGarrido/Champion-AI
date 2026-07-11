# Tablas de la Base de Datos

tags: #database #tables #schema

---

## sec_user

Almacena la identidad de cada usuario del sistema.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `user_id` | UUID | PK, DEFAULT `gen_random_uuid()` | Identificador único |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE (lower) | Email de acceso |
| `username` | VARCHAR(100) | UNIQUE (lower, nullable) | Nombre de usuario opcional |
| `display_name` | VARCHAR(150) | | Nombre para mostrar |
| `first_name` | VARCHAR(100) | | Nombre |
| `last_name` | VARCHAR(100) | | Apellido |
| `is_active` | BOOLEAN | DEFAULT true | Si el usuario puede operar |
| `must_change_password` | BOOLEAN | DEFAULT false | Flag de cambio obligatorio |
| `last_login_at` | TIMESTAMPTZ | | Último login |
| `phone` | VARCHAR(20) | | Teléfono (agregado en migración) |
| `location` | VARCHAR(50) | | Ubicación (agregado en migración) |
| `occupation` | VARCHAR(50) | | Ocupación (agregado en migración) |
| `avatar_url` | VARCHAR(255) | | URL del avatar (agregado en migración) |
| `created_by` | UUID | FK → sec_user (nullable) | Quién creó el usuario |
| `updated_by` | UUID | FK → sec_user (nullable) | Quién actualizó |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Última actualización (trigger) |

**Índices:**
- `uq_sec_user_email_lower` — UNIQUE en `lower(email)`
- `uq_sec_user_username_lower` — UNIQUE parcial en `lower(username) WHERE username IS NOT NULL`
- `idx_sec_user_is_active` — en `is_active`

---

## sec_user_password

Almacena las credenciales con soporte para historial y bloqueo de cuenta.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `user_password_id` | UUID | PK | Identificador |
| `user_id` | UUID | FK → sec_user (CASCADE DELETE) | Usuario |
| `password_hash` | TEXT | NOT NULL | Hash bcrypt |
| `password_algorithm` | VARCHAR(50) | DEFAULT `'bcrypt'` | Algoritmo |
| `password_updated_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de cambio |
| `failed_attempts` | INTEGER | DEFAULT 0, CHECK >= 0 | Intentos fallidos |
| `locked_until` | TIMESTAMPTZ | | Bloqueo hasta |
| `is_active` | BOOLEAN | DEFAULT true | Si esta password está activa |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Última actualización |

**Restricción clave:** `uq_sec_user_password_active` — UNIQUE parcial en `user_id WHERE is_active = true`. Solo puede haber una password activa por usuario.

**Índices:**
- `uq_sec_user_password_active` — UNIQUE parcial
- `idx_sec_user_password_user_id` — en `user_id`

---

## ai_job

Representa un job de procesamiento. Mantiene el estado actual para acceso rápido.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `job_id` | VARCHAR(100) | PK, DEFAULT `'job_' + UUID` | ID con prefijo legible |
| `requested_by` | UUID | FK → sec_user, NOT NULL | Usuario que creó el job |
| `service_code` | VARCHAR(50) | NOT NULL | Ej: `'STT'` |
| `feature_code` | VARCHAR(100) | NOT NULL | Ej: `'live_recording'` |
| `flow` | VARCHAR(100) | NOT NULL | Ej: `'flow_live_recording'` |
| `status` | VARCHAR(50) | CHECK (ver abajo) | Estado actual |
| `current_step` | VARCHAR(100) | | Paso actual dentro del status |
| `polling_url` | TEXT | | URL para consultar estado |
| `request_payload` | JSONB | | Payload original de la petición |
| `metadata` | JSONB | | Metadata adicional |
| `requested_at` | TIMESTAMPTZ | DEFAULT now() | Cuando se solicitó |
| `started_at` | TIMESTAMPTZ | | Cuando empezó el procesamiento |
| `completed_at` | TIMESTAMPTZ | | Cuando completó |
| `failed_at` | TIMESTAMPTZ | | Cuando falló |
| `last_error_code` | VARCHAR(100) | | Último código de error |
| `last_error_message` | TEXT | | Último mensaje de error |
| `last_error_retryable` | BOOLEAN | | Si el error es reintentable |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | (trigger) |

**CHECK status:** `queued | processing | completed | failed`

**Índices:**
- `idx_ai_job_status`, `idx_ai_job_flow`, `idx_ai_job_requested_by`
- `idx_ai_job_service_feature` — compuesto en `(service_code, feature_code)`
- `idx_ai_job_created_at` — DESC
- `uq_ai_job_job_requested_by` — UNIQUE en `(job_id, requested_by)`

---

## ai_job_status_history

Historial completo e inmutable de cada transición de estado de un job.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id_history` | UUID | PK | Identificador |
| `job_id` | VARCHAR(100) | FK → ai_job (CASCADE) | Job al que pertenece |
| `status` | VARCHAR(50) | CHECK (mismo que ai_job) | Estado en este evento |
| `step_name` | VARCHAR(100) | | Paso específico |
| `message` | TEXT | | Mensaje descriptivo |
| `error_code` | VARCHAR(100) | | Código de error si falló |
| `error_message` | TEXT | | Descripción del error |
| `error_field` | TEXT | | Campo que causó el error |
| `retryable` | BOOLEAN | | Si es reintentable |
| `steps_snapshot` | JSONB | | Snapshot del estado en ese momento |
| `metadata` | JSONB | | Metadata adicional |
| `is_current` | BOOLEAN | DEFAULT true | Si es el estado activo |
| `created_by` | UUID | FK → sec_user (SET NULL) | Usuario actor |
| `created_by_type` | VARCHAR(30) | CHECK (ver abajo) | Tipo de actor |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**CHECK created_by_type:** `user | system | backend | azure_function | worker`

**Índice clave:** `uq_ai_job_status_history_current` — UNIQUE parcial en `job_id WHERE is_current = true`. Garantiza solo 1 estado actual por job.

---

## stt_recording

Metadata del audio subido para un job STT.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `recording_id` | UUID | PK | Identificador |
| `job_id` | VARCHAR(100) | FK → ai_job (CASCADE), UNIQUE | Job al que pertenece |
| `user_id` | UUID | FK → sec_user | Usuario dueño |
| `language_locale` | VARCHAR(20) | DEFAULT `'es-CL'` | Locale del audio |
| `language_name` | VARCHAR(100) | | Nombre del idioma |
| `audio_format` | VARCHAR(20) | CHECK (ver abajo) | Formato del archivo |
| `sample_rate` | INTEGER | CHECK (ver abajo) | Frecuencia de muestreo |
| `duration_seconds` | NUMERIC(10,3) | CHECK 1..10800 | Duración en segundos |
| `blob_name` | TEXT | | Nombre en Azure Blob |
| `blob_url` | TEXT | | URL permanente |
| `upload_id` | VARCHAR(100) | | ID de la operación de upload |
| `upload_status` | VARCHAR(50) | CHECK (ver abajo) | Estado del upload |
| `size_bytes` | BIGINT | CHECK >= 0 | Tamaño del archivo |
| `checksum_sha256` | VARCHAR(128) | | Hash SHA-256 |
| `expires_at` | TIMESTAMPTZ | | Expiración del blob |

**CHECK audio_format:** `webm | mp4 | m4a | mp3 | wav | ogg`
**CHECK sample_rate:** `8000 | 16000 | 44100 | 48000`
**CHECK upload_status:** `initialized | uploading | uploaded | validated | failed | expired`

---

## stt_recording_result

Resultado consolidado del procesamiento AI de un recording.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `result_id` | UUID | PK | Identificador |
| `recording_id` | UUID | FK → stt_recording, UNIQUE | Recording al que pertenece |
| `job_id` | VARCHAR(100) | FK → stt_recording | Referencia al job |
| `transcription_text` | TEXT | | Transcripción literal |
| `summary_text` | TEXT | | Resumen generado |
| `notes_text` | TEXT | | Notas en texto |
| `notes_json` | JSONB | | Notas estructuradas |
| `mind_map_json` | JSONB | | Mapa mental |
| `raw_result_json` | JSONB | | Respuesta cruda AI |
| `generated_at` | TIMESTAMPTZ | | Cuando se generó |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**CHECK:** Al menos uno de los campos de contenido debe ser NOT NULL.

---

## Referencias cruzadas

- [[schema-overview]] — Diagrama relacional y principios
- [[views]] — Vistas que leen estas tablas
- [[stored-procedures]] — SPs que escriben en estas tablas
- [[job-states]] — Estados válidos de ai_job
