# Champion AI — App Móvil (React Native / Expo)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Responsabilidad de este componente

La app móvil es la interfaz de usuario del sistema. Su única responsabilidad es:

1. Capturar o seleccionar audio del dispositivo
2. Coordinar el flujo de subida y procesamiento con la API
3. Mostrar el resultado al usuario

**No contiene lógica de negocio. No conoce Azure. No conoce PostgreSQL. No ejecuta IA.**

## Lo que la app sí conoce

- Los endpoints de la Champion API (HTTP + JWT)
- El protocolo de subida directa a Azure Blob via SAS URL
- El patrón de polling para consultar el estado de un job
- El contrato de respuesta `{ success, data, error }`

## Lo que la app no conoce ni debe conocer

- Azure Queue Storage (nunca publica mensajes)
- Azure Functions (no sabe que existen)
- PostgreSQL (no tiene acceso directo a la BD)
- Los modelos de IA que se usan internamente
- El estado interno del pipeline de procesamiento (solo ve: queued/processing/completed/failed)

## Arquitectura del componente

**Framework:** React Native con Expo

El estado de la aplicación debe reflejar el estado del servidor (los jobs son la fuente de verdad en PostgreSQL). No existe estado local de procesamiento independiente del servidor.

## Flujo completo que la app orquesta

```
1. Register / Login → obtener access_token (JWT)

2. POST /AIServices/Speechv2/init { format }
   → recibe { job_id, upload_url, expires_in }

3. PUT {upload_url} con headers:
   x-ms-blob-type: BlockBlob
   Content-Type: audio/{formato}
   → sube el audio DIRECTAMENTE a Azure Blob (no pasa por la API)

4. POST /AIServices/Speechv2/SpeechToTextv2 {
     req_info: { job_id, service, feature, flow, language_info },
     audio_info: { format, sample_rate, duration_seconds, blob_url }
   }
   → recibe 202 { job_id, polling_url }

5. Polling: GET /AIServices/Speechv2/jobs/{job_id}/status
   → repetir hasta status = "completed" o "failed"

6. GET /AIServices/Speechv2/jobs/{job_id}/result
   → recibe { transcription, summary, notes, mind_map }
```

## Consumo de la API

### Autenticación

Todos los endpoints protegidos requieren:
```
Authorization: Bearer {access_token}
```

El token se obtiene en `POST /API/AUTH/login`. La app **no debe enviar `user_id`** en ningún payload: el backend lo extrae del JWT.

### Manejo de respuestas

Todas las respuestas siguen el envelope estándar:
```json
{ "success": true|false, "data": <objeto|null>, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." }|null }
```

La app puede tener un interceptor HTTP único para manejar errores por `error.code`:

| Código | Acción sugerida |
|---|---|
| `TOKEN_EXPIRED` | Redirect a login |
| `UNAUTHORIZED` | Mostrar error de credenciales |
| `QUEUE_SEND_FAILED` | Ofrecer opción de reintento |
| `NOT_FOUND` | Mostrar que el job no existe |

### Validaciones que hace la API (no duplicar en el cliente)

| Campo | Restricción |
|---|---|
| `audio.format` | `webm \| mp4 \| m4a \| mp3 \| wav \| ogg` |
| `sample_rate` | `8000 \| 16000 \| 44100 \| 48000` |
| `duration_seconds` | Entre 1 y 10800 (3 horas) |
| `blob_url` | Presente y no expirada |

## Estrategia de polling

```
1. Esperar N segundos antes del primer poll
2. GET /jobs/{job_id}/status
3. Si "processing" → esperar y repetir
4. Si "completed" → ir a paso 5
5. Si "failed"    → mostrar error_code al usuario
6. GET /jobs/{job_id}/result → mostrar resultados
```

El intervalo de polling no está documentado en la arquitectura. No existe WebSocket ni push notification en el sistema actual.

## Upload directo a Azure Blob

La app hace `PUT` directamente a la `upload_url` recibida en el paso `/init`.

```
PUT {upload_url}
Headers:
  x-ms-blob-type: BlockBlob
  Content-Type: audio/{formato}
Body: [binario del audio]
```

La URL expira en **3600 segundos**. Si expira antes de que el usuario suba el audio, el flujo debe reiniciarse desde `/init`.

La API no valida que el audio exista en Blob antes de crear el job — la app debe garantizar que el upload fue exitoso (respuesta 201 de Azure Blob) antes de llamar a `SpeechToTextv2`.

## Reglas de UI

- La complejidad técnica (queues, procesamiento, IA) queda completamente oculta al usuario
- El usuario ve tres pasos: cargar contenido → procesar → obtener resultado
- El estado de procesamiento se muestra como: `queued` (en cola) / `processing` (procesando) / `completed` (listo) / `failed` (error)
- El `current_step` puede usarse para mostrar progreso más granular (transcripción → resumen → notas → mapa mental)

## Restricciones de desarrollo

- No agregar lógica de negocio en la app — si hay duda, va a la API
- No hardcodear `user_id` — siempre viene del JWT via la API
- No almacenar resultados de procesamiento localmente como fuente de verdad — siempre consultar la API
- No llamar directamente a Azure ni a PostgreSQL
- No asumir que el job existe después de un `202 Accepted` — el job puede fallar antes de llegar a la queue
