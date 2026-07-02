# Feature: Mind Maps (Mapas Mentales)

tags: #feature #mindmap #llm #presentation-layer

---

## Descripción

La generación de mapas mentales es el último output del flujo [[speech-to-text]].
A partir de la transcripción, Azure OpenAI genera un mapa mental en formato JSON (`mind_map_json`) — esto no cambió.

Lo que cambió (Presentation Layer, ver `App/Knowledge/ADR/ADR-008-client-side-rendering.md`) es cómo se **presenta** ese árbol: dejó de ser una lista anidada con viñetas para convertirse en un diagrama Mermaid real, renderizado a SVG.

> No existe como feature independiente: el mapa mental siempre es parte del resultado STT.

---

## Cómo se genera (sin cambios)

El proceso ocurre dentro de la [[azure-function]], en el paso `mind_map`:

```
transcription_text → Azure OpenAI → mind_map_json
```

Prompt: `App/procesamiento/prompts/mind_map.md`. Salida: JSON puro, sin Markdown ni Mermaid — **este prompt no se toca** por la Presentation Layer.

Schema de `mind_map_json`:
```json
{
  "title": "",
  "nodes": [
    { "name": "", "children": [ { "name": "", "children": [] } ] }
  ]
}
```
Profundidad máxima: 4 niveles.

---

## Cómo se convierte a Mermaid (nuevo — Presentation Layer)

`mind_map_json` no es la salida final que ve el usuario. El orquestador `stt_live_recording.py` invoca, **directo en el código del orquestador** (no como Activity — es puro/determinístico, sin I/O, sin IA):

```
mind_map_json  →  mind_map_json_to_mermaid()  →  mind_map_mermaid_code
```

Ubicación: `App/procesamiento/shared/services/mermaid_converter.py`. Recorre el mismo árbol ya validado y emite sintaxis Mermaid `mindmap`, envolviendo todos los nombres de nodo en comillas para blindar contra caracteres especiales que puedan aparecer en texto generado por el modelo.

**Esto NO es una etapa de IA nueva** — es una proyección de datos ya existentes, igual en naturaleza a "Chapters" en el modelo de Knowledge Pack (`App/Docs/product/02-knowledge-pack-spec.md`, criterio §3).

---

## Cómo se renderiza (nuevo — Presentation Layer)

El cliente (`App/Mobile/src/components/MermaidRenderer.jsx`) resuelve el mapa mental en este orden:

1. Si el job ya tiene `mind_map_svg` cacheado → renderiza directo con `SvgXml` (`react-native-svg`), nativo, sin WebView.
2. Si no → monta un WebView con mermaid.js embebido como asset local, le pasa `mind_map_mermaid_code`, y al recibir el SVG resultante (`postMessage`) lo muestra y lo sube una sola vez a `PATCH /AIServices/Speechv2/jobs/{job_id}/mindmap-svg` para cachearlo.
3. Si `mermaid.render()` falla (sintaxis inválida) o el job es anterior a esta capa (sin `mind_map_mermaid_code`) → cae al renderer de lista anterior (`MindMapNode`), nunca deja la pantalla en blanco.

El WebView solo se usa la primera vez que alguien ve un mapa mental — después siempre se sirve el SVG cacheado. Deja la base lista para zoom, exportar, compartir, regenerar y editar (todas manipulan un string SVG o Mermaid ya persistido).

---

## Dónde se almacena

Tabla: `stt_recording_result`

| Campo | Tipo | Descripción |
|---|---|---|
| `mind_map_json` | JSONB | Árbol generado por IA — fuente de verdad |
| `mind_map_mermaid_code` | TEXT | Sintaxis Mermaid — proyección determinística de `mind_map_json` |
| `mind_map_svg` | TEXT | SVG renderizado y cacheado por el cliente — proyección de `mind_map_mermaid_code`, nunca fuente de verdad |

---

## Cómo se obtiene

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```
Devuelve los tres campos (`mind_map_json`, `mind_map_mermaid_code`, `mind_map_svg`) vía `vw_stt_recording_result`. Ver [[polling]].

Para cachear el SVG tras el primer render en el cliente:
```http
PATCH /AIServices/Speechv2/jobs/{job_id}/mindmap-svg
Body: { "svg": "<svg>...</svg>" }
```

---

## Migración de jobs existentes

Los jobs completados antes de esta capa tienen `mind_map_json` pero `mind_map_mermaid_code`/`mind_map_svg` en `NULL`. No hay backfill retroactivo — se resuelven en el cliente con el mismo fallback al renderer de lista anterior.

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación y la conversión determinística
- [[notes]] — Output anterior en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[stored-procedures]] — `sp_complete_stt_live_recording_job_v1`, `sp_save_mindmap_svg_v1`
- [[polling]] — Cómo obtener el resultado
- `App/Knowledge/ADR/ADR-008-client-side-rendering.md` — Decisión de arquitectura
- `App/rules/mobile-rendering.md` — Reglas de renderizado
