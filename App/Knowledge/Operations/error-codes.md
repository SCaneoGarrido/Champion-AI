# Catálogo de Códigos de Error HTTP

tags: #operations #errors #api #http

---

## Formato estándar

Todos los errores siguen el envelope estándar. Ver [[ADR-004-response-envelope]].

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SCREAMING_SNAKE_CASE",
    "message": "Descripción legible"
  }
}
```

---

## Errores de autenticación y autorización

| HTTP | Código | Endpoint(s) | Descripción |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `/register`, `/login` | Campos faltantes en el body |
| 401 | `UNAUTHORIZED` | `/login` | Email o contraseña incorrectos |
| 401 | `INVALID_TOKEN` | Todos los endpoints protegidos | JWT ausente en el header |
| 403 | `TOKEN_EXPIRED` | Todos los endpoints protegidos | JWT inválido o expirado |
| 403 | `USER_MISMATCH` | `/SpeechToTextv2` | El `user_id` del token no coincide con el payload |

---

## Errores de registro

| HTTP | Código | Descripción |
|---|---|---|
| 409 | `CONFLICT` | El email ya está registrado |

---

## Errores de validación STT

| HTTP | Código | Descripción |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | `req_info` ausente en el body |
| 400 | `INVALID_STT_CONTEXT` | `req_info` o `audio_info` mal formados |
| 400 | `UNSUPPORTED_FORMAT` | Formato de audio no soportado (no es webm/mp4/m4a/mp3/wav/ogg) |
| 400 | `INVALID_SAMPLE_RATE` | Sample rate inválido (debe ser 8000/16000/44100/48000) |
| 400 | `DURATION_EXCEEDED` | Audio supera 10800 segundos (3 horas) |
| 400 | `INVALID_BLOB_URL` | `blob_url` ausente o expirada |

---

## Errores de recursos

| HTTP | Código | Descripción |
|---|---|---|
| 404 | `NOT_FOUND` | `job_id` no encontrado o sin resultado |

---

## Errores de procesamiento

| HTTP | Código | Descripción |
|---|---|---|
| 500 | `JOB_CREATION_FAILED` | No se pudo crear el job en BD |
| 500 | `QUEUE_SEND_FAILED` | No se pudo publicar el mensaje en Azure Queue |
| 500 | `INTERNAL_ERROR` | Error interno no clasificado |

---

## Códigos de error de la Azure Function

Estos códigos no son devueltos por la API directamente, sino almacenados en el campo `error_code` de `ai_job` y `ai_job_status_history`. Los expone el endpoint de polling.

| Código | Contexto |
|---|---|
| `STT_ENGINE_UNAVAILABLE` | Azure Speech no disponible durante transcripción |
| `QUEUE_SEND_FAILED` | Backend no pudo publicar en la queue (este sí aplica al backend) |

> **Nota:** El documento de arquitectura solo ejemplifica `STT_ENGINE_UNAVAILABLE`. Otros códigos de error de la Function no están documentados en las fuentes disponibles.

---

## Errores de guard (fn_can_process_ai_job)

Devueltos como `reason` en la función, no como errores HTTP:

| Código | Significado |
|---|---|
| `JOB_NOT_FOUND` | No existe el job en BD |
| `JOB_ALREADY_COMPLETED` | El job ya fue completado |
| `JOB_ALREADY_FAILED` | El job ya falló |
| `INVALID_JOB_STATUS` | Estado diferente a queued/processing |

---

## Referencia por endpoint

| Endpoint | Códigos posibles |
|---|---|
| `POST /register` | `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR` |
| `POST /login` | `VALIDATION_ERROR`, `UNAUTHORIZED`, `INTERNAL_ERROR` |
| `POST /init` | `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INTERNAL_ERROR` |
| `POST /SpeechToTextv2` | `INVALID_PAYLOAD`, `INVALID_STT_CONTEXT`, `UNSUPPORTED_FORMAT`, `INVALID_SAMPLE_RATE`, `DURATION_EXCEEDED`, `INVALID_BLOB_URL`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `USER_MISMATCH`, `JOB_CREATION_FAILED`, `INTERNAL_ERROR` |
| `GET /jobs/{id}/status` | `INVALID_TOKEN`, `TOKEN_EXPIRED`, `NOT_FOUND`, `INTERNAL_ERROR` |
| `GET /jobs/{id}/result` | `INVALID_TOKEN`, `TOKEN_EXPIRED`, `NOT_FOUND`, `INTERNAL_ERROR` |

---

## Referencias cruzadas

- [[ADR-004-response-envelope]] — Formato del envelope de respuesta
- [[backend-api]] — Endpoints y sus errores
- [[registration]] — Flujo de registro
- [[login]] — Flujo de login
- [[upload-audio]] — Flujo con más validaciones
- [[polling]] — Flujo de consulta de estado
