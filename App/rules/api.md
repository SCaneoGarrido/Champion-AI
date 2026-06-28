# Reglas — Champion API

Reglas específicas para el componente `App/API/`. Aplicar siempre al revisar o escribir código de la API.

## R-API-01: Contrato de respuesta invariante

Toda respuesta HTTP de la API, sin excepción, debe seguir:

```json
{ "success": true|false, "data": <objeto|null>, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." }|null }
```

- `success: true` → `error` es `null`
- `success: false` → `data` es `null`
- `error.code` siempre en `SCREAMING_SNAKE_CASE`

**Violación:** devolver estructuras alternativas, errores sin envelope, o `{ message }` directo.

## R-API-02: JWT antes que cualquier otra operación

En todo endpoint protegido, la validación del JWT es el primer paso.
Si el JWT es inválido o está ausente, responder inmediatamente sin continuar.

**Violación:** hacer cualquier operación (query, validación de payload, etc.) antes de verificar el JWT.

## R-API-03: user_id siempre del token

El `user_id` se extrae del payload del JWT. Nunca se acepta del body del cliente.
Si el cliente envía un `user_id` en el payload, debe validarse contra el del token — si no coincide → `403 USER_MISMATCH`.

**Violación:** confiar en un `user_id` enviado por el cliente sin validación contra el JWT.

## R-API-04: Escritura en tablas de dominio solo via Stored Procedures

Las tablas de dominio (`ai_job`, `ai_job_status_history`, `stt_recording`, `stt_recording_result`) no reciben DML directo desde la API.

Usar:
- `sp_create_stt_live_recording_job_v1` — crear job STT
- `sp_update_ai_job_status_v1` — actualizar estado (solo en caso de fallo de queue)

**Excepción documentada:** Las tablas `sec_user` y `sec_user_password` reciben INSERT directo en el flujo de registro (no existe SP de registro documentado).

**Violación:** `INSERT INTO ai_job`, `UPDATE stt_recording`, etc. desde el código de la API.

## R-API-05: La API no procesa IA

La API nunca llama a Azure Speech, Azure OpenAI, ni ningún servicio de IA.
Si una feature requiere procesamiento de IA → diseñarla como job async (queue + Azure Function).

**Violación:** llamar a cualquier SDK de Azure AI desde un endpoint Express.

## R-API-06: La API no recibe binarios de audio

El audio va directo del cliente a Azure Blob via SAS URL. La API genera la SAS URL pero nunca recibe el archivo.

**Violación:** un endpoint que reciba `multipart/form-data` con audio, o que haga proxy del upload.

## R-API-07: Responder 202 inmediatamente al enqueue

Una vez que el job está en BD y el mensaje publicado en la queue, responder `202 Accepted` sin esperar el procesamiento.

Si el enqueue falla:
1. Ejecutar `sp_update_ai_job_status_v1(status='failed', error_code='QUEUE_SEND_FAILED')`
2. Responder `500 INTERNAL_ERROR`

**Violación:** esperar la finalización del procesamiento antes de responder, o no registrar el fallo en BD si la queue falla.

## R-API-08: Validaciones en orden correcto

Para `POST /AIServices/Speechv2/SpeechToTextv2`, las validaciones deben ocurrir en este orden:
1. JWT válido
2. `user_id` del token vs payload
3. Presencia de `req_info` y `audio_info`
4. Formato de audio permitido
5. Sample rate válido
6. Duración dentro de límites
7. `blob_url` presente y no expirada

Responder con el código de error correspondiente al primer fallo encontrado.

## R-API-09: Polling usa vistas — no queries directas

Los endpoints de polling consultan las vistas, no las tablas directamente:
- `GET /jobs/{id}/status` → `vw_ai_job_current_status`
- `GET /jobs/{id}/result` → `vw_stt_recording_result`

**Violación:** escribir JOINs ad-hoc entre `ai_job`, `ai_job_status_history`, etc. en el código de la API.

## R-API-10: Códigos HTTP consistentes

| Situación | HTTP Status |
|---|---|
| Recurso creado | 201 |
| Job encolado (async) | 202 |
| Éxito sin creación | 200 |
| Validación fallida | 400 |
| Sin autenticación | 401 |
| Token inválido / mismatch | 403 |
| Recurso no encontrado | 404 |
| Duplicado | 409 |
| Error interno | 500 |
