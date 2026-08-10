# BACKLOG — Champion AI

tags: #roadmap #backlog #github

> Lista plana de issues derivada de [[EPICS]], lista para copiar a GitHub Issues. Convención de jerarquía, labels y dependencias para GitHub Projects.

---

## Convención de jerarquía en GitHub

```
Milestone (= versión, ver [[MILESTONES]])
  └── Epic issue (issue padre con checklist de sub-issues, label epic)
        └── Issues (uno por subtarea técnica de EPICS.md)
              └── Sub-issues (si una tarea requiere partirse, ej. backend + mobile por separado)
```

- El **Epic issue** usa el título `[EPIC] V{n} — {nombre}` y el body es un checklist con un ítem por issue hijo (`- [ ] #123`).
- Los **issues** referencian su epic con `Part of #{epic_issue_number}`.
- Las **dependencias** entre issues se declaran en el body con `Depends on #{issue_number}` — GitHub no tiene dependencias nativas de issue, esta convención es la que usa el equipo hasta migrar a GitHub Projects con campos custom.
- Los **sub-issues** usan el checklist nativo de GitHub (tareas dentro del issue) cuando la subdivisión es puramente de implementación (ej. "backend" / "mobile" de la misma tarea).

---

## Labels propuestos

| Categoría | Labels |
|---|---|
| Tipo | `type:epic`, `type:feature`, `type:chore`, `type:spike`, `type:bug` |
| Área | `area:workspace` (Mobile/UI), `area:api`, `area:function`, `area:db`, `area:docs` |
| Versión | `version:v1`, `version:v2`, `version:v2.5`, `version:v3`, `version:v4`, `version:v5` |
| Prioridad | `priority:high`, `priority:medium`, `priority:low` |

---

## V1 — Knowledge Workspace

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| ~~Diseñar navegación del Knowledge Workspace (Mobile)~~ ✅ Resuelto (2026-07-13, [[ADR-009-mobile-navigation-manager-viewer-seam]]) | spike | workspace | Alta | S | — |
| ~~Componente de reproductor de audio integrado~~ ✅ Resuelto (2026-08-10) | feature | workspace | Alta | M | — |
| ~~Componente de mind map encapsulado + testeado en aislamiento~~ ✅ Resuelto (2026-08-10) — **no es Mermaid literal**, árbol nativo View/Text por el precedente de ISSUE-012; renderiza LaTeX real, ver [[ADR-013-math-rendering-pipeline-rewrite]] | feature | workspace | Alta | M | — |
| ~~Integrar reproductor + resumen + notas + mind map en una sola pantalla~~ ✅ Resuelto (2026-08-10) | feature | workspace | Alta | L | Los 3 anteriores |
| ~~Definir/ajustar endpoint de datos agregados del Knowledge Pack~~ ✅ Ya satisfecho por `GET /jobs/{id}/result` desde antes de este sprint, sin cambios | feature | api | Media | S | — |
| ~~QA de regresión visual en mobile~~ ✅ Resuelto (2026-08-10) — varias rondas de bugfixing real en dispositivo (renderizado matemático, paginación, overlaps de UI), no una ceremonia separada | chore | workspace | Alta | S | Integración de pantalla |
| ~~Flip de `KnowledgePackViewer` a producción~~ ✅ Resuelto (2026-08-10, [[ADR-014-knowledge-workspace-versioning]]) — Milestone M1 cerrado | chore | workspace | Alta | S | Todo lo anterior |

## V2 — Intelligent Study

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| Diseño técnico: Transcript Cleanup — prompt y validación de calidad | spike | function | Alta | S | — |
| `cleanup_activity.py` + `prompts/transcript_cleanup.md` | feature | function | Alta | M | Diseño técnico previo |
| Migración: campo `transcript_clean_text` en `stt_recording_result` | chore | db | Alta | S | — |
| Extender `sp_save_stt_partial_result_v1` para `transcript_cleanup` | feature | db | Alta | S | Migración de campo |
| Diseño técnico: extracción de topics (schema `topics_json`) | spike | function | Alta | S | Transcript Cleanup en producción |
| Activity de extracción de topics | feature | function | Alta | L | Diseño de topics |
| Migración: campo `topics_json` en `stt_recording_result` | chore | db | Alta | S | Diseño de topics |
| Endpoint `GET /jobs/{id}/topics` | feature | api | Media | S | Campo `topics_json` |
| Timeline + navegación por topic en el Workspace | feature | workspace | Alta | L | Endpoint de topics, V1 |
| Búsqueda dentro del audio/transcripción | feature | workspace | Media | M | Timeline |
| Persistencia de "continuar donde quedé" | feature | api,db | Media | M | Timeline |

## V2.5 — Knowledge Enrichment

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| Diseño técnico: modelo de datos de enrichment (keywords/entities/concepts/relaciones) | spike | db | Media | S | V2 completo |
| Activity de extracción de enrichment semántico | feature | function | Media | L | Diseño técnico |
| Migración: `enrichment_json` (o tabla dedicada) | chore | db | Media | M | Diseño técnico |
| Tabla + SP de favoritos y notas personales del usuario | feature | db | Media | M | — |
| Endpoints de favoritos/highlights/notas personales | feature | api | Media | M | Tabla de anotaciones |
| UI de highlight y notas personales en el Workspace | feature | workspace | Media | M | Endpoints de anotaciones, V1 |

## V3 — AI Learning Platform

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| Activity de generación de flashcards/quiz por topic | feature | function | Media | L | V2 (topics), V2.5 (enrichment) |
| Migración: `flashcards_json` / `quiz_json` | chore | db | Media | S | — |
| UI de flashcards y quiz en el Workspace | feature | workspace | Media | L | Activity de flashcards/quiz |
| Diseño técnico: chat sobre la clase (guardrails, fuente de verdad) | spike | function,api | Media | M | V2, V2.5 |
| Implementación de chat sobre la clase | feature | function,api,workspace | Media | XL | Diseño técnico de chat |
| Mind map interactivo (expandir/colapsar) | feature | workspace | Baja | M | Componente Mermaid de V1 |
| Endpoint + SP de reprocesamiento parcial por step | feature | api,db,function | Media | L | — |

## V4 — Intelligent Audio Learning

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| Diseño técnico: alcance de narración (summary/notes), voces disponibles | spike | function | Media | S | — |
| Activity de síntesis de voz (Azure AI Speech TTS) | feature | function | Media | L | Diseño técnico |
| Migración: tabla/campos de audio narrado | chore | db | Media | S | — |
| Construcción de SSML con prosodia básica | feature | function | Baja | M | Activity de síntesis |
| Selector de voz + reproducción en el Workspace | feature | workspace | Media | M | Activity de síntesis, V1 |
| Caché de audio narrado en Blob | chore | function | Media | S | Activity de síntesis |
| Descarga offline de narración | feature | workspace | Baja | M | Selector de voz |

## V5 — Knowledge Platform

| Issue | Tipo | Área | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|---|
| Diseño técnico: Knowledge Graph (modelo de datos) | spike | db | Baja | M | V2.5 con datos reales |
| Diseño técnico: búsqueda semántica (embeddings + almacenamiento vectorial) | spike | function,db | Baja | M | V2 con datos reales |
| ADR: elección de almacenamiento vectorial | chore | docs | Baja | S | Diseño técnico de búsqueda semántica |
| Implementación de búsqueda semántica | feature | function,api | Baja | XL | ADR de almacenamiento vectorial |
| Dashboard de progreso | feature | api,workspace | Baja | L | Datos reales de V1-V3 |
| Algoritmo de repaso espaciado + recomendaciones | feature | function,api | Baja | L | Resultados de quiz (V3) |

---

## Referencias

- [[EPICS]] — contexto completo de cada issue (historias de usuario, criterios de aceptación, riesgos)
- [[MILESTONES]] — a qué Milestone de GitHub pertenece cada bloque de issues
- [[SPRINT_PLANNING]] — qué subconjunto de V1 entra en el Sprint 1
