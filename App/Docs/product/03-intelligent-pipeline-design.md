# Pipeline Inteligente — Diseño

tags: #product #pipeline #architecture

---

## Filosofía de diseño

El pipeline actual (`transcription → summary → notes → mind_map`) es **estrictamente secuencial** aunque no todas sus etapas dependan entre sí. El nuevo diseño introduce dos ideas que no cambian ningún principio arquitectónico existente, solo la forma de aplicarlos:

1. **Fan-out / fan-in donde no hay dependencia real.** Azure Durable Functions ya soporta ejecución paralela de activities (`context.task_all([...])`). Hoy Summary, Notes y Mind Map dependen todos únicamente de la transcripción — no entre sí — y sin embargo se ejecutan uno tras otro. Esto es tiempo de espera del usuario desperdiciado.
2. **Una etapa nueva no siempre implica una llamada nueva a IA.** Chapters y Timeline son proyecciones de Topics; no requieren razonar sobre la transcripción otra vez.

El pipeline se organiza en **capas**. Dentro de una capa, las etapas son paralelas entre sí. Entre capas, hay una dependencia estricta.

```
Capa 0 — Ingesta            (ya implementada, fuera del pipeline de IA)
Capa 1 — Reconocimiento     transcription
Capa 2 — Normalización      transcript_cleanup
Capa 3 — Generación núcleo  summary ‖ notes ‖ mind_map                    (paralelo)
Capa 4 — Enriquecimiento    topic_extraction ‖ keyword_extraction ‖ entity_extraction   (paralelo)
Capa 5 — Capa de estudio    chapters ‖ study_classification ‖ flashcard_generation ‖ quiz_generation   (paralelo)
Capa 6 — Capa semántica     embedding_generation
Capa 7 — Cierre             knowledge_pack_assembly
```

Cada capa completa antes de que la siguiente inicie (las dependencias del grafo en [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) lo exigen), pero dentro de una capa todas las etapas activas corren en paralelo.

---

## Metodología de "costo aproximado"

Se usa una escala relativa, no montos en USD (dependen de la región y el pricing vigente de Azure):

| Nivel | Significado |
|---|---|
| **Ninguno** | No consume cuota de IA — cómputo local o agregación de datos ya generados |
| **Bajo** | Un prompt corto, input acotado, output corto |
| **Medio** | Input completo (transcripción entera) con output moderado |
| **Alto** | Input completo + razonamiento extenso, o múltiples llamadas por pack (ej. una por topic) |

---

## Capa 1 — Speech Recognition (`transcription`)

| Atributo | Detalle |
|---|---|
| **Objetivo** | Convertir el audio en texto literal + segmentos con offsets temporales |
| **Entradas** | `blob_url`, `audio_format`, `language_locale` |
| **Salidas** | `transcription_text` (TEXT), `segments[]` (offset_ms, duration_ms, text) |
| **Formato de datos** | Texto plano + JSON de segmentos |
| **Responsabilidad única** | Transcribir — no limpia, no interpreta |
| **Dependencias** | Audio ya subido a Blob (Capa 0) |
| **Errores posibles** | `STT_ENGINE_UNAVAILABLE` (servicio caído), timeout (audio muy largo), `UNSUPPORTED_FORMAT` |
| **Costo aproximado** | Medio — proporcional a duración del audio |
| **Modelo IA recomendado** | Azure AI Speech — Fast Transcription (ya en uso, sin cambios) |
| **Prioridad** | — |
| **Fase** | MVP implementado |
| **Cambio recomendado respecto a hoy** | Persistir `segments[]` (ya viene en la respuesta de Fast Transcription, hoy se descarta) — ver [`06-roadmap-risks-recommendations.md`](./06-roadmap-risks-recommendations.md) |

---

## Capa 2 — Transcript Cleanup (`transcript_cleanup`)

| Atributo | Detalle |
|---|---|
| **Objetivo** | Eliminar artefactos de habla (muletillas, repeticiones, frases incompletas) preservando el significado |
| **Entradas** | `transcription_text` |
| **Salidas** | `transcript_clean_text` (TEXT) |
| **Formato de datos** | Texto plano |
| **Responsabilidad única** | Limpiar — no resume, no interpreta contenido |
| **Dependencias** | Raw Transcript (Capa 1) |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, respuesta vacía (agotamiento de tokens de razonamiento), transcripción excede tamaño de contexto |
| **Costo aproximado** | Medio |
| **Modelo IA recomendado** | gpt-5-mini (mismo modelo que el resto del pipeline; consistencia de configuración: `max_completion_tokens`, sin `temperature`) |
| **Prioridad** | Alta — ya identificada como próxima implementación del proyecto |
| **Fase** | MVP próximo |

---

## Capa 3 — Generación núcleo (paralela)

Las tres etapas de esta capa comparten el mismo input (`transcript_clean_text`) y no dependen entre sí. **Recomendación de diseño: ejecutarlas con `context.task_all([...])` en el orquestador Durable en vez de secuencialmente.**

### 3a. Summary

| Atributo | Detalle |
|---|---|
| **Objetivo** | Resumen ejecutivo estructurado (topics, insights, decisiones, conclusión) |
| **Entradas** | `transcript_clean_text` |
| **Salidas** | `summary_text` (Markdown) |
| **Dependencias** | Clean Transcript |
| **Errores posibles** | `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Medio |
| **Modelo IA recomendado** | gpt-5-mini |
| **Fase** | MVP implementado |

### 3b. Notes

| Atributo | Detalle |
|---|---|
| **Objetivo** | Notas de estudio estructuradas (texto + JSON) |
| **Entradas** | `transcript_clean_text` |
| **Salidas** | `notes_text` (Markdown), `notes_json` (JSONB) |
| **Dependencias** | Clean Transcript |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, JSON inválido devuelto por el modelo |
| **Costo aproximado** | Medio-alto (hoy son 2 llamadas — texto y JSON — con el mismo input; candidata a optimización, ver riesgos) |
| **Modelo IA recomendado** | gpt-5-mini |
| **Fase** | MVP implementado |

### 3c. Mind Map

| Atributo | Detalle |
|---|---|
| **Objetivo** | Árbol jerárquico de conceptos (máx. 4 niveles) |
| **Entradas** | `transcript_clean_text` |
| **Salidas** | `mind_map_json` (JSONB) |
| **Dependencias** | Clean Transcript |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, JSON inválido |
| **Costo aproximado** | Medio |
| **Modelo IA recomendado** | gpt-5-mini |
| **Fase** | MVP implementado |

**Nota de transición:** hasta que Transcript Cleanup exista, estas tres etapas siguen recibiendo `transcription_text` crudo (comportamiento actual). El día que Transcript Cleanup se implemente, deben re-apuntar su input a `transcript_clean_text` — es un cambio de una línea por activity, sin cambiar contratos de salida.

---

## Capa 4 — Knowledge Enrichment (paralela, roadmap)

### 4a. Topic Extraction

| Atributo | Detalle |
|---|---|
| **Objetivo** | Identificar temas principales con rango temporal, resumen y puntos clave |
| **Entradas** | `transcript_clean_text`, `segments[]` |
| **Salidas** | `topics_json` — `{ topics: [{ id, name, start_ms, end_ms, summary, key_points[] }] }` |
| **Dependencias** | Clean Transcript, Segmentos + Offsets |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, offsets inconsistentes con la duración real del audio |
| **Costo aproximado** | Medio-alto |
| **Modelo IA recomendado** | gpt-5-mini |
| **Prioridad** | Alta — desbloquea Chapters, Timeline, Study Mode, Flashcards, Quiz |
| **Fase** | Roadmap |

### 4b. Keyword Extraction

| Atributo | Detalle |
|---|---|
| **Objetivo** | Extraer términos clave del contenido |
| **Entradas** | `transcript_clean_text` |
| **Salidas** | `keywords_json` — array de `{ term, relevance }` |
| **Dependencias** | Clean Transcript |
| **Errores posibles** | `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Bajo |
| **Modelo IA recomendado** | gpt-5-mini (prompt corto) o modelo más liviano si el volumen de jobs lo justifica |
| **Prioridad** | Media |
| **Fase** | Roadmap |

### 4c. Named Entity Extraction

| Atributo | Detalle |
|---|---|
| **Objetivo** | Identificar personas, organizaciones, lugares y fechas mencionadas, con sus menciones ubicadas en el tiempo |
| **Entradas** | `transcript_clean_text`, `segments[]` |
| **Salidas** | `entities_json` — `{ entities: [{ text, type, mentions: [offset_ms] }] }` |
| **Dependencias** | Clean Transcript, Segmentos + Offsets |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, falsos positivos de entidad |
| **Costo aproximado** | Bajo-medio |
| **Modelo IA recomendado** | gpt-5-mini |
| **Prioridad** | Media |
| **Fase** | Roadmap |

> **Oportunidad de optimización de costo:** Keywords y Named Entities comparten el mismo input y un propósito afín (extracción de información puntual, no generativa). Es válido implementarlas como **un solo prompt con dos secciones de salida** en vez de dos llamadas separadas — decisión a tomar en tiempo de implementación, documentada aquí para no perderla. Ver [`06-roadmap-risks-recommendations.md`](./06-roadmap-risks-recommendations.md).

---

## Capa 5 — Study Layer (paralela, roadmap)

### 5a. Chapters

| Atributo | Detalle |
|---|---|
| **Objetivo** | Agrupar Topics en una navegación más gruesa, tipo índice de libro |
| **Entradas** | `topics_json` |
| **Salidas** | `chapters_json` — `{ chapters: [{ name, topic_ids[], start_ms, end_ms }] }` |
| **Dependencias** | Topics |
| **Errores posibles** | Ninguno de IA si es agregación pura; si se usa una llamada de titulado, `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Ninguno (agregación) a bajo (si se usa una llamada de titulado agrupado) |
| **Modelo IA recomendado** | Ninguno (lógica determinística) o gpt-5-mini si se decide generar títulos de capítulo distintos a los de topic |
| **Prioridad** | Media |
| **Fase** | Roadmap |

### 5b. Study Metadata

| Atributo | Detalle |
|---|---|
| **Objetivo** | Clasificar el pack — materia, dificultad, tiempo estimado de estudio, tags |
| **Entradas** | `summary_text`, `notes_json`, `topics_json` |
| **Salidas** | `study_metadata_json` — `{ subject, difficulty, estimated_minutes, tags[] }` |
| **Dependencias** | Summary, Study Notes, Topics |
| **Errores posibles** | `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Bajo |
| **Modelo IA recomendado** | gpt-5-mini |
| **Prioridad** | Media |
| **Fase** | Roadmap |

### 5c. Flashcard Generation

| Atributo | Detalle |
|---|---|
| **Objetivo** | Generar tarjetas de pregunta/respuesta por topic |
| **Entradas** | `topics_json`, `notes_json` |
| **Salidas** | `flashcards_json` — `{ flashcards: [{ topic_id, question, answer }] }` |
| **Dependencias** | Topics, Study Notes |
| **Errores posibles** | `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Medio (si es una llamada por topic) — considerar una única llamada consolidada con todos los topics para reducir costo, a cambio de perder paralelismo por topic |
| **Modelo IA recomendado** | gpt-5-mini |
| **Prioridad** | Media |
| **Fase** | Roadmap |

### 5d. Quiz Generation

| Atributo | Detalle |
|---|---|
| **Objetivo** | Generar preguntas de comprensión por topic |
| **Entradas** | `topics_json`, `notes_json` |
| **Salidas** | `quiz_json` — `{ quiz: [{ topic_id, question, options[], correct_answer }] }` |
| **Dependencias** | Topics, Study Notes |
| **Errores posibles** | `OPENAI_UNAVAILABLE` |
| **Costo aproximado** | Medio (mismo trade-off que Flashcards) |
| **Modelo IA recomendado** | gpt-5-mini |
| **Prioridad** | Media-baja |
| **Fase** | Roadmap |

---

## Capa 6 — Semantic Layer (roadmap avanzado / visión)

### 6a. Embedding Generation

| Atributo | Detalle |
|---|---|
| **Objetivo** | Generar representación vectorial de fragmentos del contenido para búsqueda semántica |
| **Entradas** | `transcript_clean_text` (chunkeado), `topics_json` (límites de chunk) |
| **Salidas** | Vectores asociados a fragmentos, almacenados con referencia al pack |
| **Dependencias** | Clean Transcript, Topics |
| **Errores posibles** | `OPENAI_UNAVAILABLE`, límite de dimensión del modelo de embeddings |
| **Costo aproximado** | Medio (bajo por token, pero proporcional al volumen total de texto) |
| **Modelo IA recomendado** | Modelo de embeddings de Azure OpenAI (distinto de gpt-5-mini — los modelos de razonamiento no son modelos de embeddings) |
| **Prioridad** | Depende de decisión de infraestructura (`pgvector`) — ver riesgos |
| **Fase** | Roadmap avanzado |

---

## Capa 7 — Cierre (`knowledge_pack_assembly`)

| Atributo | Detalle |
|---|---|
| **Objetivo** | Consolidar el resultado final y marcar el Knowledge Pack como completo |
| **Entradas** | Todos los componentes generados en las capas anteriores que apliquen según la fase habilitada |
| **Salidas** | Estado `completed` del job |
| **Dependencias** | Todas las capas activas |
| **Errores posibles** | `INTERNAL_ERROR` (fallo de persistencia) |
| **Costo aproximado** | Ninguno |
| **Modelo IA recomendado** | Ninguno |
| **Fase** | MVP implementado (hoy cierra tras Capa 3; se extiende a medida que se activan capas nuevas) |

Esta etapa es análoga al `sp_complete_stt_live_recording_job_v1` actual — su alcance crece con cada capa nueva que se active, pero su responsabilidad (consolidar y cerrar) no cambia.

---

## Cómo evoluciona la máquina de estados

`ai_job.current_step` es hoy un string único (`transcription`, `summary`, etc.) porque el pipeline es secuencial. Al introducir capas paralelas, un job puede estar ejecutando **varias etapas de la misma capa simultáneamente** — un solo string ya no representa eso con precisión.

**Recomendación:** usar el campo `steps_snapshot` (JSONB) que **ya existe** en `ai_job_status_history` pero no se utiliza hoy, para representar el estado de cada etapa activa dentro de una capa:

```json
{
  "layer": "core_generation",
  "steps": {
    "summary": "completed",
    "notes": "processing",
    "mind_map": "queued"
  }
}
```

`current_step` puede seguir representando la capa activa (`"core_generation"`) para no romper el contrato simple que ya consume la app móvil (`GET /jobs/{id}/status`); el detalle granular queda disponible en `steps_snapshot` para clientes que quieran mostrar progreso fino, sin obligar a ningún consumidor existente a cambiar.

---

## Diagrama completo del pipeline objetivo

```
Audio
  │
  ▼
[Capa 1] transcription ──────────────► raw_transcript + segments
  │
  ▼
[Capa 2] transcript_cleanup ─────────► clean_transcript
  │
  ▼
[Capa 3] (paralelo) summary ‖ notes ‖ mind_map
  │
  ▼
[Capa 4] (paralelo) topic_extraction ‖ keyword_extraction ‖ entity_extraction
  │
  ▼
[Capa 5] (paralelo) chapters ‖ study_classification ‖ flashcard_generation ‖ quiz_generation
  │
  ▼
[Capa 6] embedding_generation
  │
  ▼
[Capa 7] knowledge_pack_assembly ────► completed
```

---

## Referencias

- [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) — qué es cada componente y sus dependencias
- [`04-data-architecture.md`](./04-data-architecture.md) — cómo se persiste cada salida
- [`06-roadmap-risks-recommendations.md`](./06-roadmap-risks-recommendations.md) — orden de implementación recomendado
