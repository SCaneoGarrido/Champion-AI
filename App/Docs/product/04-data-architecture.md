# Knowledge Pack — Arquitectura de Datos

tags: #product #data #database #design

---

> **Importante:** este documento es diseño, no una migración. No se crea ni modifica ninguna tabla como parte de este trabajo. Todo lo aquí descrito es la base para migraciones futuras, a implementar cuando cada componente entre en desarrollo.

---

## La decisión central: columnas fijas vs. componentes extensibles

### El problema

El modelo actual (`stt_recording_result` con una columna por output) funciona bien para 4-5 campos estables. Escalarlo a los ~15 componentes roadmap descritos en [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) de la misma forma implicaría:

- Una migración por componente nuevo (`ALTER TABLE ... ADD COLUMN`)
- Tocar `sp_save_stt_partial_result_v1`, `sp_complete_stt_live_recording_job_v1` y `vw_stt_recording_result` en cada migración (ver regla ya documentada en `App/rules/database.md` R-DB-06)
- Una tabla cada vez más ancha, con la mayoría de sus columnas `NULL` para packs que aún no generaron ese componente

Esto no es incorrecto — es exactamente cómo se construyó el MVP, correctamente. Pero **no es la forma en la que debe crecer indefinidamente**.

### La decisión

Se separan dos categorías de datos:

1. **Núcleo estable (columnas dedicadas)** — los componentes MVP (transcripción, resumen, notas, mapa mental, y el próximo transcript limpio). Son de alta frecuencia de lectura, ya forman parte del contrato HTTP, y su forma no va a cambiar. Se quedan como columnas de `stt_recording_result`, sin cambios de fondo respecto a hoy (solo se agrega `transcript_clean_text` cuando corresponda).

2. **Componentes extensibles (modelo genérico)** — todo lo del roadmap (Topics, Keywords, Named Entities, Chapters, Study Metadata, Flashcards, Quiz) vive en una tabla genérica nueva, propuesta aquí como `stt_knowledge_component`, que permite agregar tipos de componente **sin migraciones de schema**.

Esta misma idea ya existe en el proyecto de forma incipiente: `stt_recording_result.raw_result_json` es un campo JSONB genérico para "lo que no tiene columna propia". La propuesta de este documento es generalizar ese patrón en una tabla dedicada, en vez de seguir acumulando columnas JSONB sueltas en la tabla principal.

---

## Modelo propuesto — `stt_knowledge_component` (roadmap)

```
stt_knowledge_component
  component_id          UUID PK
  recording_id          UUID FK → stt_recording
  job_id                VARCHAR(100) FK → ai_job     -- por consistencia con el resto del modelo
  component_type        VARCHAR(50)                   -- 'topics' | 'keywords' | 'entities' | 'chapters' |
                                                        -- 'study_metadata' | 'flashcards' | 'quiz' | ...
  status                VARCHAR(50)                    -- 'pending' | 'processing' | 'completed' | 'failed'
  payload               JSONB                          -- estructura específica de cada component_type
  generator_model       VARCHAR(100)                   -- ej. 'gpt-5-mini'
  generator_prompt_ver  VARCHAR(50)                     -- ej. 'topics_v1'
  error_code            VARCHAR(100)
  error_message         TEXT
  generated_at          TIMESTAMPTZ
  created_at            TIMESTAMPTZ DEFAULT now()
  updated_at            TIMESTAMPTZ DEFAULT now()      -- trigger set_updated_at() (ya existente)

  UNIQUE (recording_id, component_type)
```

### Por qué este diseño y no otro

| Alternativa considerada | Por qué se descarta |
|---|---|
| Una columna JSONB nueva por componente en `stt_recording_result` | Repite el problema que se busca resolver — sigue requiriendo migración por componente |
| Una tabla por tipo de componente (`stt_topics`, `stt_flashcards`, ...) | Más "relacional", pero multiplica el número de SPs, vistas y migraciones al mismo ritmo que aparecen componentes — el problema de escalar por años persiste, solo cambia de forma |
| **Tabla genérica `component_type` + `payload JSONB`** | Un componente nuevo = una fila con un `component_type` nuevo, cero migraciones de schema. El costo es perder validación de estructura a nivel de BD (se compensa con validación a nivel de aplicación/prompt, igual que hoy con `notes_json`) |

Esto es consistente con un patrón que el proyecto **ya usa exitosamente** (`notes_json`, `mind_map_json`, `raw_result_json` son todos JSONB sin schema forzado por Postgres) — solo se generaliza a nivel de fila en vez de columna.

### Idempotencia — consistente con el patrón ya existente

`UNIQUE (recording_id, component_type)` permite el mismo patrón `ON CONFLICT DO UPDATE` que ya usa `sp_save_stt_partial_result_v1`:

```sql
INSERT INTO stt_knowledge_component (recording_id, job_id, component_type, status, payload, generator_model, generated_at)
VALUES ($1, $2, 'topics', 'completed', $3, 'gpt-5-mini', NOW())
ON CONFLICT (recording_id, component_type) DO UPDATE SET
  status         = EXCLUDED.status,
  payload        = EXCLUDED.payload,
  generator_model = EXCLUDED.generator_model,
  generated_at   = EXCLUDED.generated_at,
  updated_at     = NOW();
```

Esto preserva ADR-006 (idempotencia ante redelivery de queue) sin introducir un mecanismo nuevo — es el mismo `COALESCE`/`ON CONFLICT` ya validado en producción, aplicado a una tabla más genérica.

### Smart retry generalizado

El smart retry actual funciona porque cada campo de `stt_recording_result` puede estar `NULL` o no de forma independiente. Con `stt_knowledge_component`, el mismo principio se expresa como: *"¿existe una fila con este `component_type` en estado `completed`? Si sí, se salta la etapa."* Es una generalización directa del mecanismo ya implementado, no un concepto nuevo.

### Un SP nuevo, no N

En vez de `sp_complete_stt_live_recording_job_v1` creciendo con un parámetro por componente nuevo (lo que rompería su firma en cada roadmap item), se propone un único SP genérico:

```sql
CALL sp_save_knowledge_component_v1(
  p_recording_id       UUID,
  p_job_id             VARCHAR(100),
  p_component_type     VARCHAR(50),
  p_status             VARCHAR(50),
  p_payload            JSONB,
  p_generator_model    VARCHAR(100)      DEFAULT NULL,
  p_generator_prompt_v VARCHAR(50)       DEFAULT NULL,
  p_error_code         VARCHAR(100)      DEFAULT NULL,
  p_error_message      TEXT              DEFAULT NULL
)
```

Este SP se reutiliza para **todos** los componentes roadmap (Topics, Keywords, Chapters, Flashcards...) — un componente nuevo no requiere un SP nuevo, solo un `component_type` nuevo y un `payload` con la forma acordada en [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md). Esto es lo que permite que el pipeline crezca por años sin tocar el contrato de Stored Procedures en cada iteración.

---

## Segmentos + Offsets (gap a resolver, no roadmap lejano)

`raw_result_json` en `stt_recording_result` **ya existe** y hoy no se popula. Se recomienda:

- **Corto plazo (junto con Transcript Cleanup):** persistir la respuesta cruda de Fast Transcription (incluyendo `phrases[]` con offsets) en `raw_result_json`. Costo: cero — es descartar menos de lo que ya se descarta hoy.
- **Cuando se implemente Topic Extraction:** si las consultas por rango temporal se vuelven frecuentes (ej. Timeline, citas), materializar una tabla dedicada `stt_transcript_segment (segment_id, recording_id, sequence, start_ms, end_ms, text)` derivada de `raw_result_json`, para no depender de parsear JSON en cada consulta. No es necesaria en el MVP próximo — el JSON crudo alcanza para diseñar y validar Topics.

---

## Semantic Layer — infraestructura nueva (roadmap avanzado)

Embeddings requieren la extensión `pgvector` (no instalada hoy — el proyecto usa `pgcrypto` únicamente). Propuesta de tabla, a validar cuando se aborde esta capa:

```
stt_content_embedding
  embedding_id   UUID PK
  recording_id   UUID FK → stt_recording
  chunk_type     VARCHAR(50)     -- 'transcript_chunk' | 'topic' | 'summary'
  chunk_ref      VARCHAR(100)    -- ej. topic_id si chunk_type = 'topic'
  content_text   TEXT            -- texto fuente del chunk (para mostrar la cita)
  embedding      VECTOR(n)       -- dimensión según el modelo de embeddings elegido
  created_at     TIMESTAMPTZ DEFAULT now()
```

## AI Chat — entidades nuevas (visión)

```
ai_chat_session
  session_id     UUID PK
  recording_id   UUID FK → stt_recording
  user_id        UUID FK → sec_user
  created_at     TIMESTAMPTZ DEFAULT now()

ai_chat_message
  message_id        UUID PK
  session_id        UUID FK → ai_chat_session
  role              VARCHAR(20)    -- 'user' | 'assistant'
  content           TEXT
  retrieved_context JSONB          -- qué chunks/embeddings se usaron para responder (trazabilidad de RAG)
  created_at        TIMESTAMPTZ DEFAULT now()
```

Estas dos tablas son de **visión**, no se diseñan en detalle aquí más allá de su forma conceptual — su diseño fino debe hacerse cuando Semantic Search esté implementado y validado.

---

## Qué debe persistirse vs. qué puede recalcularse

| Dato | Persistir | Recalculable | Razón |
|---|---|---|---|
| Audio original | Sí (Blob) | No | Es el dato fuente |
| Raw Transcript | Sí | Técnicamente sí (repetir transcripción) pero costoso | Costo de IA ya incurrido — no se descarta |
| Segmentos + Offsets | Sí | No sin volver a transcribir | Mismo motivo |
| Clean Transcript | Sí | Sí (repetir cleanup) pero costoso | Costo de IA ya incurrido |
| Summary / Notes / Mind Map | Sí | Sí, pero costoso | Costo de IA ya incurrido |
| Topics / Keywords / Entities | Sí | Sí, pero costoso | Costo de IA ya incurrido |
| **Chapters** | Opcional | **Sí, sin costo** | Es agregación pura sobre Topics — se puede materializar por performance de lectura, pero no es obligatorio conservarlo si se recalcula rápido |
| **Timeline** | No necesariamente | **Sí, sin costo** | Proyección de Topics + Segmentos — candidato a vista, no a tabla |
| Study Metadata | Sí | Sí, pero costoso | Costo de IA ya incurrido |
| Flashcards / Quiz | Sí | Sí, pero costoso (y por topic) | Costo de IA ya incurrido |
| Embeddings | Sí | Sí, pero costoso a escala | Regenerar embeddings de todo el histórico de un usuario es costoso — se invalida solo lo que cambió |
| Processing Metadata (historial) | Sí | No | Es el registro de auditoría — no es un dato derivado, es un hecho histórico |

**Principio general:** todo lo que sale de una llamada a un modelo de IA se persiste, sin excepción — el costo ya fue incurrido y no debe pagarse dos veces. Solo se recalculan en caliente las proyecciones que no consumen IA (Chapters, Timeline).

---

## Relaciones — diagrama consolidado

```mermaid
erDiagram
    ai_job ||--o| stt_recording : "tiene recording"
    stt_recording ||--o| stt_recording_result : "resultado núcleo (MVP)"
    stt_recording ||--o{ stt_knowledge_component : "componentes extensibles (roadmap)"
    stt_recording ||--o{ stt_content_embedding : "vectores (roadmap avanzado)"
    stt_recording ||--o{ ai_chat_session : "sesiones de chat (visión)"
    ai_chat_session ||--o{ ai_chat_message : "mensajes"
    ai_job ||--o{ ai_job_status_history : "historial de estado (ya existente)"

    stt_recording_result {
        uuid result_id PK
        uuid recording_id FK UK
        text transcription_text
        text transcript_clean_text "nuevo — MVP próximo"
        text summary_text
        text notes_text
        jsonb notes_json
        jsonb mind_map_json
        jsonb raw_result_json "reutilizado para segments[]"
    }

    stt_knowledge_component {
        uuid component_id PK
        uuid recording_id FK
        varchar component_type
        varchar status
        jsonb payload
        varchar generator_model
        timestamptz generated_at
    }

    stt_content_embedding {
        uuid embedding_id PK
        uuid recording_id FK
        varchar chunk_type
        text content_text
        vector embedding
    }

    ai_chat_session {
        uuid session_id PK
        uuid recording_id FK
        uuid user_id FK
    }

    ai_chat_message {
        uuid message_id PK
        uuid session_id FK
        varchar role
        text content
        jsonb retrieved_context
    }
```

---

## Metadatos necesarios por componente

Todo componente (MVP o roadmap) debería poder responder, cuando se le pregunte:

| Metadato | Dónde vive hoy | Dónde vive a futuro |
|---|---|---|
| ¿Está completo? | Implícito (columna NULL o no) | `stt_knowledge_component.status` |
| ¿Qué modelo lo generó? | No se registra | `stt_knowledge_component.generator_model` |
| ¿Con qué versión de prompt? | No se registra | `stt_knowledge_component.generator_prompt_ver` |
| ¿Cuándo se generó? | `stt_recording_result.generated_at` (a nivel de fila completa, no por campo) | `stt_knowledge_component.generated_at` (por componente) |
| ¿Falló? ¿Por qué? | `ai_job.last_error_code` (a nivel de job, no de componente) | `stt_knowledge_component.error_code/message` (por componente) |

Esto habilita directamente el roadmap de observabilidad ya identificado en `App/Knowledge/Roadmap/pending-features.md` (tiempo por step, costo estimado por job) — pero a nivel de componente, no solo de job.

---

## Vistas de lectura — extensión del patrón existente

Siguiendo R-DB-05 (las vistas son el contrato de lectura), se propone:

- `vw_stt_recording_result` — **sin cambios** de contrato (se le agrega `transcript_clean_text` cuando exista, de forma aditiva).
- `vw_knowledge_pack_components` (nueva, roadmap) — pivotea `stt_knowledge_component` para exponer todos los componentes de un pack en una sola consulta, análoga en espíritu a `vw_stt_recording_result` pero para el modelo extensible.

Ninguna vista nueva reemplaza a las existentes — se suman, preservando todo consumidor actual.

---

## Referencias

- [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) — qué representa cada componente
- [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md) — qué etapa produce cada componente
- `App/rules/database.md` — reglas actuales de BD, siguen aplicando sin excepción
- `App/Knowledge/Database/tables.md` — tablas actuales del sistema
