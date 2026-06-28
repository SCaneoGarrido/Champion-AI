# Roadmap — Features Pendientes

tags: #roadmap #pending #future

---

## Estado del sistema al momento de esta documentación

La única feature completamente documentada y con implementación parcial es **STT live_recording**.

---

## Features pendientes de implementación

### Endpoints de polling del STT

**Prioridad:** Alta — son parte del flujo actual

Los siguientes endpoints están documentados en el contrato API pero no implementados en el router:

| Endpoint | Estado |
|---|---|
| `GET /AIServices/Speechv2/jobs/{job_id}/status` | Pendiente |
| `GET /AIServices/Speechv2/jobs/{job_id}/result` | Pendiente |

Vistas necesarias ya existen en la BD:
- `vw_ai_job_current_status`
- `vw_stt_recording_result`

Ver [[polling]].

---

### Text to Speech (TTS)

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

### Gestión de Archivos

**Prioridad:** Media — mencionada en el README

Capacidades descritas en el README:
- Subir audios, textos y documentos
- Gestionar archivos para procesamiento posterior

Requiere diseñar:
- Modelo de datos para archivos genéricos
- Endpoints CRUD de archivos
- Relación entre archivos y jobs

---

### Funcionalidades adicionales mencionadas en el README

El README menciona como capacidades del hub de IA:

| Capacidad | Estado de documentación |
|---|---|
| Análisis de contenido | Sin documentar |
| Integración con visión computacional | Sin documentar |
| Integración con búsqueda | Sin documentar |
| Conversión texto → audio (TTS) | Sin documentar |

---

## Mejoras arquitectónicas sugeridas

Estas no están documentadas en las fuentes pero son inferibles como mejoras naturales:

### Notificaciones push (reemplaza polling)

El cliente actualmente hace polling cada N segundos para saber si el job terminó.
Una mejora natural sería notificaciones push (FCM/APNs) cuando el job completa.

Esto eliminaría:
- La carga de polling sobre la API
- La latencia entre la finalización y la notificación al usuario

### Soporte multi-idioma

La arquitectura soporta `language_locale` como parámetro, pero solo `es-CL` está documentado como caso de uso. La extensión a otros locales es directa.

### Dashboard de observabilidad

La tabla `ai_job_status_history` acumula todo el historial de transiciones con timestamps y actores. Esto es la base para un dashboard de métricas:
- Tiempo promedio por step
- Tasa de éxito/fallo por feature
- Jobs en cola vs en procesamiento

---

## Criterios para documentar una nueva feature

Cuando se implemente una nueva feature, la bóveda debe actualizarse con:

1. Un archivo en `Features/` describiendo qué hace la feature
2. Un archivo en `Flows/` con el flujo completo (secuencia, errores)
3. Actualización de `Database/tables.md` si hay nuevas tablas
4. Actualización de `Database/stored-procedures.md` si hay nuevos SPs
5. Actualización de `Architecture/backend-api.md` con los nuevos endpoints
6. Actualización de `README.md` en el índice y la tabla de estado

---

## Referencias cruzadas

- [[known-issues]] — Problemas y vacíos actuales
- [[vision]] — Capacidades planificadas del producto
- [[speech-to-text]] — Feature de referencia para nuevas implementaciones
