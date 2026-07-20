# Champion AI — Instrucciones para Claude Cowork

> Este archivo es la guía de colaboración en equipo para cualquier persona (o sesión de Claude
> Cowork) que trabaje sobre Champion AI. No repite lo que ya está documentado en otros archivos —
> los enlaza. Léelo antes de proponer o tomar trabajo nuevo en el proyecto.

---

## Qué es Champion AI

Champion AI es una plataforma de aprendizaje asistida por IA organizada alrededor del
**Knowledge Workspace**:

```
Champion AI → Knowledge Packs → Knowledge Workspace → Herramientas Inteligentes de Aprendizaje
```

Hoy el sistema tiene implementado de punta a punta el pipeline **Speech-to-Text (STT)
live_recording**: el usuario graba audio → la app lo sube a Azure Blob → la API lo encola → una
Azure Function transcribe, resume, genera notas y un mapa mental. Ese resultado (un
**Knowledge Pack**) es la base sobre la que se construye el Knowledge Workspace, la próxima
superficie principal de la app.

Contexto completo: `CLAUDE.md` (raíz, principios de arquitectura) y
`App/Knowledge/Product/PROJECT_VISION.md` (visión de producto). No dupliques esa lectura aquí —
este archivo asume que ya la hiciste o la vas a hacer antes de tocar código.

---

## Cómo está organizado el trabajo

El trabajo fluye en una cadena de documentos, cada uno más concreto que el anterior. Antes de
proponer trabajo nuevo, revisa en qué nivel de esa cadena ya existe (o no) lo que quieres hacer:

```
PROJECT_VISION   → por qué existe el producto, qué queda fuera de alcance
       ↓
PRODUCT_STRATEGY → por qué este orden de versiones (V1→V5), métricas de éxito
       ↓
ROADMAP          → tabla maestra de versiones V1–V5 y qué feature vive en cada una
       ↓
EPICS            → cada versión desglosada en EPIC: objetivo, historias, subtareas,
                    dependencias, criterios de aceptación, riesgos, prioridad, estimación
       ↓
BACKLOG          → issues listos para GitHub, con labels y jerarquía epic/issue/sub-issue
       ↓
MILESTONES       → mapeo de versiones a GitHub Milestones (M1–M5)
       ↓
SPRINT_PLANNING  → marco Scrum del equipo y qué issues entran en el sprint actual
```

Todos viven en `App/Knowledge/Product/` y `App/Knowledge/Roadmap/`. Un issue nuevo que no tenga
EPIC padre en `EPICS.md` no está listo para tomarse — falta ese paso intermedio antes de escribir
código.

**Regla de evolución por capas** (de `PRODUCT_STRATEGY.md`): cada versión amplifica a las
anteriores, ninguna las reemplaza. No adelantes trabajo de V2+ saltándote V1 salvo que sea un
spike explícitamente desacoplado (ver `SPRINT_PLANNING.md`).

---

## Principios arquitectónicos que no se negocian

La lista completa (10 principios) está en `CLAUDE.md` raíz. Los más críticos para trabajar en
equipo sin pisarse:

1. **La API orquesta, la Function procesa.** La API nunca ejecuta IA ni recibe binarios; la
   Function nunca llama a la API ni coordina otros componentes.
2. **Los Stored Procedures son el contrato del dominio.** Ningún componente hace `INSERT` /
   `UPDATE` / `DELETE` directo sobre tablas de dominio. Si tu tarea escribe en BD, primero
   preguntas si existe un SP reutilizable; si no, lo creas — idempotente desde el diseño
   (`ON CONFLICT DO UPDATE`).
3. **Todo lo que involucra IA es asíncrono** (queue + Azure Function). Nunca proceses IA dentro de
   un endpoint Express.
4. **El envelope HTTP `{ success, data, error }` es invariante.** Ninguna respuesta lo rompe, sin
   excepciones de conveniencia.
5. **El `user_id` siempre sale del JWT**, nunca del body del cliente.

Si dos personas trabajan en paralelo sobre componentes distintos (API / Mobile / Function / SQL),
estos principios son el motivo por el que normalmente no chocan: cada componente tiene una
frontera clara. Cuando sí trabajan sobre el mismo componente, ver "Normas para trabajo simultáneo"
abajo.

---

## Cómo se documenta el conocimiento

`App/Knowledge/` es una bóveda Obsidian que se define a sí misma como **conocimiento inferido,
sintetizado y enlazado** — no documentación duplicada del código. El ciclo esperado:

```
código cambia
   ↓
si la arquitectura o una decisión de diseño cambió → se registra un ADR nuevo en App/Knowledge/ADR/
   ↓
el vault (Architecture/, Features/, Flows/, Database/) se actualiza para reflejar el estado real
   ↓
si queda un vacío o una contradicción → se documenta en App/Knowledge/Bugs/known-issues.md,
   no se deja sin registrar
```

Antes de implementar una decisión arquitectónica nueva (no una feature dentro de los patrones ya
existentes, sino un cambio de patrón — ej. un nuevo mecanismo de comunicación entre componentes),
escribe el ADR primero. Los ADR-001 a ADR-012 existentes son el estilo a seguir: decisión + razón
principal, breve.

`App/Knowledge/README.md` tiene el índice completo y el mapa de navegación del vault.

---

## Normas de colaboración para trabajo simultáneo

Cuando más de una persona (o sesión) trabaja en el proyecto al mismo tiempo:

- **Un EPIC o issue de `BACKLOG.md` por sesión de trabajo.** No tomes un issue que ya figura como
  en progreso sin coordinar — `SPRINT_PLANNING.md` documenta qué entra en el sprint actual y con
  qué dependencias.
- **No toques Stored Procedures existentes sin preservar la idempotencia.** Si tu cambio afecta un
  SP que ya usan otros flujos (`sp_update_ai_job_status_v1`, por ejemplo, lo llaman tanto la API
  como la Function), coordina antes de cambiar su firma.
- **UI del Knowledge Workspace: probar en mobile antes de cerrar cualquier issue.** Es una lección
  directa del rollback completo de la Presentation Layer (Markdown/LaTeX/Mermaid) por bugs
  visuales — ver `App/Knowledge/Bugs/known-issues.md` (ISSUE-012) y la Definition of Done en
  `SPRINT_PLANNING.md`. No se da por cerrado un issue de Workspace solo porque compila.
  El componente Mermaid en particular debe probarse encapsulado y aislado antes de integrarse.
- **No dupliques trabajo de diseño de contrato de API.** Antes de crear un endpoint nuevo, revisa
  si `GET /jobs/{id}/result` (u otro ya existente) ya cubre el caso — ver la recomendación en
  `SPRINT_PLANNING.md` sobre el endpoint de datos agregados del Knowledge Pack.
- **Cualquier vacío de información que encuentres se registra**, no se resuelve por asunción. Súmalo
  a `App/Knowledge/Bugs/known-issues.md` con el mismo formato que los ISSUE-008 a ISSUE-011
  existentes (JWT refresh, `upload_status`, bloqueo de cuenta, rate limits — todos activos y sin
  dueño asignado hoy).
- **Reglas por dominio ya escritas — no las reinventes**: `App/rules/` (api, database, security,
  testing, azure) son las reglas reutilizables que cualquier sesión de Claude debe aplicar al
  revisar o escribir código de ese dominio. `App/agents/` tiene reviewers especializados
  (api-reviewer, mobile-reviewer, postgres-reviewer, azure-reviewer, architecture-reviewer) y
  `App/commands/` tiene prompts reutilizables para flujos comunes (`feature`, `refactor`, `debug`,
  `review`, `architecture`) — el de `feature.md` define el orden recomendado para una feature
  nueva: diseño → BD → API → Function → Mobile.

---

## Dónde mirar primero según el tipo de tarea

| Tipo de tarea | Dónde mirar primero |
|---|---|
| Bug en un endpoint de la API | `App/API/CLAUDE.md` + `App/Knowledge/Operations/error-codes.md` + `App/rules/api.md` |
| Nueva feature con IA (cualquier versión V1–V5) | `App/Knowledge/Roadmap/ROADMAP.md` + `EPICS.md` (no empezar sin EPIC padre) |
| Cambio de esquema o nuevo Stored Procedure | `App/Knowledge/Database/*` (schema-overview, tables, stored-procedures, functions) + `App/rules/database.md` |
| Cambio en el pipeline de la Azure Function | `App/procesamiento/CLAUDE.md` + `App/Knowledge/Architecture/azure-function.md` |
| Cambio en la app móvil / UI del Workspace | `App/Mobile/CLAUDE.md` + `App/Knowledge/ADR/ADR-008-knowledge-workspace.md` + `App/Knowledge/Bugs/known-issues.md` (ISSUE-012) |
| Duda de arquitectura general | `ARCHITECTURE.md` + `App/Knowledge/Architecture/overview.md` |
| Decisión de diseño nueva (patrón, no feature) | Escribir ADR en `App/Knowledge/ADR/` siguiendo el estilo ADR-001 a ADR-012 |
| Planificación / qué tomar a continuación | `App/Knowledge/Roadmap/SPRINT_PLANNING.md` + `BACKLOG.md` |

---

## Estado actual del proyecto

| Feature | Estado |
|---|---|
| Auth — register + login | Implementado |
| STT — pipeline completo (init upload, job, Function, polling, resultado, retry) | Implementado |
| Knowledge Workspace (V1) | Próximo — Sprint 1 en curso, ver `SPRINT_PLANNING.md` |
| Intelligent Study — Transcript Cleanup, Topics (V2) | Roadmap |
| Knowledge Enrichment (V2.5) | Roadmap |
| AI Learning Platform — Flashcards, Quiz, Chat (V3) | Roadmap |
| Intelligent Audio Learning — narración (V4) | Roadmap |
| Knowledge Platform — grafo, búsqueda semántica (V5) | Roadmap |

> Gestión de Archivos genérica fue retirada del roadmap activo — no la reintroduzcas sin evaluarla
> como versión nueva fuera de V1–V5. Ver `App/Knowledge/Bugs/known-issues.md`.

---

## Referencias

- `CLAUDE.md` (raíz) — principios arquitectónicos completos, restricciones absolutas, anti-patrones
- `ARCHITECTURE.md` — arquitectura técnica detallada
- `App/API/CLAUDE.md`, `App/Mobile/CLAUDE.md`, `App/procesamiento/CLAUDE.md` — contexto por componente
- `App/Knowledge/README.md` — índice y mapa de navegación del vault de conocimiento
