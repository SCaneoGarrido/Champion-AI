# SPRINT PLANNING — Champion AI

tags: #roadmap #scrum #sprint

> Marco de planificación Scrum para el equipo (Nicolás Bustamante, Sebastián Caneo). Sin fechas ni duración de sprint impuesta — a definir por el equipo según disponibilidad real. Se documenta la mecánica y una propuesta concreta de Sprint 1.

---

## Marco general

**Metodología:** Scrum con iteraciones cortas, funcionalidades clave priorizadas (confirmado en [[PROJECT_VISION]]).

### Ceremonias sugeridas
- **Sprint Planning:** al inicio de cada sprint, seleccionar issues de [[BACKLOG]] respetando dependencias y el orden de [[MILESTONES]]
- **Daily / async check-in:** dado el tamaño del equipo (2 personas), puede ser un mensaje de estado corto en vez de una ceremonia formal
- **Sprint Review:** demo de lo completado contra los criterios de aceptación del EPIC en curso (ver [[EPICS]])
- **Retro:** qué se aprendió, especialmente relevante dado el precedente de rollback de la Presentation Layer — cualquier riesgo similar debe surgir acá antes de escalar

### Definition of Ready (para que un issue entre a un sprint)
- Tiene EPIC padre identificado en [[EPICS]]
- Sus dependencias (columna "Dependencias" en [[BACKLOG]]) ya están resueltas o entran en el mismo sprint en orden correcto
- Si es `type:spike`, tiene un objetivo de diseño claro y un output esperado (documento de diseño, no código)

### Definition of Done
- Cumple su criterio de aceptación individual (heredado del EPIC)
- No introduce DML directo fuera de Stored Procedures (Azure Function) ni rompe el envelope `{ success, data, error }` (API) — invariantes de `CLAUDE.md` raíz
- Si toca UI del Workspace, fue probado manualmente en mobile antes de darse por cerrado (lección directa del rollback de Presentation Layer)

---

## Sprint 1 (arranque de V1 — Knowledge Workspace) — ✅ CERRADO (2026-08-10)

Los 4 issues planificados están resueltos:

1. ~~**Diseñar navegación del Knowledge Workspace (Mobile)**~~ ✅ Resuelto (2026-07-13) — ver
   [[ADR-009-mobile-navigation-manager-viewer-seam]].
2. ~~**Componente mind map encapsulado + testeado en aislamiento**~~ ✅ Resuelto (2026-08-10) — con
   una salvedad respecto al plan original: **no es Mermaid literal**, es un árbol nativo
   (View/Text), decisión tomada por el precedente de rollback de ISSUE-012 y ya reflejada en
   [[EPICS]]/[[BACKLOG]]. Renderiza LaTeX real vía el mismo pipeline que Resumen/Notas — ver
   [[ADR-013-math-rendering-pipeline-rewrite]].
3. ~~**Componente de reproductor de audio integrado**~~ ✅ Resuelto (2026-08-10) — play/pause, seek,
   endpoint de streaming dedicado (`GET /jobs/:job_id/stream`, sin lock de un solo uso).
4. ~~**Endpoint de datos agregados del Knowledge Pack**~~ ✅ Ya estaba satisfecho por
   `GET /jobs/{id}/result` desde antes de este sprint — confirmado, sin cambios necesarios.

### Bonus resuelto fuera de la planificación original de Sprint 1
- **Integración de las 3 piezas en una sola pantalla** (originalmente prevista para el sprint
  *siguiente*) — ya está hecha: `KnowledgeWorkspaceScreen.jsx` tiene Resumen/Notas/Transcripción +
  Bloques (mind map) + Audio, todos accesibles desde el mismo `FloatingToolbar`.
- **QA de regresión visual** — sucedió en la práctica como una serie de rondas de bugfixing real en
  dispositivo (renderizado matemático, paginación, overlaps de UI) en vez de una ceremonia
  separada. Ver el changelog de la sesión y [[ADR-013-math-rendering-pipeline-rewrite]].
- **Flip a producción**: `KnowledgePackViewer` ya apunta a `KnowledgeWorkspaceScreen` — ver
  [[ADR-014-knowledge-workspace-versioning]]. Milestone **M1 cerrado** (ver [[MILESTONES]]).

### Por qué el recorte original funcionó
- Priorizar primero el componente de mayor riesgo conocido (mind map) permitió descubrir temprano
  los problemas reales (no los mismos de la Presentation Layer revertida, pero de la misma familia
  — renderizado enriquecido en mobile) cuando todavía era barato corregir el rumbo.
- No incluir la integración final en el mismo sprint evitó repetir el patrón de "todo junto, todo
  se revierte junto".

---

## Convención permanente: sección Beta del Workspace

A partir del cierre de M1, el patrón "probar aislado antes de integrar" queda formalizado como una
sección **Beta** permanente (no una ruta temporal ad-hoc) — ver
[[ADR-014-knowledge-workspace-versioning]]. Cualquier feature de la próxima iteración (V2 Topics,
V4 narración/TTS, etc.) se prueba primero ahí, se valida en dispositivo, y recién después se
promueve a la ruta estable (`KnowledgePackViewer`, hoy "Knowledge Workspace V1").

---

## Recomendación para el siguiente sprint

Con M1 cerrado, el sprint siguiente debería enfocarse en (según lo que el equipo decida priorizar):
1. **Si se sigue con V4 (narración/TTS)** — que ya arrancó en paralelo (backend en progreso) — vale
   la pena decidirlo a propósito: es un salto en el orden documentado de [[MILESTONES]] (M2→M2.5→M3
   antes de M4), aceptable si hay sinergia real con el reproductor de audio recién construido, pero
   debería quedar como decisión explícita del equipo, no implícita.
2. **Si se sigue el orden documentado** — iniciar el **diseño técnico de Transcript Cleanup**
   (primer issue de V2 en [[BACKLOG]]), un spike sin dependencia de Mobile.

En ambos casos: cualquier UI nueva se construye primero en la sección Beta del Workspace, no
directo en la ruta estable.

---

## Referencias

- [[BACKLOG]] — issues completos con estimación y dependencias
- [[EPICS]] — criterios de aceptación y riesgos por EPIC
- [[MILESTONES]] — orden de versiones
