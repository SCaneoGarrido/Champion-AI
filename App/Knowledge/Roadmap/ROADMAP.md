# ROADMAP — Champion AI

tags: #roadmap #official

> Roadmap oficial del proyecto. Reemplaza por completo a `pending-features.md` y `pipeline-roadmap.md` (retirados — ver [[known-issues]]).
> Referencia para GitHub Projects, Milestones, Issues, Knowledge Vault, README y planificación Scrum.
> Última actualización: 2026-07-13.

---

## Visión resumida

```
Champion AI → Knowledge Packs → Knowledge Workspace → Herramientas Inteligentes de Aprendizaje
```

Ver [[PROJECT_VISION]] y [[PRODUCT_STRATEGY]] para el razonamiento completo.

---

## Versiones

| Versión | Nombre | Objetivo | Estado | Epic |
|---|---|---|---|---|
| **V1** | Knowledge Workspace | Reemplazar la vista Markdown por una superficie de consumo unificada (audio + resumen + notas + mapa mental) | Próximo | [[EPICS#EPIC V1 — Knowledge Workspace]] |
| **V2** | Intelligent Study | Mejorar la calidad del dato y hacerlo navegable por tema y por tiempo | Roadmap | [[EPICS#EPIC V2 — Intelligent Study]] |
| **V2.5** | Knowledge Enrichment | Enriquecer el conocimiento con metadata semántica y curaduría personal | Roadmap | [[EPICS#EPIC V2.5 — Knowledge Enrichment]] |
| **V3** | AI Learning Platform | Convertir el conocimiento en herramientas de aprendizaje activo | Roadmap | [[EPICS#EPIC V3 — AI Learning Platform]] |
| **V4** | Intelligent Audio Learning | Narración inteligente del contenido generado | Roadmap | [[EPICS#EPIC V4 — Intelligent Audio Learning]] |
| **V5** | Knowledge Platform | Conectar Knowledge Packs entre sí como una plataforma de conocimiento | Roadmap | [[EPICS#EPIC V5 — Knowledge Platform]] |

---

## Detalle de features por versión

### V1 — Knowledge Workspace
- Nueva UI (Knowledge Workspace)
- Audio Player integrado
- Summary
- Notes
- Mermaid Mind Map (dentro del Workspace, no como vista Markdown standalone)
- Mejor experiencia móvil
- Arquitectura preparada para crecimiento (V2 en adelante)

### V2 — Intelligent Study
- Transcript Cleanup (GPT-5) — limpieza de artefactos de voz antes de summary/notes/mind map
- Audio sincronizado con el texto
- Timeline de navegación
- Topics (extracción semántica de temas con timestamps)
- Search dentro del audio/transcripción
- Audio Quotes (citas temporales)
- Continuar donde quedó (resume de sesión de estudio)

### V2.5 — Knowledge Enrichment
- Keywords
- Concepts
- Entities
- Metadata semántica
- Relaciones entre conceptos
- Highlight
- Favoritos
- Notas personales del usuario

### V3 — AI Learning Platform
- Flashcards
- Quiz
- Chat sobre la clase
- Mermaid interactivo
- Reprocesamiento parcial (re-ejecutar un paso del pipeline sin repetir todo)
- Workspace avanzado

### V4 — Intelligent Audio Learning
- Selección de voz
- Narración del Summary
- Narración de Notes
- Study Narration
- SSML
- Prosodia contextual
- Caché de audio narrado
- Descarga offline

### V5 — Knowledge Platform
- Knowledge Graph
- Búsqueda semántica
- Relación entre clases/Knowledge Packs
- Dashboard
- Recomendaciones
- Repaso espaciado

---

## Qué se retira de este roadmap

- **Gestión de Archivos genérica** — no forma parte de ninguna versión V1–V5. Reemplazada conceptualmente por Knowledge Packs. Ver nota histórica en [[known-issues]].
- **TTS como feature standalone** — no existe como capacidad genérica separada; su alcance vive dentro de **V4 — Intelligent Audio Learning**, acotado a narración del contenido ya generado por el Workspace.

---

## Documentos relacionados

| Documento | Contenido |
|---|---|
| [[PROJECT_VISION]] | Visión de producto |
| [[PRODUCT_STRATEGY]] | Por qué este orden, qué reemplaza, métricas de éxito |
| [[EPICS]] | Cada versión desglosada en EPIC (objetivo, historias, subtareas, dependencias, criterios de aceptación, riesgos, prioridad, estimación) |
| [[BACKLOG]] | Issues listos para GitHub, agrupados por EPIC, con labels y estimaciones |
| [[MILESTONES]] | Mapeo de versiones a GitHub Milestones |
| [[SPRINT_PLANNING]] | Marco Scrum y propuesta de Sprint 1 |

---

## Referencias cruzadas

- [[overview]] — arquitectura técnica actual (invariante, no cambia con este roadmap)
- [[speech-to-text]] — feature base sobre la que se construye V1 en adelante
- [[known-issues]] — decisiones de alcance y vacíos abiertos
