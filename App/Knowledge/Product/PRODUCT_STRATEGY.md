# Product Strategy — Champion AI

tags: #product #strategy #roadmap

---

## Por qué el Knowledge Workspace reemplaza la vista Markdown

El pipeline STT ya producía transcripción, resumen, notas y mapa mental — pero el consumo de ese resultado era, en la práctica, una lectura lineal de texto. Un primer intento de mejorar esa superficie (Presentation Layer: Markdown, LaTeX, Mermaid mind maps) se implementó de punta a punta y se **revirtió por completo** (código + BD) por bugs visuales persistentes en mobile.

Conclusión estratégica: el problema no era "qué formato de texto mostrar", era que el formato de texto **no es la unidad correcta de experiencia** para contenido pensado para estudiar. La estrategia a partir de V1 es construir una superficie de producto (Knowledge Workspace) diseñada desde cero como espacio de estudio — no como visor de Markdown — y tratar el render de Mermaid como un componente encapsulado y probado dentro de esa superficie, no como la superficie completa.

Ver [[ADR-008-knowledge-workspace]] y el registro del rollback en [[known-issues]].

---

## Principio de evolución por capas

Cada versión del roadmap (ver [[ROADMAP]]) **amplifica** el valor de las versiones anteriores; ninguna las reemplaza:

```
V1  Superficie de consumo         → sin esto, nada de lo siguiente tiene dónde vivir
V2  Calidad del dato + navegación → mejora lo que V1 muestra, sin cambiar V1
V2.5 Enriquecimiento semántico    → añade metadata sobre lo que V2 ya organizó
V3  Aprendizaje activo            → usa el enriquecimiento de V2.5 para generar ejercicios
V4  Audio inteligente             → narra lo que V1-V3 ya generaron, no reemplaza texto
V5  Plataforma de conocimiento    → conecta Knowledge Packs entre sí, requiere que existan (V1-V4)
```

Este es el mismo principio que ya regía la evolución del pipeline técnico (`pipeline-roadmap.md`, ahora retirado) — se generaliza de "evolución del pipeline STT" a "evolución del producto completo".

---

## Por qué este orden (V1 → V5)

| Orden | Versión | Criterio de prioridad |
|---|---|---|
| 1 | V1 — Knowledge Workspace | Sin una superficie de consumo estable y mobile-first, ninguna feature nueva tiene dónde mostrarse. Máxima prioridad porque desbloquea todo lo demás. |
| 2 | V2 — Intelligent Study | El dato crudo de Fast Transcription tiene artefactos de voz (muletillas, repeticiones). Limpiarlo y hacerlo navegable (topics, timeline, búsqueda) mejora la calidad de todo lo que consume ese texto después. |
| 3 | V2.5 — Knowledge Enrichment | Una vez que el texto es navegable, se puede anotar semánticamente (keywords, entidades, relaciones) sin rehacer el trabajo de V2. |
| 4 | V3 — AI Learning Platform | El aprendizaje activo (flashcards, quiz, chat) necesita topics y enriquecimiento como input — depende de V2 y V2.5. |
| 5 | V4 — Intelligent Audio Learning | Narrar contenido tiene más valor cuando el contenido ya está limpio, estructurado y enriquecido — depende de todo lo anterior para tener algo bueno que narrar. |
| 6 | V5 — Knowledge Platform | Conectar Knowledge Packs entre sí (grafo, búsqueda semántica, recomendaciones) requiere volumen y estructura semántica acumulada de las versiones previas. |

---

## Métricas de éxito por versión (cualitativas)

No existen datos de uso reales todavía — estas métricas son la base para instrumentar telemetría a medida que se implementa cada versión, no mediciones ya recolectadas.

| Versión | Qué indicaría éxito |
|---|---|
| V1 | El usuario consume el resultado completo (audio + resumen + notas + mapa mental) sin salir del Workspace; cero regresiones visuales tipo Presentation Layer |
| V2 | El usuario navega el audio por topics en vez de escuchar/leer linealmente; el texto limpio reduce quejas de calidad en resumen/notas |
| V2.5 | El usuario usa favoritos/highlights de forma recurrente; las entidades/keywords se reutilizan como filtros de búsqueda |
| V3 | Tasa de finalización de quizzes/flashcards; uso recurrente del chat sobre la clase |
| V4 | Minutos de audio narrado consumidos; uso de descarga offline |
| V5 | Consultas de búsqueda semántica entre clases distintas; adopción del dashboard/recomendaciones |

---

## Referencias

- [[PROJECT_VISION]] — visión de producto completa
- [[ROADMAP]] — versiones y features
- [[EPICS]] — desglose accionable por versión
- [[known-issues]] — rollback de Presentation Layer, retiro de Gestión de Archivos
