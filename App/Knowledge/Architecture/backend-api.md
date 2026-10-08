# Backend API

tags: #architecture #backend #api #nodejs

---

## Descripción

La Champion API es el backend del sistema, desarrollado en **Node.js con Express.js 5.x**.
Es el único punto de entrada para la app móvil y el coordinador de todos los recursos externos.

Puerto: `http://localhost:5051` (configurable via `.env`)

---

## Responsabilidades

| Responsabilidad       | Detalle                                            |
| --------------------- | -------------------------------------------------- |
| Autenticación         | Registro, login (con rate limiting) y refresh de JWT |
| Autorización          | Validación de JWT en rutas protegidas              |
| Validación            | Verificación de payloads antes de actuar           |
| Generación de SAS URL | Acceso temporal a Azure Blob para subida de audio, descarga/streaming de audio y avatar |
| Creación de Jobs      | Via Stored Procedure, nunca DML directo            |
| Publicación en Queue  | Dispara el procesamiento async en Azure Function   |
| Polling               | Expone endpoints para consultar estado y resultado |
| Gestión de Knowledge Packs | Renombrar, eliminar (soft delete), reintentar, reprocesar un step |
| Perfil de usuario     | Consulta/edición de perfil, subida de avatar       |

---

## Contrato de respuesta estándar

Todas las respuestas de la API siguen esta estructura sin excepción:

```json
{
  "success": true | false,
  "data": <objeto | array | null>,
  "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } | null
}
```

**Regla:** Si `success: true` → `error` es `null`. Si `success: false` → `data` es `null`.

Ver [[ADR-004-response-envelope]].

---

## Endpoints implementados

Verificado directamente contra `App/API/src/routes/*.js` (fuente de verdad de rutas).

### Autenticación — `App/API/AUTH` (`auth_routes.js`)

| Método | Ruta | Auth | Rate limit | Status |
|---|---|---|---|---|
| POST | `/register` | No | 5 / hora / IP | Implementado |
| POST | `/login` | No | 10 / 15 min / IP | Implementado |
| POST | `/refresh` | No (requiere `refresh_token` en body) | — | Implementado |

### STT — Speech to Text (`speech_routes.js`, prefijo `/AIServices/Speechv2`)

| Método | Ruta | Auth | Status |
|---|---|---|---|
| GET | `/getAvailableLenguages` | JWT | Implementado |
| GET | `/getVoicesByLang?lang=` | JWT | Implementado |
| POST | `/init` | JWT | Implementado |
| POST | `/SpeechToTextv2` | JWT | Implementado |
| GET | `/jobs` | JWT | Implementado — lista jobs recientes del usuario |
| GET | `/jobs/stats` | JWT | Implementado |
| GET | `/jobs/{job_id}/status` | JWT | Implementado |
| GET | `/jobs/{job_id}/result` | JWT | Implementado |
| PATCH | `/jobs/{job_id}/name` | JWT | Implementado |
| POST | `/jobs/{job_id}/retry` | JWT | Implementado |
| POST | `/jobs/{job_id}/reprocess` | JWT | Implementado |
| DELETE | `/jobs/{job_id}` | JWT | Implementado — soft delete |

### Descarga y streaming de audio (`download_routes.js`, prefijo `/AIServices/Speechv2`)

| Método | Ruta | Auth | Status |
|---|---|---|---|
| GET | `/jobs/{job_id}/download` | JWT | Implementado — enlace de un solo uso (`download_locks`) |
| GET | `/jobs/{job_id}/stream` | JWT | Implementado — enlace reutilizable, sin lock, para el reproductor integrado |

### Usuario (`user_routes.js`, prefijo `/API/USER` — verificar prefijo real en `src/index.js` al integrar)

| Método | Ruta | Auth | Status |
|---|---|---|---|
| GET | `/me` | JWT | Implementado — perfil del usuario autenticado |
| PUT | `/me` | JWT | Implementado — edita perfil (valida unicidad de email si cambia) |
| POST | `/avatar/init` | JWT | Implementado — SAS URL de subida directa a Blob para el avatar |

### Transversal (`transversal_routes.js`)

| Método | Ruta | Auth | Status |
|---|---|---|---|
| GET | `/health` | No | Implementado — chequea Postgres, Azure Queue, Azure Blob |
| GET | `/version` | No | Implementado — metadata estática de la API |

### Visión (`vision_routes.js`) — fuera del alcance de STT/Knowledge Workspace

| Método | Ruta | Auth | Status |
|---|---|---|---|
| POST | `/analyze-image-url` | — | Implementado, feature adyacente sin roadmap propio en V1-V5 |
| POST | `/analyze-uploaded-image` | — | Implementado, feature adyacente sin roadmap propio en V1-V5 |

### Text to Speech (`text_routes.js`) — scaffolding, sin lógica real

| Método | Ruta | Auth | Status |
|---|---|---|---|
| GET | `/text-to-speech` | No | **Stub** — devuelve un mensaje fijo, sin validación ni cola. Ver EPIC V4 en [[EPICS]] y [[text-to-speech]]. |

---

## Detalle de cada endpoint

### POST `/API/AUTH/register`

Crea un nuevo usuario en el sistema. Controller real: `registrov2` (`auth.controller.js`).

**Body:**
```json
{
  "email": "user@championai.app",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "password": "Password123!",
  "phone": "opcional",
  "location": "opcional",
  "occupation": "opcional"
}
```

**Lógica interna:**
1. Valida email/password/first_name/last_name presentes y formato de email
2. Verifica que el email no exista (`validateExistingUser`)
3. Inserta en `sec_user` (vía `user_repository.createUser`, incluye `display_name` derivado, `username = email`)
4. Genera hash bcrypt de la contraseña e inserta en `sec_user_password`

**Respuesta exitosa:** `201 Created` → `{ "message": "Usuario creado satisfactoriamente." }`

**Errores:**

| Status | Código | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos requeridos faltantes |
| 400 | `INVALID_EMAIL` | Formato de email inválido |
| 409 | `CONFLICT` | Email ya registrado |
| 429 | `TOO_MANY_REQUESTS` | Rate limit de registro (5/hora/IP) |
| 500 | `INTERNAL_ERROR` | Error de servidor |

---

### POST `/API/AUTH/login`

Autentica al usuario y devuelve access + refresh token.

**Body:**
```json
{ "email": "user@championai.app", "password": "Password123!" }
```

**Respuesta exitosa:** `200 OK`
```json
{ "success": true, "data": { "access_token": "eyJ...", "refresh_token": "..." }, "error": null }
```

**Errores:**

| Status | Código | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email o password faltante |
| 401 | `UNAUTHORIZED` | Credenciales inválidas |
| 429 | `ACCOUNT_LOCKED` | Cuenta bloqueada (`sec_user_password.locked_until`) |
| 429 | `TOO_MANY_REQUESTS` | Rate limit de login (10/15min/IP) |
| 500 | `INTERNAL_ERROR` | Error de servidor |

> El bloqueo de cuenta (`ACCOUNT_LOCKED`, `failed_attempts`/`locked_until`) está implementado en
> `auth_service.ValidateUser`, pero el umbral de intentos y la duración del bloqueo no están
> documentados en ninguna fuente disponible — sigue siendo el vacío de `known-issues.md` ISSUE-010,
> solo que ahora se confirma que la lógica sí existe y corre en cada login.

---

### POST `/API/AUTH/refresh`

Renueva el `access_token` a partir de un `refresh_token` vigente. **No documentado anteriormente en
ninguna fuente del proyecto** — cierra parte de `known-issues.md` ISSUE-008 (queda pendiente solo el
tiempo de expiración exacto de cada token, no verificado en esta pasada).

**Body:** `{ "refresh_token": "..." }`

**Respuesta exitosa:** `200 OK` → `{ "access_token": "eyJ..." }`

**Errores:** `400 INVALID_PAYLOAD` (falta `refresh_token`) · `401 TOKEN_EXPIRED` (inválido o expirado) · `500 INTERNAL_ERROR`

---

### GET `/AIServices/Speechv2/init`... ver `POST /init` abajo

### POST `/AIServices/Speechv2/init`

Genera la SAS URL para que el cliente suba el audio directamente a Azure Blob.

**Header:** `Authorization: Bearer {token}`

**Body:**
```json
{ "req_info": { "audio": { "format": "webm" } } }
```

**Lógica interna:**
1. Valida JWT → extrae `user_id`
2. Genera `job_id` (`job_{uuid}`)
3. Genera `blob_name` (`{job_id}.webm`)
4. Genera SAS URL temporal (`expires_in: 3600`)
5. Construye `blob_url` permanente

**Respuesta exitosa:** `201 Created`
```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "blob_name": "job_550e8400-....webm",
    "upload_url": "https://storage.blob.core.windows.net/audio/...?sv=...&sig=...",
    "expires_in": 3600
  },
  "error": null
}
```

---

### POST `/AIServices/Speechv2/SpeechToTextv2`

Registra el job en BD y lo encola para procesamiento.

**Header:** `Authorization: Bearer {token}`

**Validaciones que hace el backend:**
- Formato de audio permitido: `webm | mp4 | m4a | mp3 | wav | ogg`
- Sample rate válido: `8000 | 16000 | 44100 | 48000`
- Duración máxima: `10800` segundos (3 horas)
- `blob_url` presente y no expirada
- `user_id` del token debe coincidir con el job

**Lógica interna:**
1. Valida JWT y payload
2. Ejecuta `sp_create_stt_live_recording_job_v1` — crea job en estado `queued`
3. Publica `{ "job_id": "..." }` en la queue `championaiqueue`
4. Si la publicación falla: ejecuta `sp_update_ai_job_status_v1` con `status=failed, error_code=QUEUE_SEND_FAILED`

**Respuesta exitosa:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "status": "accepted",
    "flow": "flow_live_recording",
    "polling_url": "/AIServices/Speechv2/jobs/.../status",
    "created_at": "2026-06-12T10:00:00.000Z"
  },
  "error": null
}
```

Ver [[upload-audio]] para el flujo completo y [[stored-procedures]] para los SPs.

---

### GET `/AIServices/Speechv2/getAvailableLenguages`

Lista los locales soportados por Fast Transcription (nombres únicos). `404 NOT_FOUND` si la lista viene vacía.

### GET `/AIServices/Speechv2/getVoicesByLang?lang={locale}`

Lista voces disponibles para narración por idioma — usado por EPIC V4 (TTS), no por el pipeline STT
actual. `400 VALIDATION_ERROR` si falta `lang`, `404 NOT_FOUND` si no hay voces.

### GET `/AIServices/Speechv2/jobs`

Lista los jobs recientes del usuario (`?limit=`, tope 50, default 20).

### GET `/AIServices/Speechv2/jobs/stats`

Estadísticas agregadas de jobs del usuario (conteos por estado — ver `job_repository.getStatsByUser`).

---

### GET `/AIServices/Speechv2/jobs/{job_id}/status`

Consulta el estado actual del job via vista `vw_ai_job_current_status`.

```json
{ "success": true, "data": { "job_id": "...", "status": "processing", "current_step": "summary" }, "error": null }
```

Ver [[polling]] y [[views]].

---

### GET `/AIServices/Speechv2/jobs/{job_id}/result`

Devuelve el resultado completo del job via vista `vw_stt_recording_result`.

Ver [[polling]] y [[views]].

---

### PATCH `/AIServices/Speechv2/jobs/{job_id}/name`

Renombra el Knowledge Pack (`stt_recording.blob_name`, campo puramente descriptivo — `UPDATE` directo,
sin SP, no forma parte del contrato de dominio protegido por los SPs).

**Body:** `{ "blob_name": "Clase de historia 3" }` — `400 MISSING_NAME` si viene vacío, `404 NOT_FOUND` si el job no existe o no es del usuario.

---

### POST `/AIServices/Speechv2/jobs/{job_id}/retry`

Reintenta un job en estado `failed`. `404 JOB_NOT_FOUND` · `409 JOB_NOT_RETRYABLE` si el job no está
en `failed`.

---

### POST `/AIServices/Speechv2/jobs/{job_id}/reprocess`

Reprocesa un único step (`summary | notes | mind_map`) de un Knowledge Pack `completed`, con
`custom_instructions` opcionales. Ver [[ADR-010-knowledge-pack-lifecycle-actions]].

**Body:** `{ "step": "summary", "custom_instructions": "..." }`

**Errores:** `400 INVALID_STEP` · `404 JOB_NOT_FOUND` · `409 JOB_NOT_COMPLETED` · `500 INTERNAL_ERROR`

---

### DELETE `/AIServices/Speechv2/jobs/{job_id}`

Soft delete (`sp_soft_delete_stt_job_v1`) — no borra filas ni el audio en Blob. Idempotente. Ver
[[ADR-010-knowledge-pack-lifecycle-actions]].

---

### GET `/AIServices/Speechv2/jobs/{job_id}/download`

Genera una SAS URL de **un solo uso** (`generateSingleUseUrl`, expira en 5 min) para descargar el
audio original. Protegido por la tabla `download_locks`: un segundo intento sobre el mismo blob
devuelve `403 UNAUTHORIZED` ("Enlace de un solo uso ya consumido"). Incluye limpieza pasiva de locks
vencidos en cada llamada (`cleanOldDownloadsLocks`).

> `download_locks` no aparece en ningún archivo de `App/SQL/Migrations` — existe y se usa en
> producción (`download.repository.js`) pero su creación no está rastreada como migración. Ver nota
> en [[tables]].

**Respuesta exitosa:** `200 OK` → `{ "singleUseUrl": "https://...?sig=..." }`

---

### GET `/AIServices/Speechv2/jobs/{job_id}/stream`

Misma resolución de blob que `/download`, pero **sin pasar por `download_locks`** — pensado para el
reproductor de audio integrado del Knowledge Workspace, que necesita pedir la URL repetidas veces
(play/pause, reabrir la nota). SAS URL de 5 min, reutilizable dentro de esa ventana.

**Respuesta exitosa:** `200 OK` → `{ "streamUrl": "https://...?sig=..." }`

---

### GET `/API/USER/me`

Perfil del usuario autenticado. `404 USER_NOT_FOUND` si no existe (no debería ocurrir con JWT válido).

**Respuesta exitosa:** `200 OK` → `{ user_id, email, display_name, first_name, last_name, phone, location, occupation, avatar_url, last_login_at }`

### PUT `/API/USER/me`

Edita perfil. Si `email` cambia, valida formato y unicidad contra otros usuarios antes de aplicar.

**Errores:** `400 INVALID_EMAIL` · `409 EMAIL_TAKEN` · `500 UPDATE_FAILED` / `INTERNAL_ERROR`

### POST `/API/USER/avatar/init`

Genera una SAS URL de subida directa a Blob para el avatar (`avatars/{userId}/avatar.{ext}`), mismo
patrón que `/AIServices/Speechv2/init` para audio pero para imágenes de perfil.

**Body:** `{ "ext": "jpg" }` (opcional, default `jpg`)

**Respuesta exitosa:** `201 Created` → `{ upload_url, avatar_url }`

---

### GET `/health`

Chequeo de salud — verifica Postgres, Azure Queue y Azure Blob (`health_service`, montado en
`req.app.locals`). `200` si los tres están arriba, `503` si alguno falla.

### GET `/version`

Metadata estática de la API (versión, servicios, límites de audio) — no requiere auth.

---

## Seguridad

- JWT requerido en todos los endpoints excepto `register`, `login` y `refresh`
- El `user_id` extraído del token se valida contra el payload (no se acepta user_id enviado por el cliente)
- Emails indexados como case-insensitive (`lower(email)`) para evitar duplicados por capitalización
- Rate limiting: 10 intentos/15min en login, 5 registros/hora, ambos por IP (`express-rate-limit`)
- Bloqueo de cuenta tras intentos fallidos (`ACCOUNT_LOCKED`) — umbral exacto no documentado, ver ISSUE-010

---

## Referencias cruzadas

- [[overview]] — Arquitectura general
- [[azure-function]] — El otro actor del sistema
- [[registration]] — Flujo de registro
- [[login]] — Flujo de login
- [[upload-audio]] — Flujo de subida y creación de job
- [[error-codes]] — Catálogo completo de errores
- `App/Knowledge/Reference/API-CLAUDE.md` — espejo del `CLAUDE.md` de este componente (nota: ese
  archivo documenta solo el subconjunto STT/Auth original — este archivo (`backend-api.md`) es la
  fuente más completa del vault para el endpoint surface real, incluyendo `/refresh`, `/API/USER/*`,
  `/download`, `/stream`, `/health`, `/version`, descubiertos al auditar directamente
  `App/API/src/routes/*.js`)
