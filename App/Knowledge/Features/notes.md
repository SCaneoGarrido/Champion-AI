# Feature: Notes (Notas Estructuradas)

tags: #feature #notes #llm

---

## Descripción

La generación de notas es un output automático del flujo [[speech-to-text]].
A partir de la transcripción, Azure OpenAI genera notas en dos formatos: texto plano y JSON estructurado.

> No existe como feature independiente: las notas siempre son parte del resultado STT.

---

## Cómo se genera

El proceso ocurre dentro de la [[azure-function]], en el paso `notes`:

```
transcription_text → Azure OpenAI → notes_text + notes_json
```

El paso `notes` es el tercero en la cadena:

```
transcription → summary → notes → mind_map → completed
```

---

## Dónde se almacena

Tabla: `stt_recording_result`

| Campo | Tipo | Descripción |
|---|---|---|
| `notes_text` | TEXT | Notas en formato texto legible |
| `notes_json` | JSONB | Notas en estructura JSON para consumo programático |

La existencia de ambos formatos (texto y JSON) sugiere que la app móvil puede mostrar las notas de forma formateada (usando el JSON) o en modo texto plano.

---

## Cómo se obtiene

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```

Respuesta (`notes_text` y `notes_json` se devuelven **ambos**, como campos independientes al mismo
nivel — no anidados bajo `result`, ver [[polling]]):
```json
{
  "data": {
    "notes_text": "# Title\n...",
    "notes_json": {
      "title": "",
      "overview": "",
      "concepts": [{ "name": "", "definition": "", "explanation": "", "context": "", "observations": "" }],
      "examples": [],
      "important_details": [],
      "key_takeaways": []
    }
  }
}
```

Ver [[polling]].

---

## Estructura real de `notes_json`

Definida por el prompt `App/procesamiento/prompts/notes_json.md` (espejo en
`App/Knowledge/Prompts/notes_json.md`). El campo `examples[]` tiene un shape mixto — confirmado
contra datos reales de producción, no solo contra el prompt: cada elemento es **un string plano O**
un objeto `{ statement, solution, notes }` cuando el ejemplo es un problema resuelto con estructura
propia. El cliente móvil (`workspaceMapper.js`'s `formatExample()`) maneja ambos casos — ver
[[ADR-013-math-rendering-pipeline-rewrite]] para el bug histórico que esto corrigió
(`[object Object]` en pantalla cuando el shape no se manejaba).

---

## Preguntas abiertas

Ninguna pendiente sobre el contrato del endpoint o el shape de `notes_json` — resueltas en esta
auditoría y en la sesión de M1. Ver [[known-issues]] para vacíos vigentes en otras áreas.

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación
- [[summaries]] — Output anterior en la cadena
- [[mind-maps]] — Output siguiente en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
