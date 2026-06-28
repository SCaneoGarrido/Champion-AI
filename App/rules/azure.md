# Reglas — Azure Services

Reglas para el uso de Azure Blob Storage, Azure Queue Storage y Azure AI en Champion AI.

## R-AZURE-01: Solo la Azure Function llama a Azure AI

Los servicios de Azure AI (Speech, OpenAI) son invocados **exclusivamente** desde la Azure Function.
La Champion API no tiene acceso ni debe tener acceso a estos servicios.

**Violación:** cualquier llamada a Azure Speech o Azure OpenAI desde código Express/Node.js de la API.

## R-AZURE-02: La API solo genera SAS URLs — no hace proxy de uploads

El flujo de upload es:
1. API genera SAS URL (`POST /init`) → la devuelve al cliente
2. Cliente sube directamente a Azure Blob con `PUT {sas_url}`
3. API no interviene en el paso 2

La API interactúa con Azure Blob **solo** para generar la SAS URL. No descarga ni sube archivos.

**Violación:** un endpoint que reciba el audio y lo suba a Blob, o que haga proxy del PUT del cliente.

## R-AZURE-03: Configuración de SAS URL

La SAS URL generada por la API debe tener estas características:
- Operación permitida: solo `PUT`
- Expiración: `3600` segundos (1 hora)
- Path: `audio/{user_uuid}/{job_id}/{job_id}.{formato}`
- Scoped al blob específico — no un SAS de contenedor completo

## R-AZURE-04: Headers requeridos para upload a Blob

El cliente debe enviar estos headers al hacer `PUT` a la SAS URL:
```
x-ms-blob-type: BlockBlob
Content-Type: audio/{formato}
```

Si se documenta o se generan ejemplos de código de upload, incluir siempre estos headers.

## R-AZURE-05: Formatos de audio soportados

Los formatos válidos están definidos por constraint en la BD (`chk_stt_recording_audio_format`):

| Formato | MIME type |
|---|---|
| `webm` | `audio/webm` |
| `mp4` | `audio/mp4` |
| `m4a` | `audio/m4a` |
| `mp3` | `audio/mp3` |
| `wav` | `audio/wav` |
| `ogg` | `audio/ogg` |

No agregar formatos sin actualizar el constraint de la BD.

## R-AZURE-06: Path de blobs es inmutable por job

El path en Azure Blob (`audio/{user_uuid}/{job_id}/{job_id}.{formato}`) se define en el momento del `init` y no cambia. La Azure Function descarga desde `blob_url` almacenado en `stt_recording.blob_url`.

No generar paths dinámicos en la Function — usar siempre el `blob_url` del contexto del job.

## R-AZURE-07: El mensaje en la queue es mínimo

El mensaje publicado en `champion-ai-stt-live-recording` contiene solo:
```json
{ "job_id": "job_{uuid}" }
```

No agregar más campos al mensaje. La Azure Function obtiene el contexto completo de PostgreSQL via `fn_get_stt_live_recording_job_context`. Esto mantiene la queue como canal de señal, no de datos.

## R-AZURE-08: At-least-once delivery — diseñar para redelivery

Azure Queue no garantiza exactly-once. Todo código que procese mensajes de la queue debe:
1. Verificar idempotencia al inicio (`fn_can_process_ai_job`)
2. Usar SPs con `ON CONFLICT DO UPDATE` para escrituras

No asumir que el mensaje llega exactamente una vez.

## R-AZURE-09: Cada nueva feature de IA tiene su propia queue

El nombre de la queue define el bounded context del servicio.
La queue actual es `champion-ai-stt-live-recording` (servicio STT, feature live_recording).

Si se agrega una nueva feature (ej. TTS), crear una nueva queue con naming consistente:
```
champion-ai-{servicio}-{feature}
```

No reutilizar la queue existente para features diferentes.

## R-AZURE-10: Manejo de fallos al publicar en queue

Si la API no puede publicar en la queue después de crear el job en BD:
```
sp_update_ai_job_status_v1(
  p_job_id     => '{job_id}',
  p_status     => 'failed',
  p_error_code => 'QUEUE_SEND_FAILED'
)
```

El job queda en `failed` inmediatamente. No dejar un job en `queued` si el encolamiento falló.

## R-AZURE-11: El idioma es un parámetro del job — no está hardcodeado

Azure Speech soporta múltiples idiomas vía `language_locale`. El valor por defecto en la BD es `es-CL`.
La Function obtiene el `language_locale` desde el contexto del job — no hardcodear `es-CL` en el código de la Function.
