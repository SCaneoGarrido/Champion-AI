# Knowledge Pack — Roadmap, Riesgos y Recomendaciones

tags: #product #roadmap #risks #recommendations

---

## Roadmap consolidado

| Fase | Contenido | Estado |
|---|---|---|
| **F0 — MVP actual** | transcription → summary → notes → mind_map | Implementado |
| **F1 — MVP próximo** | Transcript Cleanup + persistencia de Segmentos/Offsets + paralelización de summary/notes/mind_map | Próxima implementación recomendada |
| **F2 — Roadmap: Enriquecimiento** | Topic Extraction, Keyword Extraction, Named Entity Extraction, migración al modelo de componentes extensibles (`stt_knowledge_component`) | Diseñado en este documento, no implementado |
| **F3 — Roadmap: Capa de estudio** | Chapters, Study Metadata, Flashcards, Quiz | Diseñado, no implementado |
| **F4 — Roadmap avanzado: Semántica** | Embeddings + `pgvector`, búsqueda semántica intra-pack | Diseñado, requiere decisión de infraestructura |
| **F5 — Visión** | AI Chat, búsqueda cross-pack, grafo de Concepts entre grabaciones | Visión de producto, sin diseño de detalle |

F1 debe implementarse antes que F2: introduce la infraestructura de datos (Segmentos + Offsets) que Topic Extraction necesita, y valida el patrón de paralelización en Durable Functions con las tres etapas ya existentes antes de sumarle etapas nuevas.

F2 es el punto de inflexión arquitectónico: es cuando conviene introducir `stt_knowledge_component` en vez de seguir agregando columnas — hacerlo antes (en F1) sería prematuro (no hay todavía un segundo componente que lo justifique); hacerlo después (ya con Topics como columna) obligaría a una migración de datos existentes.

---

## Riesgos arquitectónicos encontrados

### R1 — Crecimiento no acotado de `stt_recording_result`

**Riesgo:** si cada componente roadmap se implementa como columna nueva (siguiendo el patrón MVP sin cuestionarlo), la tabla principal del resultado STT crece indefinidamente y cada feature nueva se vuelve una migración invasiva que toca SPs, vistas y funciones ya en producción.

**Mitigación diseñada:** modelo de componentes extensibles `stt_knowledge_component` — ver [`04-data-architecture.md`](./04-data-architecture.md).

### R2 — Datos de Fast Transcription descartados hoy

**Riesgo:** `speech_service.py` solo extrae `combinedPhrases[0].text` de la respuesta de Fast Transcription. Los `phrases[]` con offsets — necesarios para Timeline, Topics, citas temporales y reproducción sincronizada — se descartan. Si esto no se corrige antes de implementar Topic Extraction, esa etapa quedaría bloqueada o requeriría volver a transcribir (costo duplicado).

**Mitigación recomendada:** persistir los `phrases[]` (con offset y duración) en `raw_result_json` desde ahora — es un cambio de bajo riesgo y costo cero, ya que el dato ya viene en la respuesta HTTP existente.

### R3 — `raw_result_json` sin propósito definido

**Riesgo:** el campo existe en `stt_recording_result` pero no se usa. Sin una decisión explícita sobre su propósito, corre el riesgo de convertirse en un cajón de sastre ambiguo a medida que distintas features lo usen para cosas distintas.

**Mitigación recomendada:** fijar su propósito ahora — "respuesta cruda de Fast Transcription, incluyendo segmentos con offsets" — antes de que otra etapa del pipeline empiece a escribir ahí datos de otra naturaleza.

### R4 — Costo de IA creciente por job

**Riesgo:** cada capa nueva del pipeline (F2, F3) agrega llamadas a gpt-5-mini. Sin control, el costo por Knowledge Pack completo puede crecer varias veces respecto al costo actual (que ya son ~4 llamadas: summary, notes texto, notes JSON, mind map).

**Mitigación recomendada:**
- Evaluar fusionar Keywords + Named Entities en una sola llamada (ambas son extracción, no generación — comparten naturaleza y input).
- Evaluar fusionar `notes_text` + `notes_json` en una sola llamada que devuelva ambos formatos, en vez de dos llamadas idénticas en input.
- Para Flashcards/Quiz, decidir entre "una llamada por topic" (más paralelizable, más caro) vs. "una llamada consolidada con todos los topics" (más barato, menos paralelizable) según el volumen real de topics por audio observado en producción.

### R5 — Latencia creciente del pipeline secuencial

**Riesgo:** si cada capa nueva se agrega de forma secuencial (como hoy), el tiempo total hasta `completed` crece linealmente con cada roadmap item, degradando la experiencia de polling.

**Mitigación diseñada:** paralelización por capas vía `context.task_all()` en Durable Functions — ver [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md). Esto ya es aplicable a F1 (summary/notes/mind_map) sin esperar a ninguna etapa roadmap.

### R6 — `current_step` no representa progreso paralelo

**Riesgo:** con etapas paralelas dentro de una capa, un solo string (`current_step`) no puede representar "3 cosas procesándose a la vez" sin ambigüedad para el cliente de polling.

**Mitigación diseñada:** usar el campo `steps_snapshot` (JSONB) ya existente en `ai_job_status_history` — hoy declarado pero sin uso — para el detalle granular por capa, manteniendo `current_step` como el nombre de la capa activa para no romper el contrato simple que ya consume la app móvil.

### R7 — Sin mecanismo de regeneración parcial

**Riesgo:** hoy, si algo sale mal en un componente ya completado (ej. el usuario quiere "regenerar el mapa mental con otro enfoque"), no existe una forma de invalidar y regenerar solo esa pieza sin re-disparar todo el job.

**Mitigación recomendada:** al diseñar el endpoint de retry para componentes roadmap, contemplar desde el inicio una operación granular (`POST /jobs/{id}/components/{type}/regenerate`) apoyada en el modelo `stt_knowledge_component`, en vez de extender el retry actual (que opera a nivel de job completo).

### R8 — Invalidación en cascada no definida

**Riesgo:** si se regenera Clean Transcript o Topics, los componentes que dependen de ellos (Summary, Notes, Chapters, Flashcards...) quedarían potencialmente desactualizados sin que el sistema lo señalice.

**Mitigación recomendada:** cuando se implemente la capacidad de regeneración parcial (R7), definir explícitamente qué componentes se marcan como "potencialmente obsoletos" (no necesariamente se regeneran automáticamente — regenerar todo en cascada puede no ser deseable por costo) usando el grafo de dependencias de [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md).

### R9 — Adopción de `pgvector` es una decisión de infraestructura, no solo de producto

**Riesgo:** Semantic Search y AI Chat dependen de una extensión de PostgreSQL que el proyecto no usa hoy (`pgcrypto` es la única instalada). Comprometerse a fechas de F4/F5 sin validar la extensión en el entorno Docker actual y en el entorno de producción objetivo es un riesgo de planificación.

**Mitigación recomendada:** hacer un spike de validación de `pgvector` en el Docker Compose local antes de comprometer fechas de roadmap avanzado.

### R10 — Privacidad y límites de usuario en capacidades cross-pack

**Riesgo:** búsqueda cross-pack y grafo de Concepts entre grabaciones (Visión) implican consultas que cruzan múltiples `recording_id` de un mismo usuario — hay que asegurar que ninguna consulta cruce accidentalmente `user_id` de distintos usuarios.

**Mitigación recomendada:** todo endpoint o query cross-pack debe filtrar explícitamente por `user_id` extraído del JWT (principio 10 del `CLAUDE.md` raíz, sin excepción también para estas capacidades futuras).

---

## Recomendaciones antes de comenzar la implementación

1. **Implementar F1 primero, completo:** Transcript Cleanup + persistencia de Segmentos/Offsets + paralelización de summary/notes/mind_map. Es la base técnica y de datos de todo lo demás, y ya estaba planificada — este diseño solo la reordena y la completa con el punto de Segmentos/Offsets (R2).

2. **No crear `stt_knowledge_component` hasta que exista el primer componente roadmap real (Topics).** Construir la tabla genérica antes de tener un segundo caso de uso es sobre-diseño; construirla después del primero (Topics) valida el diseño contra un caso concreto antes de generalizar.

3. **Fijar el propósito de `raw_result_json` ahora** (R3), como parte del mismo cambio que resuelve R2 — es la oportunidad de menor costo para cerrar ambos vacíos a la vez.

4. **Decidir la fusión de llamadas de IA (R4) antes de implementar F2/F3**, no después — es mucho más barato diseñar el prompt combinado desde el inicio que refactorizar dos llamadas ya en producción.

5. **Prototipar la paralelización de Durable Functions (R5) en F1**, sobre las tres etapas ya existentes (summary/notes/mind_map), antes de sumarle etapas nuevas en F2 — es una validación de bajo riesgo del patrón antes de escalarlo.

6. **Diseñar `steps_snapshot` (R6) junto con la paralelización de F1** — no esperar a que el problema de progreso ambiguo aparezca en producción con etapas roadmap.

7. **Postergar el diseño fino de regeneración parcial (R7/R8) hasta que exista al menos un componente roadmap completo** — diseñarlo en abstracto ahora sería especulativo; diseñarlo contra Topics ya implementado será más preciso.

8. **Validar `pgvector` (R9) con un spike técnico antes de comprometer fechas de F4** — es una pregunta de infraestructura, no de producto, y puede resolverse en paralelo mientras se implementa F1–F3.

9. **Mantener el contrato HTTP actual intacto durante toda esta evolución.** Ningún cambio de este roadmap requiere romper `GET /jobs/{id}/result` ni el envelope `{ success, data, error }` — todo componente nuevo se expone como campo adicional o endpoint adicional, nunca reemplazando lo existente sin versionado explícito.

---

## Entregable — resumen ejecutivo

### 1. Visión general del nuevo Knowledge Pack

El Knowledge Pack es el objeto de conocimiento agregado que Champion AI construye a partir de un audio: no un reemplazo de las tablas actuales, sino el marco conceptual que las unifica y bajo el cual toda capacidad futura (Topics, Flashcards, Quiz, búsqueda semántica, chat) se diseña de forma consistente. Ver [`01-knowledge-pack-vision.md`](./01-knowledge-pack-vision.md).

### 2. Roadmap del pipeline

F0 (MVP actual, implementado) → F1 (Transcript Cleanup + offsets + paralelización, próxima implementación) → F2 (Topic/Keyword/Entity Extraction + modelo de componentes extensibles) → F3 (Chapters, Study Metadata, Flashcards, Quiz) → F4 (Semantic Search, requiere `pgvector`) → F5 (AI Chat, búsqueda cross-pack, grafo de Concepts — visión). Ver [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md).

### 3. Documentos creados

- `App/Docs/product/README.md`
- `App/Docs/product/01-knowledge-pack-vision.md`
- `App/Docs/product/02-knowledge-pack-spec.md`
- `App/Docs/product/03-intelligent-pipeline-design.md`
- `App/Docs/product/04-data-architecture.md`
- `App/Docs/product/05-ux-capabilities.md`
- `App/Docs/product/06-roadmap-risks-recommendations.md` (este documento)

### 4. Documentos modificados

Ver el commit/diff correspondiente — se actualizaron `README.md` (raíz), `CLAUDE.md` (raíz), `App/Knowledge/README.md`, `App/Knowledge/Product/vision.md`, `App/Knowledge/Roadmap/pipeline-roadmap.md`, `App/Knowledge/Roadmap/pending-features.md`, `App/rules/` (nuevo archivo `knowledge-pack.md`), `App/agents/` (nuevo agente `knowledge-pack-reviewer.md`), `App/commands/` (nuevo comando `knowledge-pack.md`).

### 5. Riesgos arquitectónicos encontrados

Diez riesgos identificados (R1–R10) — el más crítico es R1 (crecimiento no acotado del schema), mitigado por el modelo de componentes extensibles; el más urgente de corregir cuanto antes es R2 (datos de offsets descartados hoy, bloquean Topics/Timeline si no se corrige a tiempo).

### 6. Recomendaciones antes de comenzar la implementación

Implementar F1 completo primero (incluye cerrar R2/R3), validar paralelización de Durable Functions sobre etapas ya existentes, y no construir el modelo de componentes extensibles hasta tener el primer caso de uso real (Topics) que lo justifique.

---

## Referencias

- [`01-knowledge-pack-vision.md`](./01-knowledge-pack-vision.md)
- [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md)
- [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md)
- [`04-data-architecture.md`](./04-data-architecture.md)
- [`05-ux-capabilities.md`](./05-ux-capabilities.md)
