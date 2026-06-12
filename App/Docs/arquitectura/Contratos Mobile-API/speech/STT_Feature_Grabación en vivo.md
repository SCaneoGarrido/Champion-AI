# CHAMPION AI — Contrato API + Arquitectura Real STT Live Recording
**Versión: 3.0 · Servicio: STT · Feature: live_recording**

> **v3.0 — Contrato de respuestas estandarizado.**
> Todas las respuestas siguen la estructura `{ success, data, error }`.
> Ver `App/Docs/analisis_contrato_respuestas_HTTP.md` para el análisis completo.

---

# Arquitectura final real

```txt
Cliente (Postman / futura app móvil)
        ↓
Champion API (Node/Express)
        ↓
PostgreSQL
        ↓
Azure Queue
        ↓
Azure Function (Queue Trigger)
        ↓
Azure Speech + Azure OpenAI + Blob Storage
        ↓
PostgreSQL
        ↓
Champion API (polling/result endpoints)
        ↓
Cliente
```

---

# Responsabilidades por capa

## Cliente

Responsable de:

- grabar audio
- solicitar URL de subida
- subir audio
- iniciar procesamiento
- consultar estado
- consultar resultado final

---

## Backend Node/Express

Responsable de:

- autenticación
- JWT
- validación de payloads
- generación de SAS URL
- creación de jobs
- publicación en Azure Queue
- exponer endpoints de polling

---

## PostgreSQL

Responsable de:

- persistir jobs
- historial
- recordings
- resultados finales

---

## Azure Function

Responsable de:

- consumir mensajes desde Azure Queue
- descargar audio
- ejecutar STT
- generar summary
- generar notes
- generar mind map
- actualizar PostgreSQL vía Stored Procedures

---

# Base de datos final

```txt
sec_user
sec_user_password

ai_job
ai_job_status_history

stt_recording
stt_recording_result
```

---

# Relaciones finales

```txt
sec_user 1 ---- N sec_user_password
(1 sola password activa)

sec_user 1 ---- N ai_job

ai_job 1 ---- N ai_job_status_history

ai_job 1 ---- 0..1 stt_recording

stt_recording 1 ---- 0..1 stt_recording_result
```

---

# Resultado final del flujo

```txt
1 job
→ 1 recording
→ 1 result consolidado
```

---

## `stt_recording_result` contiene

```txt
transcription_text
summary_text
notes_text
notes_json
mind_map_json
raw_result_json
```

---

# Contrato de Respuesta Estándar

Todas las respuestas de la API siguen esta estructura:

```json
{
  "success": true | false,
  "data": <objeto | array | null>,
  "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } | null
}
```

- Si `success: true` → `error` es `null`
- Si `success: false` → `data` es `null`

---

# Flujo completo

---

## 1. Registro

```http
POST /API/AUTH/register
```

### Body

```json
{
  "email": "test@championai.app",
  "first_name": "Test",
  "last_name": "User",
  "password": "Password123!"
}
```

### Backend hace

```txt
1. inserta sec_user
2. genera bcrypt hash
3. inserta sec_user_password
```

### Response — 201 Created

```json
{
  "success": true,
  "data": {
    "message": "Usuario creado satisfactoriamente."
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Campos faltantes en el body |
| 409 | `CONFLICT` | El correo ya está registrado |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONFLICT",
    "message": "El correo electrónico ya está registrado."
  }
}
```

---

## 2. Login

```http
POST /API/AUTH/login
```

### Body

```json
{
  "email": "test@championai.app",
  "password": "Password123!"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | email o password faltante |
| 401 | `UNAUTHORIZED` | Credenciales inválidas |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

---

# 3. Inicializar upload de audio

```http
POST /AIServices/Speechv2/init
Authorization: Bearer {access_token}
```

### Body

```json
{
  "req_info": {
    "audio": {
      "format": "webm"
    }
  }
}
```

---

## Backend hace

```txt
1. valida JWT
2. extrae user_id
3. genera job_id
4. genera blob_name
5. genera SAS URL (upload_url)
6. construye blob_url permanente
```

---

## Response — 201 Created

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "blob_name": "job_550e8400-e29b-41d4-a716-446655440000.webm",
    "upload_url": "https://storage.blob.core.windows.net/audio/...?sv=...&sig=...",
    "expires_in": 3600
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 500 | `INTERNAL_ERROR` | Error al generar URL o construir blob |

---

# 4. Subir archivo de audio

El cliente sube directamente a Azure Blob usando la `upload_url` del paso anterior. El backend no interviene en este paso.

---

## Usando cURL

```bash
curl -X PUT "{upload_url}" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: audio/webm" \
  --data-binary "@audio_test.webm"
```

---

## Usando Postman

```txt
Method: PUT
URL: {upload_url}
Body: binary

Headers:
x-ms-blob-type: BlockBlob
Content-Type: audio/webm
```

---

# Ruta final en blob storage

```txt
audio/
   {user_uuid}/
      {job_id}/
         {job_id}.webm
```

---

# 5. Iniciar procesamiento

```http
POST /AIServices/Speechv2/SpeechToTextv2
Authorization: Bearer {access_token}
```

### Body

```json
{
  "req_info": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "service": "STT",
    "feature": "live_recording",
    "flow": "flow_live_recording",
    "language_info": {
      "locale": "es-CL",
      "locale_name": "Spanish (Chile)"
    }
  },
  "audio_info": {
    "format": "webm",
    "sample_rate": 16000,
    "duration_seconds": 120,
    "blob_url": "https://storage.blob.core.windows.net/audio/..."
  }
}
```

---

## Backend ejecuta

```txt
1. valida JWT
2. extrae user_id
3. valida req_info (validateSTTRequest)
4. valida audio_info (validateAudio):
   - formato permitido
   - sample_rate válido (8000 | 16000 | 44100 | 48000)
   - duración <= 10800 segundos
   - blob_url presente y no expirada
5. ejecuta sp_create_stt_live_recording_job
6. publica mensaje en Azure Queue
7. responde 202
```

---

## Response — 202 Accepted

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "accepted",
    "flow": "flow_live_recording",
    "polling_url": "/AIServices/Speechv2/jobs/job_550e8400-e29b-41d4-a716-446655440000/status",
    "created_at": "2026-06-12T10:00:00.000Z"
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 400 | `INVALID_PAYLOAD` | req_info ausente |
| 400 | `INVALID_STT_CONTEXT` | req_info o audio_info mal formados |
| 400 | `UNSUPPORTED_FORMAT` | Formato de audio no soportado |
| 400 | `INVALID_SAMPLE_RATE` | sample_rate inválido |
| 400 | `DURATION_EXCEEDED` | Audio supera 3 horas |
| 400 | `INVALID_BLOB_URL` | blob_url ausente o expirada |
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 403 | `USER_MISMATCH` | user_id del token no coincide con el payload |
| 500 | `JOB_CREATION_FAILED` | No se pudo crear el job en BD |
| 500 | `INTERNAL_ERROR` | Error interno no clasificado |

---

# Stored Procedure: `sp_create_stt_live_recording_job`

Inserta:

```txt
ai_job
ai_job_status_history
stt_recording
```

Estado inicial:

```txt
queued
```

---

# Publicación en Azure Queue

Queue:

```txt
champion-ai-stt-live-recording
```

Mensaje:

```json
{
  "job_id": "job_550e8400-e29b-41d4-a716-446655440000"
}
```

---

# Si falla envío a queue

Backend ejecuta:

```txt
sp_update_ai_job_status
```

Marca:

```txt
status = failed
error_code = QUEUE_SEND_FAILED
```

---

# Azure Function (Queue Trigger)

Trigger:

```txt
champion-ai-stt-live-recording
```

---

## Azure Function ejecuta

```txt
1. consume mensaje
2. descarga audio
3. transcribe
4. genera summary
5. genera notes
6. genera mind map
7. guarda resultado
8. marca completed
```

---

# Azure Function actualiza PostgreSQL DIRECTAMENTE

Azure Function NO llama al backend.

Azure Function usa conexión directa a PostgreSQL.

---

# Regla importante

Azure Function SOLO puede ejecutar:

```txt
Stored Procedures
```

Nunca:

```txt
UPDATE manual
INSERT manual
DELETE manual
```

---

# Stored Procedure para actualizar estado

```sql
sp_update_ai_job_status(...)
```

Actualiza:

```txt
ai_job
ai_job_status_history
```

---

# Estados válidos

```txt
queued
processing
completed
failed
```

---

# Steps válidos

```txt
transcription
summary
notes
mind_map
```

---

# Flujo interno de estados

```txt
queued
→ processing/transcription
→ processing/summary
→ processing/notes
→ processing/mind_map
→ completed
```

---

# Si falla Azure Function

Ejecuta:

```sql
sp_update_ai_job_status(...)
```

Con:

```txt
status = failed
```

Ejemplo:

```txt
error_code = STT_ENGINE_UNAVAILABLE
```

---

# Guardar resultado final

Azure Function ejecuta:

```sql
sp_complete_stt_live_recording_job(...)
```

Este SP:

```txt
1. guarda stt_recording_result
2. actualiza ai_job
3. inserta historial completed
```

---

# Importante: idempotencia

Azure Queue puede reenviar mensajes.

Por eso:

```txt
sp_complete_stt_live_recording_job
```

debe soportar:

```sql
ON CONFLICT DO UPDATE
```

para evitar duplicados.

---

# 6. Polling de estado

```http
GET /AIServices/Speechv2/jobs/{job_id}/status
Authorization: Bearer {access_token}
```

> **Estado:** Pendiente de implementación en el router.

Backend consulta:

```txt
vw_ai_job_current_status
```

---

## Response — processing (200 OK)

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "current_step": "summary"
  },
  "error": null
}
```

---

## Response — completed (200 OK)

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "completed"
  },
  "error": null
}
```

---

## Response — failed (200 OK)

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "failed",
    "error_code": "STT_ENGINE_UNAVAILABLE"
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 404 | `NOT_FOUND` | job_id no encontrado |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

---

# 7. Obtener resultado final

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
Authorization: Bearer {access_token}
```

> **Estado:** Pendiente de implementación en el router.

Backend consulta:

```txt
vw_stt_recording_result
```

---

## Response — 200 OK

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result": {
      "transcription": "...",
      "summary": "...",
      "notes": "...",
      "mind_map": {}
    }
  },
  "error": null
}
```

### Errores posibles

| Status | code | Descripción |
|--------|------|-------------|
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 404 | `NOT_FOUND` | job_id no encontrado o sin resultado |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

---

# Stored Procedures finales

```txt
sp_create_stt_live_recording_job
sp_update_ai_job_status
sp_complete_stt_live_recording_job
```

---

# Flujo end-to-end resumido

```txt
register
→ login
→ init upload
→ upload audio (directo a Azure Blob)
→ create job (SpeechToTextv2)
→ publish queue message
→ azure function trigger
→ process AI flow
→ save result
→ polling de estado
→ fetch resultado final
```

---

# Beneficios de esta arquitectura

```txt
✔ backend desacoplado de procesamiento pesado
✔ azure escala automáticamente
✔ menos carga HTTP sobre la API
✔ trazabilidad completa en PostgreSQL
✔ arquitectura preparada para futuras features
✔ fácil de testear sin UI
✔ contrato de respuestas uniforme en todos los endpoints
```
