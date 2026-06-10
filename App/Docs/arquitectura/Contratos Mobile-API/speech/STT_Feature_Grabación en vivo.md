# 📡 CHAMPION AI — Contrato API + Arquitectura Real STT Live Recording
**Versión: 2.0 · Servicio: STT · Feature: live_recording**

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

# Flujo completo

---

## 1. Registro

```http
POST /auth/register
```

### Body

```json
{
  "email": "test@championai.app",
  "username": "test_user",
  "display_name": "Test User",
  "password": "Password123!"
}
```

### Backend hace

```txt
1. inserta sec_user
2. genera bcrypt hash
3. inserta sec_user_password
```

---

## 2. Login

```http
POST /auth/login
```

### Body

```json
{
  "email": "test@championai.app",
  "password": "Password123!"
}
```

### Response

```json
{
  "access_token": "jwt_token",
  "user": {
    "user_id": "uuid"
  }
}
```

---

# 3. Inicializar upload de audio

```http
POST /AIServices/Speechv2/init
Authorization: Bearer {jwt}
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
2. valida user_id
3. genera job_id
4. genera blob_name
5. genera SAS URL
```

---

## Response

```json
{
  "jobId": "job_123",
  "blobName": "audio/user_uuid/job_123/input.webm",
  "uploadUrl": "https://storage.blob.core.windows.net/audio/...",
  "expiresIn": 600
}
```

---

# 4. Subir archivo de audio

---

## Usando cURL

```bash
curl -X PUT "{uploadUrl}" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: audio/webm" \
  --data-binary "@audio_test.webm"
```

---

## Usando Postman

```txt
Method: PUT
Body: binary

Headers:
x-ms-blob-type: BlockBlob
Content-Type: audio/webm
```

---

# Ruta final en blob storage

```txt
audio/
   user_uuid/
      job_123/
         input.webm
```

---

# 5. Iniciar procesamiento

```http
POST /AIServices/Speechv2/SpeechToTextv2
Authorization: Bearer {jwt}
```

### Body

```json
{
  "req_info": {
    "job_id": "job_123",
    "service": "STT",
    "feature": "live_recording",
    "flow": "flow_live_recording",
    "language_info": {
      "locale": "es-CL",
      "locale_name": "Spanish (Chile)"
    },
    "audio": {
      "format": "webm",
      "sample_rate": 16000,
      "duration_seconds": 120,
      "blob_url": "https://storage.blob.core.windows.net/audio/..."
    }
  }
}
```

---

## Backend ejecuta

```txt
1. valida JWT
2. valida user_id
3. valida duración
4. valida formato
5. valida blob_url
6. ejecuta:
   sp_create_stt_live_recording_job
7. publica mensaje en Azure Queue
8. responde 202
```

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
  "job_id": "job_123",
  "user_id": "uuid",
  "blob_url": "...",
  "format": "webm",
  "sample_rate": 16000,
  "duration_seconds": 120,
  "locale": "es-CL"
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

# Polling de estado

```http
GET /AIServices/Speechv2/jobs/{job_id}/status
Authorization: Bearer {jwt}
```

Backend consulta:

```txt
vw_ai_job_current_status
```

---

## Response processing

```json
{
  "job_id": "job_123",
  "status": "processing",
  "current_step": "summary"
}
```

---

## Response completed

```json
{
  "job_id": "job_123",
  "status": "completed"
}
```

---

## Response failed

```json
{
  "job_id": "job_123",
  "status": "failed",
  "error_code": "STT_ENGINE_UNAVAILABLE"
}
```

---

# Obtener resultado final

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
Authorization: Bearer {jwt}
```

Backend consulta:

```txt
vw_stt_recording_result
```

---

## Response

```json
{
  "job_id": "job_123",
  "status": "completed",
  "result": {
    "transcription": "...",
    "summary": "...",
    "notes": "...",
    "mind_map": {}
  }
}
```

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
→ upload audio
→ create job
→ publish queue message
→ azure function trigger
→ process AI flow
→ save result
→ polling
→ fetch final result
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
```