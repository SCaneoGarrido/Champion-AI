# Roadmap — Features Pendientes

tags: #roadmap #pending #future

---

## Estado actual del sistema

| Feature | Estado |
|---|---|
| Auth (register + login) | Implementado |
| STT live_recording — pipeline completo | Implementado |
| STT — polling `/jobs/{id}/status` | Implementado |
| STT — resultado `/jobs/{id}/result` | Implementado |
| STT — retry de jobs fallidos | Implementado |
| STT — Smart retry (resume desde paso fallido) | Implementado |
| STT — Transcript Cleanup (GPT-5) | **Planificado — próxima implementación** |
| STT — Topic Extraction | **Roadmap** |
| Text to Speech (TTS) | Sin documentar |
| Gestión de Archivos | Sin documentar |

---

## Pipeline inteligente — evolución

Ver [[pipeline-roadmap]] para el detalle técnico completo de la evolución del pipeline.

Resumen:

| Fase | Etapa | Estado |
|---|---|---|
| 1 | Fast Transcription → Summary → Notes → Mind Map | Implementado |
| 2 | + Transcript Cleanup (GPT-5) | Planificado |
| 3 | + Topic Extraction | Roadmap |
| 4 | + Study Mode / Search / Citations / Flashcards / Quizzes | Visión |

---

## Transcript Cleanup (próxima implementación)

**Prioridad:** Alta — mejora la calidad de todos los outputs downstream

Paso de limpieza entre `transcription` y `summary` que usa GPT-5-mini para eliminar artefactos de voz (muletillas, repeticiones, frases incompletas) antes de que el texto sea procesado por los demás pasos.

**Requiere implementar:**
- `activities/cleanup_activity.py`
- `prompts/transcript_cleanup.md`
- Step name: `transcript_cleanup`
- Extensión de `stt_recording_result` con campo `transcript_clean_text`
- Extensión de `sp_save_stt_partial_result_v1`

Ver [[pipeline-roadmap]] para el diseño completo.

---

## Topic Extraction (roadmap)

**Prioridad:** Media-Alta — habilita la mayor parte del roadmap de experiencia de usuario

Extracción semántica de temas y capítulos con timestamps, basada en el texto limpio + los offsets de `phrases[]` que ya devuelve Fast Transcription.

Habilita:
- Navegación por capítulos dentro del audio
- Study Mode
- Búsqueda por contenido con citas temporales
- Generación de flashcards y quizzes

Ver [[pipeline-roadmap]] para el diseño completo.

---

## Text to Speech (TTS)

**Prioridad:** Media — mencionada como capacidad del producto

Se requiere definir y documentar:
- Endpoint(s) HTTP
- Formato de entrada (texto plano, HTML, markdown)
- Formato de salida (audio en Blob Storage)
- Flujo de procesamiento (¿síncrono o via queue?)
- Schema de BD (¿tabla `tts_*`?)
- Azure Speech configuración de voces

Ver [[text-to-speech]].

---

## Gestión de Archivos

**Prioridad:** Media — mencionada en el README

Capacidades descritas en el README:
- Subir audios, textos y documentos
- Gestionar archivos para procesamiento posterior

Requiere diseñar:
- Modelo de datos para archivos genéricos
- Endpoints CRUD de archivos
- Relación entre archivos y jobs

---

## Mejoras arquitectónicas identificadas

### Notificaciones push (reemplaza polling)

El cliente actualmente hace polling cada N segundos.
Una mejora natural sería notificaciones push (FCM/APNs) cuando el job completa.

Beneficios:
- Elimina la carga de polling sobre la API
- Reduce latencia entre finalización y notificación al usuario

### Soporte multi-idioma

La arquitectura soporta `language_locale` como parámetro del job. El valor por defecto es `es-CL`. La extensión a otros locales es directa — Fast Transcription lo soporta via el campo `locales` en la request.

### Dashboard de observabilidad

La tabla `ai_job_status_history` acumula el historial completo de transiciones con timestamps y actores. Base para métricas:
- Tiempo promedio por step (por modelo de IA)
- Tasa de éxito/fallo por feature
- Jobs en cola vs en procesamiento
- Costo estimado de IA por job

---

## Criterios para documentar una nueva feature

Cuando se implemente una nueva feature, la bóveda debe actualizarse con:

1. Un archivo en `Features/` describiendo qué hace la feature
2. Un archivo en `Flows/` con el flujo completo (secuencia, errores)
3. Actualización de `Database/tables.md` si hay nuevas tablas
4. Actualización de `Database/stored-procedures.md` si hay nuevos SPs
5. Actualización de `Architecture/backend-api.md` con los nuevos endpoints
6. Actualización de `README.md` en el índice y la tabla de estado
7. Actualización de `Roadmap/pending-features.md`
8. Actualización de `CLAUDE.md` raíz con el nuevo estado del proyecto

---

## Referencias cruzadas

- [[known-issues]] — Problemas y vacíos actuales
- [[pipeline-roadmap]] — Evolución técnica del pipeline de procesamiento
- [[vision]] — Capacidades planificadas del producto
- [[speech-to-text]] — Feature de referencia para nuevas implementaciones
