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

## Propuesta de Sprint 1 (arranque de V1 — Knowledge Workspace)

Priorizado desde la tabla V1 de [[BACKLOG]], respetando dependencias:

1. ~~**Diseñar navegación del Knowledge Workspace (Mobile)**~~ ✅ Resuelto (2026-07-13) — ver
   [[ADR-009-mobile-navigation-manager-viewer-seam]]. "Mis Apuntes" navega a una ruta estable
   `KnowledgePackViewer` (hoy apunta a `NoteDetailScreen`); construir el Workspace es solo
   implementar el componente y reasignar `component={...}` en `App.jsx` — no requiere ningún
   trabajo de navegación adicional ni volver a tocar `NotesScreen.jsx`.
2. **Componente Mermaid mind map encapsulado + testeado en aislamiento** — feature, M — ya no
   depende de nada, es lo próximo a arrancar; es la pieza de mayor riesgo histórico (ver EPIC V1 en
   [[EPICS]])
3. **Componente de reproductor de audio integrado** — feature, M — ya no depende del diseño de
   navegación (resuelto), puede arrancar en paralelo al punto 2
4. **Definir/ajustar endpoint de datos agregados del Knowledge Pack** — feature (API), S — puede
   avanzar en paralelo, sin dependencias. Punto de partida: `GET /jobs/{id}/result` (via
   `vw_stt_recording_result`) ya devuelve transcripción + resumen + notas + mind map en una sola
   respuesta — evaluar primero si alcanza tal cual antes de diseñar un endpoint nuevo.

Con el punto 1 resuelto, lo que queda de Sprint 1 son los puntos 2–4, ninguno bloqueado. Quedan
fuera de Sprint 1 (siguiente sprint natural dentro de V1): integración final de las 3 piezas en una
sola pantalla, y el QA de regresión visual — ambas dependen de que los componentes anteriores
existan primero.

### Por qué este recorte
- Prioriza primero el componente de mayor riesgo conocido (Mermaid) para descubrir temprano si hay problemas similares a los de la Presentation Layer revertida, cuando todavía es barato corregir el rumbo.
- No incluye integración final en el mismo sprint — evita repetir el patrón de "todo junto, todo se revierte junto" que ya ocurrió una vez.

---

## Recomendación para el siguiente sprint (post Sprint 1)

Con los 4 issues de Sprint 1 cerrados, el sprint siguiente debería enfocarse en:
1. **Integrar reproductor + resumen + notas + mind map en una sola pantalla** (depende de los 3 componentes de Sprint 1)
2. **QA de regresión visual en mobile** inmediatamente después de la integración, antes de dar por cerrado el Milestone M1
3. Si M1 cierra sin incidentes, iniciar el **diseño técnico de Transcript Cleanup** (primer issue de V2 en [[BACKLOG]]) en paralelo al QA final de M1, ya que es un spike sin dependencia de Mobile

No se recomienda arrancar issues de V2 en paralelo a la integración de V1 (punto 1) — el equipo es de 2 personas y la integración es la pieza de mayor riesgo de todo el Milestone M1.

---

## Referencias

- [[BACKLOG]] — issues completos con estimación y dependencias
- [[EPICS]] — criterios de aceptación y riesgos por EPIC
- [[MILESTONES]] — orden de versiones
