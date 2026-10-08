# Feature: Mind Maps (Mapas Mentales)

tags: #feature #mindmap #llm

---

## Descripción

La generación de mapas mentales es el último output del flujo [[speech-to-text]].
A partir de la transcripción, Azure OpenAI genera un mapa mental en formato JSON.

> No existe como feature independiente: el mapa mental siempre es parte del resultado STT.

---

## Cómo se genera

El proceso ocurre dentro de la [[azure-function]], en el paso `mind_map`:

```
transcription_text → Azure OpenAI → mind_map_json
```

El paso `mind_map` es el último antes de `completed`:

```
transcription → summary → notes → mind_map → completed
```

---

## Dónde se almacena

Tabla: `stt_recording_result`

| Campo | Tipo | Descripción |
|---|---|---|
| `mind_map_json` | JSONB | Estructura del mapa mental |

---

## Cómo se obtiene

Via endpoint:
```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```

Respuesta (campo `mind_map_json` al mismo nivel que el resto del resultado, no anidado — ver [[polling]]):
```json
{
  "data": {
    "mind_map_json": { "title": "...", "nodes": [] }
  }
}
```

Ver [[polling]].

---

## Dirección de producto (Roadmap)

El mapa mental ya no se renderiza en una vista Markdown standalone. Vive **dentro del Knowledge
Workspace**, en producción desde 2026-08-10:

- **EPIC V1 — Knowledge Workspace (cerrado):** el mind map se renderiza como **árbol nativo**
  (`MindMapDiagram.jsx`, componentes `View`/`Text`, no Mermaid/WebView) en `MindMapScreen.jsx`, que
  fuerza rotación a landscape al entrar en foco (`expo-screen-orientation`). Cada nombre de nodo
  reutiliza el mismo pipeline de renderizado Markdown+LaTeX que Resumen/Notas (`RichMarkdown.jsx`,
  ver [[ADR-013-math-rendering-pipeline-rewrite]]) — no una whitelist de comandos LaTeX aparte. Esta
  decisión de usar árbol nativo en vez de Mermaid fue tomada desde el diseño inicial, no como
  reacción a un bug — ver [[known-issues]] ISSUE-012 y [[ADR-008-knowledge-workspace]].
- **EPIC V3 — AI Learning Platform:** el mind map se vuelve **interactivo** (expandir/colapsar
  nodos), construido sobre el mismo componente de V1.

Ver [[ROADMAP]] y [[EPICS]] para el detalle completo.

---

## Preguntas abiertas

Ninguna pendiente sobre el renderizado — resuelto en M1 (ver arriba). Ver [[known-issues]] para
vacíos vigentes en otras áreas del proyecto.

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación
- [[notes]] — Output anterior en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
- [[EPICS]] — EPIC V1 (integración al Workspace) y EPIC V3 (interactividad)
- [[ADR-008-knowledge-workspace]] — Decisión de reemplazar la vista Markdown por el Workspace
