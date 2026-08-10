# MILESTONES — Champion AI

tags: #roadmap #milestones #github

> Mapeo de versiones del [[ROADMAP]] a GitHub Milestones. Sin fechas calendario — orden relativo únicamente. El equipo puede asignar fechas al crear los milestones reales en GitHub.

---

## Milestones propuestos

| Milestone | Versión | Epic asociado | Definition of Done |
|---|---|---|---|
| **M1 — Knowledge Workspace** ✅ CERRADO (2026-08-10) | V1 | [[EPICS#EPIC V1 — Knowledge Workspace]] | Criterios cumplidos: Workspace único en producción (`KnowledgePackViewer` → `KnowledgeWorkspaceScreen`, ver [[ADR-014-knowledge-workspace-versioning]]), mind map estable (árbol nativo, no Mermaid literal — decisión documentada), sin vista Markdown/legacy como entrada principal |
| **M2 — Intelligent Study** | V2 | [[EPICS#EPIC V2 — Intelligent Study]] | Transcript Cleanup y Topics en producción; navegación, búsqueda y "continuar donde quedé" funcionando en el Workspace |
| **M2.5 — Knowledge Enrichment** | V2.5 | [[EPICS#EPIC V2.5 — Knowledge Enrichment]] | Keywords/entities/concepts disponibles por Knowledge Pack; favoritos y notas personales persistentes |
| **M3 — AI Learning Platform** | V3 | [[EPICS#EPIC V3 — AI Learning Platform]] | Flashcards, quiz y chat sobre la clase disponibles; mind map interactivo; reprocesamiento parcial funcionando |
| **M4 — Intelligent Audio Learning** | V4 | [[EPICS#EPIC V4 — Intelligent Audio Learning]] | Narración de summary/notes disponible con selección de voz y descarga offline |
| **M5 — Knowledge Platform** | V5 | [[EPICS#EPIC V5 — Knowledge Platform]] | Búsqueda semántica y relaciones entre Knowledge Packs disponibles; dashboard y recomendaciones activos |

---

## Orden de ejecución

```
M1 → M2 → M2.5 → M3 → M4 → M5
```

El orden sigue la cadena de dependencias documentada en cada EPIC (ver [[EPICS]]) y el razonamiento de priorización en [[PRODUCT_STRATEGY]]. No se recomienda paralelizar M2 en adelante sin que M1 esté cerrado, ya que todas las versiones siguientes requieren el Workspace como superficie de entrega.

Con M1 cerrado, cualquier feature de M2 en adelante se construye primero en la sección Beta
permanente del Workspace (ver [[ADR-014-knowledge-workspace-versioning]]) y se promueve a la ruta
estable solo después de validarse en dispositivo — mismo criterio que ya se aplicó de facto para
cerrar M1.

M4 no depende de M3 y podría, en principio, ejecutarse en paralelo a M3 si el equipo tiene capacidad — se mantiene después en la secuencia por prioridad de negocio (aprendizaje activo antes que narración), no por dependencia técnica dura. Ver [[EPICS]] para el detalle de dependencias de cada versión.

---

## Rango de issues por Milestone

Ver [[BACKLOG]] para la lista completa. Cada sección de la tabla de BACKLOG.md (V1, V2, V2.5, V3, V4, V5) corresponde 1:1 a un Milestone de esta tabla.

---

## Convención de asignación en GitHub

- Cada issue de [[BACKLOG]] se asigna al Milestone de su versión al crearse.
- El Epic issue (ver convención de jerarquía en [[BACKLOG]]) se asigna al mismo Milestone que sus issues hijos.
- Un Milestone se cierra cuando todos sus issues (incluido el Epic issue) están cerrados **y** los criterios de aceptación del EPIC correspondiente están verificados manualmente — el cierre automático por "todos los issues cerrados" no es suficiente por sí solo.
