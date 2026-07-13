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

Respuesta:
```json
{
  "data": {
    "result": {
      "mind_map": {}
    }
  }
}
```

Ver [[polling]].

---

## Dirección de producto (Roadmap)

El mapa mental deja de renderizarse en una vista Markdown standalone. Pasa a vivir **dentro del Knowledge Workspace**:

- **EPIC V1 — Knowledge Workspace:** el mind map se integra como componente del Workspace, encapsulado y probado de forma aislada antes de integrarse — mitigación directa del rollback previo de la Presentation Layer (Markdown/LaTeX/Mermaid), ver [[known-issues]] y [[ADR-008-knowledge-workspace]].
- **EPIC V3 — AI Learning Platform:** el mind map se vuelve **interactivo** (expandir/colapsar nodos), construido sobre el mismo componente de V1.

Ver [[ROADMAP]] y [[EPICS]] para el detalle completo.

---

## Preguntas abiertas

- ¿La app móvil renderiza el mapa mental de forma visual hoy? (previo al Workspace)
- ¿Qué prompt se usa para generarlo?

Ver [[known-issues]].

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación
- [[notes]] — Output anterior en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
- [[EPICS]] — EPIC V1 (integración al Workspace) y EPIC V3 (interactividad)
- [[ADR-008-knowledge-workspace]] — Decisión de reemplazar la vista Markdown por el Workspace
