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
| Presentation Layer — Markdown rendering | Implementado |
| Presentation Layer — Soporte matemático LaTeX | Implementado — **bug de superposición no corregido, visualización mobile en revisión (ver sección abajo)** |
| Presentation Layer — Mind maps reales (Mermaid → SVG) | Implementado |
| Presentation Layer — Resultado enriquecido (UI de estudio) | **Pendiente — no iniciado** |
| Presentation Layer — Background sync hardening (`AppState`) | **Pendiente — no iniciado** |
| Presentation Layer — Mermaid embebido en Markdown | **Roadmap — solo arquitectura preparada (seam en `MarkdownRenderer.jsx`), sin implementar** |
| Push notifications (Expo Push Service) | **Pendiente — no iniciado** (infraestructura diseñada en ADR-009, sin código) |
| Text to Speech (TTS) | Sin documentar |
| Gestión de Archivos | Sin documentar |

---

## Pipeline inteligente — evolución

Ver [[pipeline-roadmap]] para el detalle técnico de la evolución del pipeline, y `App/Docs/product/README.md` para el diseño funcional completo del **Knowledge Pack** — el objeto de conocimiento unificado hacia el que evoluciona el resultado de STT (transcripción → conocimiento estructurado y navegable: topics, capítulos, flashcards, quiz, búsqueda semántica).

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

## Presentation Layer — estado detallado (sesión 2026-07-02, pausa de trabajo)

Ver `App/Knowledge/ADR/ADR-008-client-side-rendering.md` (decisión original) y `App/Knowledge/ADR/ADR-010-latex-rendering-fixes-and-block-renderer-architecture.md` (fix de superposición + arquitectura de bloques). Capa de renderizado sobre resultados ya generados — no agrega etapas de IA, salvo la excepción puntual de formato matemático en `summary.md`/`notes.md`.

### Hecho

- **Markdown rendering** (`MarkdownRenderer.jsx`) — headers, listas, tablas, checklists, citas, código, links, negrita/cursiva, separadores. Usado en `summary_text`/`notes_text` y (con `normalizeMathText()`) en `transcription_text`.
- **LaTeX** (`LatexView.jsx`) — KaTeX vía WebView, cálculo en JS puro. Bug de superposición de ecuaciones corregido (causa raíz: medición de tamaño síncrona antes de que cargaran las fuentes web — ver ADR-010). Scroll horizontal automático para ecuaciones en modo bloque que exceden el ancho disponible.
- **Mind maps reales** (`MermaidRenderer.jsx`) — conversión determinística `mind_map_json` → Mermaid (`mermaid_converter.py`, no toca `mind_map.md`), render a SVG vía WebView, cacheado server-side (`PATCH .../mindmap-svg`), fallback a lista (`MindMapListView.jsx`) para jobs sin este campo.
- `normalizeMathText.js` — normalizador acotado (exponentes ASCII/unicode) para matemática simple en `transcription_text`.
- Seam preparado (no implementado) para Mermaid embebido en Markdown — regla `fence` en `MarkdownRenderer.jsx` que detecta ` ```mermaid ` y por ahora delega al renderer de código por defecto.

### ⚠️ Pendiente de verificar — reportado como sin resolver del todo

**La visualización en dispositivos móviles de contenido matemático sigue sin ser buena**, según el último reporte del usuario, incluso después del fix de superposición de ADR-010. No se confirmó en dispositivo real que el fix haya resuelto el problema por completo — quedó pendiente de prueba al pausar la sesión. Antes de seguir con features nuevas, **retomar acá**:
1. Verificar en dispositivo real (no solo análisis estático) si persiste algún problema de layout/legibilidad con LaTeX tras el fix de `LatexView.jsx`.
2. Si persiste, revisar específicamente: tamaño de fuente en pantallas de alta densidad, comportamiento del `ScrollView` horizontal en Android vs iOS, y si el `onLayout` del contenedor está midiendo el ancho real disponible (ver limitación conocida para ecuaciones inline, documentada en ADR-010).

### No iniciado

- **Feature 6 — Resultado enriquecido (UI de estudio)**: reemplazar el acordeón de `NoteDetailScreen.jsx` por un selector tipo segmented-control. No se empezó.
- **Feature 5 — Background sync hardening**: hook `useAppForegroundRefresh` (`AppState`) para refrescar jobs al volver del background sin importar la pantalla activa. No se empezó.
- **Feature 4 — Push notifications**: tabla `sec_user_device`, endpoint `POST /AIServices/Devices/register`, `push_service.py`, registro en `SettingsScreen.jsx`. Diseño completo en ADR-009, cero código todavía.
- **Mermaid embebido en Markdown**: generalizar `MermaidRenderer.jsx` para resolver caché por bloque dentro de un documento arbitrario y activar el seam ya preparado.

## Mejoras arquitectónicas identificadas

### Notificaciones push — pendiente (complementa polling, no lo reemplaza)

El cliente sigue haciendo polling como fuente de verdad del estado. Se agrega infraestructura de push notifications (Expo Push Service — ver `App/Knowledge/ADR/ADR-009-expo-push-service.md`) como complemento de UX: avisa cuando un job termina o falla, sin eliminar el polling.

Beneficios:
- Reduce la necesidad de que el usuario revise manualmente el estado
- Reduce latencia percibida entre finalización y notificación al usuario

Infraestructura diseñada (no implementada): tabla `sec_user_device`, endpoint `POST /AIServices/Devices/register`, envío desde `push_service.py` en `completion_activity.py` (éxito y fallo).

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
