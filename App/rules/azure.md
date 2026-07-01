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

El mensaje publicado en `championaiqueue` contiene solo:
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
La queue actual es `championaiqueue` (servicio STT, feature live_recording).

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

## R-AZURE-11: Fast Transcription — sin conversión de formato de audio

La Azure Function envía el audio a Fast Transcription en su **formato original** tal como fue subido por el cliente (WebM, M4A, MP3, OGG, WAV, FLAC, AAC).

No se realiza conversión a WAV ni a ningún otro formato. No se usan librerías de conversión (PyAV, ffmpeg, etc.).

**Violación:** convertir el audio antes de enviarlo a Fast Transcription, o usar `azure-cognitiveservices-speech` SDK Continuous Recognition.

**Endpoint de Fast Transcription:**
```
POST https://{SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15
Headers: Ocp-Apim-Subscription-Key: {SPEECH_KEY}
Body: multipart/form-data
  audio: (bytes del archivo original, content-type apropiado)
  definition: {"locales": [language_locale], "profanityFilterMode": "None", "channels": [0]}
```

La URL se construye desde `SPEECH_REGION`, no desde `SPEECH_ENDPOINT` (que puede apuntar a un endpoint diferente).

## R-AZURE-11B: El idioma es un parámetro del job — no está hardcodeado

Fast Transcription soporta múltiples idiomas vía el campo `locales` en la `definition`. El valor por defecto en la BD es `es-CL`.
La Function obtiene el `language_locale` desde el contexto del job — no hardcodear `es-CL` en el código.

## R-AZURE-16: gpt-5-mini — parámetros de llamada

El modelo `gpt-5-mini` es un modelo de razonamiento con restricciones de API:

- No acepta el parámetro `temperature` — solo soporta el valor por defecto (1)
- Usar `max_completion_tokens` en lugar de `max_tokens`
- Los tokens de razonamiento interno cuentan contra el presupuesto de `max_completion_tokens`
- Valor configurado: `max_completion_tokens: 16384` — necesario para que haya tokens disponibles tras el razonamiento interno

**Violación:** pasar `temperature` a la llamada, usar `max_tokens`, o usar un valor bajo de `max_completion_tokens` que cause que el modelo agote el presupuesto en razonamiento y devuelva contenido vacío.

## R-AZURE-12: El pipeline de IA se implementa como Durable Function con Activities

Toda la lógica de procesamiento asíncrono de IA usa el patrón **Orchestrator + Activities** de Azure Durable Functions.

- El **orquestador** define el flujo de pasos (secuencia, manejo de errores). No contiene I/O.
- Cada **activity** encapsula una operación atómica con I/O (BD, blob, API de IA).
- El orquestador llama activities por nombre de función (string) — ese nombre es el nombre de la función Python.

**Violación:** ejecutar llamadas a Azure Speech, OpenAI o PostgreSQL directamente en el orquestador.

## R-AZURE-13: Cada activity vive en su propio archivo bajo `activities/`

Las activities se organizan por dominio funcional dentro de `App/procesamiento/activities/`:

| Archivo | Responsabilidad |
|---|---|
| `context_activity.py` | Guard de idempotencia y actualización de estado |
| `transcription_activity.py` | Descarga de audio y transcripción Azure Speech |
| `ai_activity.py` | Generación de resumen, notas y mapa mental via OpenAI |
| `completion_activity.py` | Persistencia del resultado y cierre del job |

Cada archivo tiene su propio `bp = df.Blueprint()` con sus activities registradas.

Al agregar una nueva activity: crear o usar el archivo de dominio correspondiente, nunca poner activities dentro del orquestador.

## R-AZURE-14: `function_app.py` es el único punto de registro de blueprints

Todos los blueprints (orquestador, activities, triggers) se registran en `function_app.py` via `app.register_functions(bp)`.

No importar ni registrar blueprints en otros lugares. El orden de registro no importa para Durable Functions, pero se mantiene por legibilidad: orquestador → activities (por dominio) → trigger.

## R-AZURE-15: Los datos que pasan entre orquestador y activities deben ser JSON-safe

Los valores retornados por las activities son serializados a JSON por el runtime de Durable Functions. Solo se pueden retornar tipos JSON-nativos: `str`, `int`, `float`, `bool`, `list`, `dict`, `None`.

- Convertir `uuid.UUID` → `str()`
- Convertir `datetime` → `.isoformat()`
- Convertir `Decimal` → `float()` o `str()`
- No retornar objetos psycopg2 sin convertir (`RealDictRow`, etc.)

Solo extraer del contexto de BD los campos que el orquestador realmente usa.
