# BUG-001: Fast Transcription 422 (InvalidAudioFormat) por grabaciones m4a corruptas

tags: #bugs #stt #speech #audio #mobile #azure

---

## Resumen

Dos jobs de `stt_live_recording`, grabados en condiciones aparentemente idénticas (capturando con el micrófono del dispositivo el audio de una videoclase reproducida por los parlantes de la computadora), tuvieron resultados distintos: uno completó el pipeline entero sin problemas y el otro falló en el primer paso (`transcription`) con un 422 de Azure AI Speech Fast Transcription.

- Job exitoso: `7926a6f0-581f-4392-ac47-b2d2256d2a3b` — 9.76 MB, transcripción completada en 25.8s.
- Job fallido: `f8a2fa49-0cfe-4c9f-946e-bffd986960a0` — 13.92 MB, falló a los 7s con `RuntimeError: Fast Transcription error 422`.

---

## Síntoma

```
Fast Transcription iniciada — idioma: es-ES | formato declarado: m4a |
formato real: mp4/m4a (brand=b'M4A ' codec=codec-unknown) | 13.92 MB

RuntimeError: Fast Transcription error 422:
{"code":"UnprocessableEntity","message":"The audio stream could not be decoded with the provided configuration.",
 "innerError":{"code":"InvalidAudioFormat","message":"The audio stream could not be decoded with the provided configuration."}}
```

El detalle clave: la detección de formato en `speech_service.py::_detect_audio_format` (`App/procesamiento/shared/services/speech_service.py:45-73`) reporta el **mismo** resultado (`mp4/m4a`, brand `M4A `, codec desconocido) tanto en el job exitoso como en el fallido. Esta función solo lee los primeros 12 bytes y escanea los primeros 256 KB en busca de un tag de códec — no valida la estructura interna del contenedor MP4. Por eso el archivo corrupto pasa la detección sin ninguna señal de alerta y solo se descubre el problema cuando Azure intenta decodificarlo.

---

## Investigación y descarte de hipótesis

Se investigaron dos rutas posibles de corrupción:

### 1. Corrupción en la subida por bloques (descartada)

`uploadBlobInChunks()` en `App/Mobile/src/utils/speechApi.js:75-149` sube el archivo en bloques de 4 MB vía Azure Block Blob (`PutBlock` + `PutBlockList`). El archivo fallido necesitó 4 bloques (13.92 MB) contra 3 del exitoso (9.76 MB), lo cual era sospechoso en un primer análisis.

**Se descartó** volviendo a subir el mismo archivo local ya fallado a través del flujo legado `submitRecordingToSpeechPipeline()` (`App/Mobile/src/utils/speechApi.js:195-253`), que hace un único `PUT` sin fragmentar. El resultado fue el **mismo error 422**. Si la corrupción hubiera ocurrido en tránsito durante la subida fragmentada, subir los mismos bytes por un mecanismo distinto (sin chunks) debería haber funcionado. No fue así, por lo tanto la corrupción ya estaba presente en el archivo local antes de cualquier subida.

### 2. Corrupción en la grabación local (confirmada como causa más probable)

El usuario reportó que, durante el envío/grabación de este audio en particular, la laptop desde la que se reproducía la videoclase (y sobre la que corre el entorno de desarrollo/emulador) se apagó sin que se notara en el momento.

La hipótesis más consistente con la evidencia: el proceso de grabación (`expo-av`, preset `HIGH_QUALITY`, contenedor MP4/AAC) fue interrumpido abruptamente antes de poder finalizar limpiamente el archivo. En contenedores MP4/M4A, el átomo `moov` (que contiene las tablas de muestras y la configuración del códec) muchas veces se escribe o finaliza recién al cerrar la grabación correctamente. Si el proceso muere antes de ese cierre:

- El header inicial (`ftyp`) queda intacto → la detección superficial por magic bytes sigue reportando "parece m4a válido".
- El `moov` queda ausente, truncado o inconsistente → reproductores locales tolerantes pueden abrir el archivo igual, pero el decoder estricto de Fast Transcription lo rechaza con `InvalidAudioFormat`.

Esto explica perfectamente por qué ambos jobs muestran la misma firma de detección de formato pero solo uno decodifica correctamente: el defecto está más profundo que lo que la detección actual puede ver.

---

## Causa raíz

Grabación de audio finalizada de forma anómala (corte de energía/proceso durante la grabación), que produce un archivo `.m4a` con contenedor MP4 estructuralmente inválido (probable `moov` ausente o truncado) pero con header inicial válido. El archivo se sube exitosamente a Azure Blob (la subida en sí no falla, sea por bloques o de una vez) y recién se detecta como inválido cuando Azure AI Speech Fast Transcription intenta decodificarlo, en el primer paso del pipeline.

No es un bug de red, de la subida fragmentada, ni del backend — es un archivo fuente dañado en el origen (dispositivo de grabación).

---

## Soluciones propuestas (pendientes de implementación)

Ordenadas por relación costo/beneficio:

### 1. Validación local antes de subir (mobile) — prioridad alta

- Mínimo: en `AudioFileUploader.jsx::getAudioDurationSeconds` (`App/Mobile/src/components/AudioFileUploader.jsx`), tratar un fallo de `Audio.Sound.createAsync` como señal dura de archivo corrupto en vez de caer silenciosamente a un default de 60s — hoy ese catch enmascara justamente la señal que hubiera detectado este caso.
- Más robusto: parsear la estructura de cajas MP4 localmente (confirmar presencia de `moov` con tablas de muestra no vacías) antes de subir. Evita gastar una subida completa + un pipeline entero de IA en un archivo condenado a fallar en el primer paso.

### 2. Manejo explícito de interrupciones durante la grabación (mobile) — prioridad media

`useLiveSTTRecorder.js` (`App/Mobile/src/hooks/useLiveSTTRecorder.js`) configura `staysActiveInBackground: false` pero no escucha `AppState` ni eventos de interrupción de sesión de audio. Detectar backgrounding/interrupciones durante una grabación en curso y advertir o descartar la toma, en lugar de finalizarla y subirla como si nada hubiera pasado.

### 3. Código de error propio y no reintentable (Azure Function) — prioridad alta

Hoy `stt_live_recording.py` (`App/procesamiento/orchestrators/stt_live_recording.py:42-56`) captura cualquier excepción de `transcribe_audio` y la clasifica siempre como `STT_ENGINE_UNAVAILABLE` — el mismo código para una caída real del servicio de Azure que para un archivo corrupto del usuario. Esto es engañoso (sugiere "reintentar más tarde" cuando reintentar un archivo corrupto siempre va a fallar igual) y hace que el smart retry desperdicie un intento en algo que nunca puede tener éxito.

Propuesta: agregar un código nuevo en `ErrorCode` (`App/procesamiento/shared/utils/constants.py:21-28`), por ejemplo `INVALID_AUDIO_FILE`, mapeado específicamente desde el `innerError.code == "InvalidAudioFormat"` de la respuesta 422 de Fast Transcription, marcado como no reintentable (`p_retryable = false` en `sp_update_ai_job_status_v1`). Esto permite que la app móvil muestre un mensaje correcto ("esta grabación está dañada, volvé a grabarla") en lugar de ofrecer un reintento inútil. Ver [[error-codes]].

### 4. Detección profunda de formato en el servidor (Azure Function) — prioridad media

Reemplazar la detección superficial por magic bytes en `_detect_audio_format` (`App/procesamiento/shared/services/speech_service.py:45-73`) por un parseo real de cajas MP4 (verificar presencia y sanidad de `moov`/`stbl`/`stsz`/`stco`), antes incluso de llamar a la API de Azure. No previene la corrupción, pero la vuelve diagnosticable en el log ("moov ausente — probable grabación interrumpida") en vez de un 422 opaco, y potencialmente permite fallar rápido sin gastar la llamada de red a Azure.

### 5. Resiliencia de transporte adicional (mobile) — prioridad baja

Aunque se descartó como causa de este caso puntual, `uploadBlobInChunks()` (`App/Mobile/src/utils/speechApi.js:75-149`) no tiene reintentos por bloque ni verificación de integridad post-commit (comparar tamaño/hash del archivo local contra las propiedades del blob subido). Vale la pena para resiliencia general ante cortes de red reales, pero no es prioritario para este bug específico.

---

## Referencias

- [[speech-to-text]] — Feature STT y su pipeline
- [[stt-processing]] — Flujo de procesamiento en la Azure Function
- [[error-codes]] — Catálogo de códigos de error
- [[ADR-007-fast-transcription]] — Decisión de usar Fast Transcription REST API
- [[upload-audio]] — Flujo de subida directa a Azure Blob
- `App/procesamiento/shared/services/speech_service.py` — detección de formato y llamada a Fast Transcription
- `App/Mobile/src/utils/speechApi.js` — subida por bloques y flujo legado de subida de archivo
- `App/Mobile/src/components/AudioFileUploader.jsx` — feature "Desde un archivo", usada para reproducir el bug con subida sin fragmentar
