> Espejo verbatim de `App/API/CLAUDE.md`. Sincronizado automáticamente por la skill
> `sync-knowledge-vault` — no editar a mano, editar la fuente y re-ejecutar la skill.

---

# Champion AI — Backend API (Node.js / Express)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Responsabilidad de este componente

La Champion API es el **orquestador** del sistema. Es el único punto de entrada para la app móvil.

**Orquesta. No procesa. No ejecuta IA. No recibe binarios.**

## Puerto y acceso

Puerto: `5000` (configurable via `.env`)
Autenticación: JWT en todos los endpoints excepto `/API/AUTH/register`, `/API/AUTH/login`, `/API/AUTH/refresh`, `/health` y `/version`

## Contrato de respuesta — invariante

**Todas** las respuestas siguen esta estructura sin excepción:

```json
{
  "success": true | false,
  "data": <objeto | array | null>,
  "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } | null
}
```

- Si `success: true` → `error` es `null`
- Si `success: false` → `data` es `null`
- `error.code` siempre en `SCREAMING_SNAKE_CASE`

Nunca romper este contrato. Nunca devolver una estructura diferente por conveniencia. (Excepción
existente: `GET /health` y `GET /version` devuelven JSON plano, no el envelope — son endpoints de
infraestructura consumidos por monitoreo, no por la app.)

## Endpoints implementados

### Autenticación (`auth_routes.js`, prefijo `/API/AUTH`)

| Método | Ruta        | Auth                                  | Rate limit  | Status       | Código HTTP |
| ------ | ----------- | ------------------------------------- | ----------- | ------------ | ----------- |
| POST   | `/register` | No                                    | 5/hora/IP   | Implementado | 201         |
| POST   | `/login`    | No                                    | 10/15min/IP | Implementado | 200         |
| POST   | `/refresh`  | No (requiere `refresh_token` en body) | —           | Implementado | 200         |

### STT — Speech to Text (`speech_routes.js`, prefijo `/AIServices/Speechv2`)

| Método | Ruta                       | Auth | Status       | Código HTTP |
| ------ | -------------------------- | ---- | ------------ | ----------- |
| GET    | `/getAvailableLenguages`   | JWT  | Implementado | 200         |
| GET    | `/getVoicesByLang?lang=`   | JWT  | Implementado | 200         |
| POST   | `/init`                    | JWT  | Implementado | 201         |
| POST   | `/SpeechToTextv2`          | JWT  | Implementado | 202         |
| GET    | `/jobs`                    | JWT  | Implementado | 200         |
| GET    | `/jobs/stats`              | JWT  | Implementado | 200         |
| GET    | `/jobs/{job_id}/status`    | JWT  | Implementado | 200         |
| GET    | `/jobs/{job_id}/result`    | JWT  | Implementado | 200         |
| POST   | `/jobs/{job_id}/retry`     | JWT  | Implementado | 202         |
| PATCH  | `/jobs/{job_id}/name`      | JWT  | Implementado | 200         |
| DELETE | `/jobs/{job_id}`           | JWT  | Implementado | 200         |
| POST   | `/jobs/{job_id}/reprocess` | JWT  | Implementado | 202         |

### Descarga y streaming de audio (`download_routes.js`, prefijo `/AIServices/Speechv2`)

| Método | Ruta                      | Auth | Status       | Código HTTP |
| ------ | ------------------------- | ---- | ------------ | ----------- |
| GET    | `/jobs/{job_id}/download` | JWT  | Implementado | 200         |
| GET    | `/jobs/{job_id}/stream`   | JWT  | Implementado | 200         |

### Usuario (`user_routes.js`, prefijo `/API/USER`)

| Método | Ruta           | Auth | Status       | Código HTTP |
| ------ | -------------- | ---- | ------------ | ----------- |
| GET    | `/me`          | JWT  | Implementado | 200         |
| PUT    | `/me`          | JWT  | Implementado | 200         |
| POST   | `/avatar/init` | JWT  | Implementado | 201         |

### Transversal (`transversal_routes.js`)

| Método | Ruta       | Auth | Status       | Código HTTP |
| ------ | ---------- | ---- | ------------ | ----------- |
| GET    | `/health`  | No   | Implementado | 200/503     |
| GET    | `/version` | No   | Implementado | 200         |

### Text to Speech (`text_routes.js`) — scaffolding, sin lógica real

| Método | Ruta              | Auth | Status                                                      | Código HTTP |
| ------ | ----------------- | ---- | ----------------------------------------------------------- | ----------- |
| GET    | `/text-to-speech` | No   | **Stub** — devuelve un mensaje fijo, sin validación ni cola | 200         |

> `vision_routes.js` (`/analyze-image-url`, `/analyze-uploaded-image`) existe y está implementado
> pero es una feature adyacente sin roadmap propio en V1–V5 — fuera del alcance de este documento.

## Detalle de cada endpoint

### POST /API/AUTH/register

**Body:**

```json
{
  "email": "...",
  "first_name": "...",
  "last_name": "...",
  "password": "...",
  "phone": "opcional",
  "location": "opcional",
  "occupation": "opcional"
}
```

**Lógica:**

1. Validar campos presentes (email/password/first_name/last_name) y formato de email
2. Verificar email no duplicado (case-insensitive via índice `uq_sec_user_email_lower`)
3. `INSERT` en `sec_user` (incluye `display_name` derivado, `username = email`)
4. Hash bcrypt + `INSERT` en `sec_user_password`

**Respuesta 201:** `{ "message": "Usuario creado satisfactoriamente." }`

**Errores:**

| HTTP | Código              | Condición                          |
| ---- | ------------------- | ---------------------------------- |
| 400  | `VALIDATION_ERROR`  | Campos faltantes                   |
| 400  | `INVALID_EMAIL`     | Formato de email inválido          |
| 409  | `CONFLICT`          | Email ya registrado                |
| 429  | `TOO_MANY_REQUESTS` | Rate limit de registro (5/hora/IP) |
| 500  | `INTERNAL_ERROR`    | Error no clasificado               |

---

### POST /API/AUTH/login

**Body:** `{ "email": "...", "password": "..." }`

**Lógica:**

1. Buscar usuario por `lower(email)`
2. Verificar bcrypt hash
3. Verificar bloqueo de cuenta (`sec_user_password.locked_until`)
4. Generar JWT (`access_token`) + `refresh_token`

**Respuesta:** `{ "success": true, "data": { "access_token": "eyJ...", "refresh_token": "..." }, "error": null }`

**Errores:**

| HTTP | Código              | Condición                                                                         |
| ---- | ------------------- | --------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`  | email o password faltante                                                         |
| 401  | `UNAUTHORIZED`      | Credenciales incorrectas                                                          |
| 429  | `ACCOUNT_LOCKED`    | Cuenta bloqueada (umbral de intentos no documentado — ver known-issues ISSUE-010) |
| 429  | `TOO_MANY_REQUESTS` | Rate limit de login (10/15min/IP)                                                 |
| 500  | `INTERNAL_ERROR`    | Error de servidor                                                                 |

---

### POST /API/AUTH/refresh

Renueva el `access_token` a partir de un `refresh_token` vigente.

**Body:** `{ "refresh_token": "..." }`

**Respuesta:** `{ "success": true, "data": { "access_token": "eyJ..." }, "error": null }`

**Errores:** `400 INVALID_PAYLOAD` (falta `refresh_token`) · `401 TOKEN_EXPIRED` (inválido o expirado) · `500 INTERNAL_ERROR`

---

### POST /AIServices/Speechv2/init

Genera SAS URL para upload directo a Azure Blob.

**Body:** `{ "req_info": { "audio": { "format": "webm" } } }`

**Lógica:**

1. Validar JWT → extraer `user_id`
2. Generar `job_id` → `"job_{uuid}"`
3. Generar SAS URL temporal (expira en 3600s, solo `PUT`)
4. Construir `blob_url` permanente

**Respuesta 201:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_...",
    "blob_name": "job_....webm",
    "upload_url": "https://...?sig=...",
    "expires_in": 3600
  },
  "error": null
}
```

---

### POST /AIServices/Speechv2/SpeechToTextv2

Registra el job en BD y lo encola para procesamiento.

**Body:**

```json
{
  "req_info": {
    "job_id": "job_...",
    "service": "STT",
    "feature": "live_recording",
    "flow": "flow_live_recording",
    "language_info": { "locale": "es-CL", "locale_name": "Spanish (Chile)" }
  },
  "audio_info": {
    "format": "webm",
    "sample_rate": 16000,
    "duration_seconds": 120,
    "blob_url": "https://storage.blob.core.windows.net/audio/..."
  }
}
```

**Validaciones (en este orden):**

| Campo              | Regla                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| JWT                | Válido y no expirado                                                    |
| `user_id`          | El del token debe coincidir con el job (no aceptar user_id del payload) |
| `req_info`         | Presente y con subcampos requeridos                                     |
| `audio.format`     | `webm \| mp4 \| m4a \| mp3 \| wav \| ogg`                               |
| `sample_rate`      | `8000 \| 16000 \| 44100 \| 48000`                                       |
| `duration_seconds` | Entre 1 y 10800                                                         |
| `blob_url`         | Presente y no expirada                                                  |

**Lógica:**

1. Validar JWT y payload
2. `CALL sp_create_stt_live_recording_job_v1(...)` → job en estado `queued`
3. Publicar `{ "job_id": "..." }` en queue `championaiqueue`
4. **Si la publicación falla:** `CALL sp_update_ai_job_status_v1(status='failed', error_code='QUEUE_SEND_FAILED')`

**Respuesta 202:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_...",
    "status": "accepted",
    "flow": "flow_live_recording",
    "polling_url": "...",
    "created_at": "..."
  },
  "error": null
}
```

**Errores:**

| HTTP | Código                | Condición                              |
| ---- | --------------------- | -------------------------------------- |
| 400  | `INVALID_PAYLOAD`     | `req_info` ausente                     |
| 400  | `INVALID_STT_CONTEXT` | `req_info` o `audio_info` mal formados |
| 400  | `UNSUPPORTED_FORMAT`  | Formato no soportado                   |
| 400  | `INVALID_SAMPLE_RATE` | Sample rate inválido                   |
| 400  | `DURATION_EXCEEDED`   | Audio > 3 horas                        |
| 400  | `INVALID_BLOB_URL`    | `blob_url` ausente o expirada          |
| 401  | `INVALID_TOKEN`       | JWT ausente                            |
| 403  | `TOKEN_EXPIRED`       | JWT inválido o expirado                |
| 403  | `USER_MISMATCH`       | `user_id` del token no coincide        |
| 500  | `JOB_CREATION_FAILED` | No se pudo crear el job                |
| 500  | `INTERNAL_ERROR`      | Error no clasificado                   |

---

### GET /AIServices/Speechv2/getAvailableLenguages

Lista los locales soportados por Fast Transcription (nombres únicos). `404 NOT_FOUND` si la lista viene vacía.

### GET /AIServices/Speechv2/getVoicesByLang?lang={locale}

Lista voces disponibles para narración por idioma — insumo de EPIC V4 (TTS), no del pipeline STT
actual. `400 VALIDATION_ERROR` si falta `lang`, `404 NOT_FOUND` si no hay voces.

### GET /AIServices/Speechv2/jobs

Lista los jobs recientes del usuario (`?limit=`, tope 50, default 20).

### GET /AIServices/Speechv2/jobs/stats

Estadísticas agregadas de jobs del usuario.

---

### GET /AIServices/Speechv2/jobs/{job_id}/status

Consulta el estado actual del job via vista `vw_ai_job_current_status`.

**Respuestas posibles:**

```json
{ "success": true, "data": { "job_id": "...", "status": "processing", "current_step": "summary" }, "error": null }
{ "success": true, "data": { "job_id": "...", "status": "completed" }, "error": null }
{ "success": true, "data": { "job_id": "...", "status": "failed", "error_code": "STT_ENGINE_UNAVAILABLE" }, "error": null }
```

Vista a usar: `SELECT * FROM vw_ai_job_current_status WHERE job_id = $1 AND requested_by = $user_id`

---

### GET /AIServices/Speechv2/jobs/{job_id}/result

Devuelve resultado completo via vista `vw_stt_recording_result`.

Vista a usar: `SELECT * FROM vw_stt_recording_result WHERE job_id = $1 AND user_id = $user_id`

---

### PATCH /AIServices/Speechv2/jobs/{job_id}/name

Renombra el Knowledge Pack (columna `blob_name` en `stt_recording`) — es el nombre que ve el usuario en "Mis Apuntes", no el path real del blob en Azure Storage.

**Body:** `{ "blob_name": "Clase de historia 3" }`

**Lógica:** `UPDATE stt_recording SET blob_name = $1 WHERE job_id = $2 AND user_id = $3` directo (no hay SP — es un campo puramente descriptivo, no forma parte del estado del pipeline ni del contrato de dominio que protegen los SPs).

**Respuesta 200:** `{ "job_id": "...", "blob_name": "Clase de historia 3" }`

**Errores:** `400 MISSING_NAME` (nombre vacío) · `404 NOT_FOUND` (job no existe o no es del usuario) · `500 INTERNAL_ERROR`

---

### POST /AIServices/Speechv2/jobs/{job_id}/retry

Reintenta un job en estado `failed` (`sp_reset_ai_job_for_retry_v1`, máximo 3 reintentos).

**Errores:** `404 JOB_NOT_FOUND` · `409 JOB_NOT_RETRYABLE` (no está en `failed`) · `429 MAX_RETRIES_EXCEEDED` · `500 INTERNAL_ERROR`

---

### DELETE /AIServices/Speechv2/jobs/{job_id}

Elimina (soft delete) un Knowledge Pack. Ver ADR-010.

**Lógica:** `CALL sp_soft_delete_stt_job_v1(job_id, user_id)` — marca `ai_job.is_deleted = TRUE`. No borra filas ni el audio en Blob Storage; un pipeline en curso no se detiene, solo deja de ser visible. Idempotente: eliminar dos veces no falla. `vw_ai_job_current_status` y `vw_stt_recording_result` filtran `is_deleted = FALSE`, así que un job eliminado desaparece automáticamente de todos los endpoints de lectura (`/jobs`, `/jobs/stats`, `/jobs/{id}/status`, `/jobs/{id}/result`) sin cambios adicionales en sus queries.

**Respuesta 200:** `{ "job_id": "...", "deleted": true }`

**Errores:** `404 JOB_NOT_FOUND` · `500 INTERNAL_ERROR`

---

### POST /AIServices/Speechv2/jobs/{job_id}/reprocess

Reprocesa un único step de contenido (`summary`, `notes` o `mind_map`) de un Knowledge Pack ya completado, opcionalmente con instrucciones propias del usuario. Ver ADR-010.

**Body:** `{ "step": "summary", "custom_instructions": "Hazlo más breve y en primera persona" }` (`custom_instructions` es opcional)

**Lógica:**

1. Validar `step ∈ { summary, notes, mind_map }` — `transcription` no es reprocesable (es audio→texto, no texto→texto)
2. `CALL sp_request_stt_step_reprocess_v1(job_id, user_id, step, custom_instructions)` — solo permitido si el job está `completed`; anula únicamente la(s) columna(s) de `stt_recording_result` del step solicitado y deja el job en `queued`
3. Publicar `{ "job_id": "..." }` en `championaiqueue` — exactamente el mismo publish que usa `retryJob`

La Azure Function no necesita un mensaje de queue distinto: al recibir el mismo `job_id`, el orquestador Durable relee `stt_recording_result` y regenera solo el campo que quedó en `NULL`, sirviendo el resto desde caché (mismo mecanismo del smart retry).

**Respuesta 202:** `{ "job_id": "...", "step": "summary", "status": "queued", "polling_url": "...", "requested_at": "..." }`

**Errores:** `400 INVALID_STEP` · `404 JOB_NOT_FOUND` · `409 JOB_NOT_COMPLETED` (el job no está `completed`) · `500 INTERNAL_ERROR`

---

### GET /AIServices/Speechv2/jobs/{job_id}/download

Genera una SAS URL de **un solo uso** para descargar el audio original.

**Lógica:**

1. `resolveBlobPath(job_id, userId)` — resuelve el path real del blob desde `blob_url` guardado en BD (no desde `blob_name`, que es solo el nombre descriptivo)
2. Verifica contra la tabla `download_locks` si ya fue consumido (`403` si sí)
3. Limpieza pasiva de locks vencidos en la misma llamada
4. `generateSingleUseUrl(blobPath)` — SAS de solo lectura, expira en 5 minutos

**Respuesta 200:** `{ "singleUseUrl": "https://...?sig=..." }`

**Errores:** `403 UNAUTHORIZED` (enlace ya consumido) · `404 JOB_NOT_FOUND` · `500 INTERNAL_ERROR`

> `download_locks` no tiene una migración versionada en `App/SQL/Migrations/` — existe y se usa en
> producción pero su creación no está rastreada. Pendiente de crear la migración correspondiente.

---

### GET /AIServices/Speechv2/jobs/{job_id}/stream

Misma resolución de blob que `/download`, pero **sin pasar por `download_locks`** — pensado para el
reproductor de audio integrado del Knowledge Workspace, que necesita pedir la URL repetidas veces
(play/pause, reabrir la nota). SAS de 5 min, reutilizable dentro de esa ventana.

**Respuesta 200:** `{ "streamUrl": "https://...?sig=..." }`

**Errores:** `404 JOB_NOT_FOUND` · `500 INTERNAL_ERROR`

---

### GET /API/USER/me

Perfil del usuario autenticado. **Respuesta 200:** `{ user_id, email, display_name, first_name, last_name, phone, location, occupation, avatar_url, last_login_at }`

**Errores:** `404 USER_NOT_FOUND` · `500 INTERNAL_ERROR`

### PUT /API/USER/me

Edita perfil. Si `email` cambia, valida formato y unicidad contra otros usuarios antes de aplicar.

**Body (todos opcionales):** `{ display_name, email, phone, location, occupation, avatar_url }`

**Errores:** `400 INVALID_EMAIL` · `409 EMAIL_TAKEN` · `500 UPDATE_FAILED` / `INTERNAL_ERROR`

### POST /API/USER/avatar/init

Genera una SAS URL de subida directa a Blob para el avatar (`avatars/{userId}/avatar.{ext}`), mismo
patrón que `/AIServices/Speechv2/init` para audio pero para imágenes de perfil.

**Body:** `{ "ext": "jpg" }` (opcional, default `jpg`)

**Respuesta 201:** `{ upload_url, avatar_url }`

---

### GET /health

Chequeo de salud — verifica Postgres, Azure Queue y Azure Blob. `200` si los tres están arriba, `503` si alguno falla. No usa el envelope estándar (respuesta plana, pensada para monitoreo/infraestructura).

### GET /version

Metadata estática de la API (versión, servicios, límites de audio). No requiere auth. Respuesta plana, no usa el envelope estándar.

## Acceso a base de datos

La API accede a PostgreSQL mediante:

- **Stored Procedures** para escritura: `sp_create_stt_live_recording_job_v1`, `sp_update_ai_job_status_v1`, `sp_reset_ai_job_for_retry_v1`, `sp_soft_delete_stt_job_v1`, `sp_request_stt_step_reprocess_v1`
- **Vistas** para lectura: `vw_ai_job_current_status`, `vw_stt_recording_result`
- **DML directo** para: auth (`sec_user`, `sec_user_password`), perfil de usuario (`sec_user` — `GET/PUT /API/USER/me`), renombrado de Knowledge Pack (`stt_recording.blob_name`) y `download_locks` — todos campos/tablas puramente descriptivos o fuera del contrato de dominio de jobs que protegen los SPs

La API **nunca** hace DML directo en tablas de dominio de jobs (`ai_job`, `ai_job_status_history`, `stt_recording`, `stt_recording_result`).

## Seguridad

- JWT validado en cada endpoint protegido antes de cualquier operación
- `user_id` extraído del token — nunca aceptar del payload del cliente
- Emails indexados case-insensitive (`lower(email)`) para evitar duplicados por capitalización
- SAS URLs: `PUT` sobre blob específico expiran en 3600s (subida de audio/avatar); `GET` de solo lectura expiran en 5 minutos (descarga/streaming)
- Rate limiting: 10 intentos/15min en login, 5 registros/hora, ambos por IP (`express-rate-limit`)
- Bloqueo de cuenta tras intentos fallidos (`ACCOUNT_LOCKED`) — umbral exacto no documentado (ver `App/Knowledge/Bugs/known-issues.md` ISSUE-010)

## Catálogo de errores HTTP completo

Ver `App/rules/security.md` y `App/Knowledge/Operations/error-codes.md`.

## Reglas de desarrollo en este componente

- Cada nuevo endpoint debe validar JWT y usar el contrato `{ success, data, error }`
- Toda escritura a tablas de dominio → usar o crear un Stored Procedure
- La API no debe esperar el resultado de procesamiento IA — responder `202` y encolar
- Si falla el encolamiento, marcar el job como `failed` en BD antes de responder error al cliente
- No hardcodear valores de validación: los formatos de audio y sample rates válidos están en la BD (`chk_stt_recording_audio_format`, `chk_stt_recording_sample_rate`)

## Roadmap

Los próximos endpoints de este componente (topics, favoritos/highlights, narración TTS real) están desglosados por versión en `App/Knowledge/Roadmap/EPICS.md` (EPICs V2 a V5).
