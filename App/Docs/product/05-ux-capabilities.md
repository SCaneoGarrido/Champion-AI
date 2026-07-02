# Knowledge Pack — Capacidades de Experiencia de Usuario

tags: #product #ux #capabilities

---

Este documento especifica **capacidades**, no pantallas ni componentes visuales. Cada capacidad se define por lo que el usuario puede *hacer*, de qué componentes del Knowledge Pack depende, y en qué fase se vuelve posible. El diseño visual (mockups, pantallas) es una etapa posterior y separada de este documento.

---

## Tabla de trazabilidad — capacidad → componentes requeridos

| Capacidad | Componentes requeridos | Fase habilitada |
|---|---|---|
| Ver transcripción, resumen, notas, mapa mental | Raw/Clean Transcript, Summary, Notes, Mind Map | MVP implementado |
| Reproducción sincronizada (audio ↔ texto) | Audio Original, Segmentos + Offsets | MVP próximo |
| Navegación por capítulos | Topics, Chapters | Roadmap |
| Timeline / scrubber visual | Topics, Timeline, Segmentos + Offsets | Roadmap |
| Bookmarks | Segmentos + Offsets (ancla temporal) | Roadmap |
| Búsqueda por contenido con cita temporal | Topics, Keywords, Named Entities (búsqueda léxica) → Semantic Search (búsqueda semántica) | Roadmap → Roadmap avanzado |
| Reproducción inteligente (saltar relleno, saltar al siguiente topic) | Topics, Segmentos + Offsets | Roadmap |
| Modo de estudio (Study Mode) | Topics, Chapters, Study Notes, Flashcards | Roadmap |
| Repaso con flashcards | Flashcards | Roadmap |
| Quiz con puntaje | Quiz | Roadmap |
| Citas temporales compartibles (deep link) | Segmentos + Offsets, Topics | Roadmap |
| Biblioteca organizada por materia/dificultad | Study Metadata | Roadmap |
| Búsqueda semántica entre todas las grabaciones del usuario | Semantic Search (cross-pack) | Visión |
| AI Chat sobre una grabación | Semantic Search, Summary, Notes | Visión |
| Grafo de conceptos entre grabaciones | Concepts (cross-pack) | Visión |
| Exportar notas / mapa mental | Notes, Mind Map | Roadmap (capacidad de presentación, no requiere IA nueva) |

---

## Capacidades — MVP (ya posibles o en el próximo incremento)

### Ver el resultado consolidado

El usuario ve, para una grabación: transcripción, resumen, notas (texto o estructuradas) y mapa mental. Ya implementado vía `GET /jobs/{id}/result`.

### Reproducción sincronizada (audio ↔ texto)

Una vez que Segmentos + Offsets se persista (MVP próximo, sin costo de IA adicional — ver [`04-data-architecture.md`](./04-data-architecture.md)), la app puede:
- Resaltar la porción de transcripción correspondiente al punto de reproducción actual.
- Permitir que el usuario toque una frase de la transcripción y el audio salte a ese instante.

Esta es la primera capacidad "de estudio" que se habilita, y no depende de ninguna etapa de IA nueva — solo de dejar de descartar datos que Fast Transcription ya entrega.

---

## Capacidades — Roadmap

### Navegación por capítulos

El usuario ve un índice de capítulos (agrupaciones de Topics) y puede saltar directamente a cualquiera — análogo a los capítulos de un audiolibro o el índice de un PDF.

### Timeline / scrubber visual

Una barra de progreso enriquecida que marca visualmente dónde empieza y termina cada Topic, en vez de ser una barra de progreso lineal sin información.

### Bookmarks

El usuario marca un instante específico del audio para volver a él después. Requiere solo una ancla temporal (offset) — no depende de IA, solo de que el offset exista y sea direccionable.

### Búsqueda dentro del audio

El usuario escribe una consulta ("¿dónde se habló de X?") y el sistema devuelve el o los momentos relevantes con su cita temporal. En su primera versión (roadmap cercano) esto puede resolverse con búsqueda léxica sobre Topics/Keywords/Named Entities — no requiere embeddings todavía. La versión semántica ("encontrar por significado, no por palabra exacta") llega con Semantic Search.

### Reproducción inteligente

Saltar automáticamente entre topics, o (si se detectan silencios/relleno en los segmentos) permitir saltarlos. Se apoya en Topics + Segmentos, sin requerir un componente nuevo de IA.

### Study Mode

Presenta el contenido del Knowledge Pack como una experiencia de aprendizaje activo: navegación topic por topic (secuencial o aleatoria), con las notas de ese topic, sus flashcards y su quiz asociado, en vez de mostrar todo el resultado como un bloque plano.

### Repaso con flashcards / Quiz con puntaje

Modo de repaso activo apoyado directamente en los componentes Flashcards y Quiz — sin lógica de negocio adicional más allá de la presentación y el tracking del progreso de repaso (spaced repetition, si se decide implementarlo, es una capa de producto sobre este dato, no un componente del Knowledge Pack en sí).

### Citas temporales compartibles

Un link del tipo `champion://audio/{job_id}?t=182` que abre la app directamente en el segundo 182 del audio — ya anticipado en el roadmap técnico existente (`App/Knowledge/Roadmap/pipeline-roadmap.md`). Depende únicamente de que el offset exista y de un manejador de deep link en la app móvil.

### Biblioteca organizada

Filtrar y agrupar las grabaciones del usuario por materia, dificultad estimada o tags — apoyado en Study Metadata.

### Exportar notas / mapa mental

Generar un PDF o Markdown descargable a partir de `notes_text`/`notes_json`, o una imagen del árbol de `mind_map_json`. No requiere ninguna etapa de IA nueva — es una capacidad de presentación sobre datos ya generados.

---

## Capacidades — Visión

### Búsqueda semántica cross-pack

Buscar "¿en qué grabación hablé de X?" a través de **todo** el historial del usuario, no solo dentro de un audio. Requiere Semantic Search con embeddings indexados a nivel de usuario, no solo por pack.

### AI Chat sobre una grabación

Conversar con una grabación pasada — "¿qué se dijo sobre el presupuesto?", "resume la parte donde discuten el timeline". Requiere retrieval sobre Semantic Search más el Summary/Notes como contexto adicional (RAG).

### Grafo de conceptos entre grabaciones

Visualizar cómo los Concepts se repiten o se relacionan entre distintas grabaciones del usuario a lo largo del tiempo — la evolución de un mismo tema en múltiples audios.

---

## Principio de diseño de UX transversal

Toda capacidad nueva de UX debe poder trazarse a componentes concretos del Knowledge Pack (tabla de arriba). Si una capacidad propuesta no puede ubicarse en esa tabla, es señal de que falta especificar un componente nuevo en [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) antes de diseñar la experiencia — no se diseña UX sobre datos que no están definidos.

---

## Referencias

- [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) — componentes de los que depende cada capacidad
- `App/Docs/Mockups/` — mockups visuales existentes (Home, Catálogo de Servicios, Mis Apuntes) — referencia de estilo, no de alcance funcional
- `App/Knowledge/Roadmap/pipeline-roadmap.md` — visión técnica original de Study Mode y búsqueda
