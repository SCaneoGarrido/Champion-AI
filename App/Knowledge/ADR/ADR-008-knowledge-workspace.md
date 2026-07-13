# ADR-008: Knowledge Workspace como interfaz principal (reemplaza la vista Markdown)

tags: #adr #decision #product #mobile #workspace

---

## Estado

Propuesto (2026-07-13) — inicio de implementación en V1 del [[ROADMAP]]

---

## Contexto

El resultado de un Knowledge Pack (transcripción, resumen, notas, mapa mental) se consumía como texto plano/Markdown en pantallas separadas de la app móvil. Un primer intento de mejorar esa superficie de presentación (Markdown, LaTeX y Mermaid mind maps, implementado end-to-end) se revirtió por completo — código y base de datos — por bugs visuales persistentes en mobile (ver [[known-issues]] y memoria de proyecto `project_presentation_layer_status`).

Además, la visión de producto evolucionó: Champion AI deja de ser solo "una app de transcripción" y pasa a ser una plataforma de aprendizaje (ver [[PROJECT_VISION]]). Esa visión requiere una superficie de consumo que pueda crecer (audio sincronizado, topics, flashcards, chat) sin rehacer la base en cada versión — algo que una vista Markdown, por diseño, no está pensada para soportar.

---

## Decisión

Adoptar el **Knowledge Workspace** como la única superficie principal de consumo de resultados generados por IA, a partir de V1 del roadmap. Todo resultado (transcripción, resumen, notas, mapa mental, y lo que se agregue en V2-V5) se muestra dentro del Workspace — no existe una vista Markdown standalone como punto de entrada.

El Workspace se construye como un conjunto de componentes encapsulados (reproductor de audio, secciones de texto, renderizado de mapa mental) integrados en una sola pantalla de navegación, con el componente de mayor riesgo histórico (renderizado Mermaid) desarrollado y probado de forma aislada antes de integrarse — mitigación directa aprendida del rollback anterior.

---

## Consecuencias

### Positivas

- Una sola superficie de consumo para todo el contenido generado, en vez de pantallas fragmentadas
- Arquitectura de componentes preparada para las versiones V2-V5 sin rediseño de base
- El riesgo de regresión visual se mitiga por diseño (componentes aislados y probados antes de integrar), no solo por QA posterior

### Negativas

- Requiere reconstruir la experiencia de consumo desde cero en Mobile — no es una migración incremental de la vista Markdown existente
- El componente Mermaid, si se reintroduce sin las mismas precauciones, puede repetir los mismos bugs visuales del intento anterior

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Reintentar y arreglar la Presentation Layer (Markdown/LaTeX/Mermaid) existente | Ya fue revertida por completo una vez; el problema no era el formato específico sino que una vista de texto no escala a las capacidades del roadmap (timeline, chat, flashcards) |
| Mantener pantallas separadas por tipo de resultado (transcripción / resumen / notas / mapa mental) | Fragmenta la experiencia y no da una base común sobre la cual construir V2-V5 |

---

## Referencias

- [[PROJECT_VISION]] — visión de producto que motiva este cambio
- [[PRODUCT_STRATEGY]] — razonamiento de por qué el Workspace reemplaza la vista Markdown
- [[EPICS]] — EPIC V1, incluye riesgos y mitigación detallada
- [[known-issues]] — registro del rollback de la Presentation Layer
