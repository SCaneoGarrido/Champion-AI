# Champion AI — Backend API (Node.js / Express)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Responsabilidad de este componente

La Champion API es el **orquestador** del sistema. Es el único punto de entrada para la app móvil.

**Orquesta. No procesa. No ejecuta IA. No recibe binarios.**

## Puerto y acceso

Puerto: `5051` (configurable via `.env`)
Autenticación: JWT en todos los endpoints excepto `/API/AUTH/register` y `/API/AUTH/login`

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

Nunca romper este contrato. Nunca devolver una estructura diferente por conveniencia.

## Endpoints implementados

### Autenticación

| Método | Ruta | Auth | Status | Código HTTP |
|---|---|---|---|---|
| POST | `/API/AUTH/register` | No | Implementado | 201 |
| POST | `/API/AUTH/login` | No | Implementado | 200 |

### STT — Speech to Text

| Método | Ruta | Auth | Status | Código HTTP |
|---|---|---|---|---|
| POST | `/AIServices/Speechv2/init` | JWT | Implementado | 201 |
| POST | `/AIServices/Speechv2/SpeechToTextv2` | JWT | Implementado | 202 |
| GET | `/AIServices/Speechv2/jobs/{job_id}/status` | JWT | **Pendiente** | 200 |
| GET | `/AIServices/Speechv2/jobs/{job_id}/result` | JWT | **Pendiente** | 200 |

## Detalle de cada endpoint

### POST /API/AUTH/register

**Body:**
```json
{ "email": "...", "first_name": "...", "last_name": "...", "password": "..." }
```

**Lógica:**
1. Validar campos presentes
2. Verificar email no duplicado (case-insensitive via índice `uq_sec_user_email_lower`)
3. `INSERT` en `sec_user`
4. Hash bcrypt + `INSERT` en `sec_user_password`

**Errores:**

| HTTP | Código | Condición |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos faltantes |
| 409 | `CONFLICT` | Email ya registrado |
| 500 | `INTERNAL_ERROR` | Error no clasificado |

---

### POST /API/AUTH/login

**Body:** `{ "email": "...", "password": "..." }`

**Lógica:**
1. Buscar usuario por `lower(email)`
2. Verificar bcrypt hash
3. Generar JWT con `user_id`

**Respuesta:** `{ "success": true, "data": { "access_token": "eyJ..." }, "error": null }`

**Errores:**

| HTTP | Código | Condición |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email o password faltante |
| 401 | `UNAUTHORIZED` | Credenciales incorrectas |
| 500 | `INTERNAL_ERROR` | Error de servidor |

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
  "data": { "job_id": "job_...", "blob_name": "job_....webm", "upload_url": "https://...?sig=...", "expires_in": 3600 },
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

| Campo | Regla |
|---|---|
| JWT | Válido y no expirado |
| `user_id` | El del token debe coincidir con el job (no aceptar user_id del payload) |
| `req_info` | Presente y con subcampos requeridos |
| `audio.format` | `webm \| mp4 \| m4a \| mp3 \| wav \| ogg` |
| `sample_rate` | `8000 \| 16000 \| 44100 \| 48000` |
| `duration_seconds` | Entre 1 y 10800 |
| `blob_url` | Presente y no expirada |

**Lógica:**
1. Validar JWT y payload
2. `CALL sp_create_stt_live_recording_job_v1(...)` → job en estado `queued`
3. Publicar `{ "job_id": "..." }` en queue `champion-ai-stt-live-recording`
4. **Si la publicación falla:** `CALL sp_update_ai_job_status_v1(status='failed', error_code='QUEUE_SEND_FAILED')`

**Respuesta 202:**
```json
{
  "success": true,
  "data": { "job_id": "job_...", "status": "accepted", "flow": "flow_live_recording", "polling_url": "...", "created_at": "..." },
  "error": null
}
```

**Errores:**

| HTTP | Código | Condición |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | `req_info` ausente |
| 400 | `INVALID_STT_CONTEXT` | `req_info` o `audio_info` mal formados |
| 400 | `UNSUPPORTED_FORMAT` | Formato no soportado |
| 400 | `INVALID_SAMPLE_RATE` | Sample rate inválido |
| 400 | `DURATION_EXCEEDED` | Audio > 3 horas |
| 400 | `INVALID_BLOB_URL` | `blob_url` ausente o expirada |
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 403 | `USER_MISMATCH` | `user_id` del token no coincide |
| 500 | `JOB_CREATION_FAILED` | No se pudo crear el job |
| 500 | `INTERNAL_ERROR` | Error no clasificado |

---

### GET /AIServices/Speechv2/jobs/{job_id}/status — PENDIENTE

Consulta el estado actual del job via vista `vw_ai_job_current_status`.

**Respuestas posibles:**
```json
{ "success": true, "data": { "job_id": "...", "status": "processing", "current_step": "summary" }, "error": null }
{ "success": true, "data": { "job_id": "...", "status": "completed" }, "error": null }
{ "success": true, "data": { "job_id": "...", "status": "failed", "error_code": "STT_ENGINE_UNAVAILABLE" }, "error": null }
```

Vista a usar: `SELECT * FROM vw_ai_job_current_status WHERE job_id = $1 AND requested_by = $user_id`

---

### GET /AIServices/Speechv2/jobs/{job_id}/result — PENDIENTE

Devuelve resultado completo via vista `vw_stt_recording_result`.

Vista a usar: `SELECT * FROM vw_stt_recording_result WHERE job_id = $1 AND user_id = $user_id`

## Acceso a base de datos

La API accede a PostgreSQL mediante:

- **Stored Procedures** para escritura: `sp_create_stt_live_recording_job_v1`, `sp_update_ai_job_status_v1`
- **Vistas** para lectura: `vw_ai_job_current_status`, `vw_stt_recording_result`
- **DML directo** solo para auth (insert en `sec_user`, `sec_user_password`) — no existe SP de registro documentado

La API **nunca** hace DML directo en tablas de dominio de jobs (`ai_job`, `ai_job_status_history`, `stt_recording`, `stt_recording_result`).

## Seguridad

- JWT validado en cada endpoint protegido antes de cualquier operación
- `user_id` extraído del token — nunca aceptar del payload del cliente
- Emails indexados case-insensitive (`lower(email)`) para evitar duplicados por capitalización
- SAS URLs limitadas a operación `PUT` sobre blob específico, expiran en 3600s

## Catálogo de errores HTTP completo

Ver `App/rules/security.md` y `App/Knowledge/Operations/error-codes.md`.

## Reglas de desarrollo en este componente

- Cada nuevo endpoint debe validar JWT y usar el contrato `{ success, data, error }`
- Toda escritura a tablas de dominio → usar o crear un Stored Procedure
- La API no debe esperar el resultado de procesamiento IA — responder `202` y encolar
- Si falla el encolamiento, marcar el job como `failed` en BD antes de responder error al cliente
- No hardcodear valores de validación: los formatos de audio y sample rates válidos están en la BD (`chk_stt_recording_audio_format`, `chk_stt_recording_sample_rate`)
