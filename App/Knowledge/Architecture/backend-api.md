# Backend API

tags: #architecture #backend #api #nodejs

---

## Descripción

La Champion API es el backend del sistema, desarrollado en **Node.js con Express.js**.
Es el único punto de entrada para la app móvil y el coordinador de todos los recursos externos.

Puerto: `http://localhost:5000` (`PORT` en `App/.env` — global, no `App/API/.env`)

---

## Responsabilidades

| Responsabilidad       | Detalle                                            |
| --------------------- | -------------------------------------------------- |
| Autenticación         | Registro y login con JWT                           |
| Autorización          | Validación de JWT en rutas protegidas              |
| Validación            | Verificación de payloads antes de actuar           |
| Generación de SAS URL | Acceso temporal a Azure Blob para subida de audio  |
| Creación de Jobs      | Via Stored Procedure, nunca DML directo            |
| Publicación en Queue  | Dispara el procesamiento async en Azure Function   |
| Polling               | Expone endpoints para consultar estado y resultado |

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

### Autenticación

| Método | Ruta | Auth | Status |
|---|---|---|---|
| POST | `/API/AUTH/register` | No | Implementado |
| POST | `/API/AUTH/login` | No | Implementado |

### STT — Speech to Text

| Método | Ruta | Auth | Status |
|---|---|---|---|
| POST | `/AIServices/Speechv2/init` | JWT | Implementado |
| POST | `/AIServices/Speechv2/SpeechToTextv2` | JWT | Implementado |
| GET | `/AIServices/Speechv2/jobs/{job_id}/status` | JWT | **Pendiente** |
| GET | `/AIServices/Speechv2/jobs/{job_id}/result` | JWT | **Pendiente** |

---

## Detalle de cada endpoint

### POST `/API/AUTH/register`

Crea un nuevo usuario en el sistema.

**Body:**
```json
{
  "email": "user@championai.app",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "password": "Password123!"
}
```

**Lógica interna:**
1. Inserta en `sec_user`
2. Genera hash bcrypt de la contraseña
3. Inserta en `sec_user_password`

**Respuesta exitosa:** `201 Created`

**Errores:**

| Status | Código | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos faltantes |
| 409 | `CONFLICT` | Email ya registrado |
| 500 | `INTERNAL_ERROR` | Error de servidor |

---

### POST `/API/AUTH/login`

Autentica al usuario y devuelve un JWT.

**Body:**
```json
{
  "email": "user@championai.app",
  "password": "Password123!"
}
```

**Respuesta exitosa:** `200 OK`
```json
{ "success": true, "data": { "access_token": "eyJ..." }, "error": null }
```

**Errores:**

| Status | Código | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email o password faltante |
| 401 | `UNAUTHORIZED` | Credenciales inválidas |
| 500 | `INTERNAL_ERROR` | Error de servidor |

> **Pendiente:** Tiempo de expiración del token y mecanismo de refresh no documentados.

---

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

### GET `/AIServices/Speechv2/jobs/{job_id}/status` — PENDIENTE

Consulta el estado actual del job. El backend consultará la vista `vw_ai_job_current_status`.

Ver [[polling]] y [[views]].

---

### GET `/AIServices/Speechv2/jobs/{job_id}/result` — PENDIENTE

Devuelve el resultado completo del job. El backend consultará la vista `vw_stt_recording_result`.

Ver [[polling]] y [[views]].

---

## Seguridad

- JWT requerido en todos los endpoints excepto `register` y `login`
- El `user_id` extraído del token se valida contra el payload (no se acepta user_id enviado por el cliente)
- Emails indexados como case-insensitive (`lower(email)`) para evitar duplicados por capitalización

---

## Referencias cruzadas

- [[overview]] — Arquitectura general
- [[azure-function]] — El otro actor del sistema
- [[registration]] — Flujo de registro
- [[login]] — Flujo de login
- [[upload-audio]] — Flujo de subida y creación de job
- [[error-codes]] — Catálogo completo de errores
