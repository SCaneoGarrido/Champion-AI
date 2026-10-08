# Feature: Summaries (Generación de Resúmenes)

tags: #feature #summaries #llm

---

## Descripción

La generación de resúmenes es un output automático del flujo [[speech-to-text]].
Cuando el usuario procesa un audio, el sistema genera un resumen ejecutivo a partir de la transcripción usando Azure OpenAI (gpt-5-mini).

> No existe como feature independiente: el resumen siempre es parte del resultado STT.

---

## Cómo se genera

El proceso ocurre dentro de la [[azure-function]], en el paso `summary`:

```
transcription_text → gpt-5-mini (summary.md prompt) → summary_text
```

El paso `summary` es el segundo en la cadena de procesamiento:

```
transcription → summary → notes → mind_map → completed
```

**Próxima etapa planificada:** se insertará `transcript_cleanup` entre `transcription` y `summary` (EPIC V2 — Intelligent Study). Ver [[EPICS]].

---

## Estructura del output

El prompt `summary.md` instruye al modelo a producir Markdown estructurado:

```markdown
# Executive Summary
(párrafo conciso con lo esencial)

# Main Topics
- Topic
- Topic

# Key Insights
(bullet list con las ideas más relevantes)

# Decisions
(solo decisiones explícitas — si no hay: "No explicit decisions were made.")

# Final Conclusion
(síntesis de lo discutido)
```

---

## Dónde se almacena

Tabla: `stt_recording_result`
Campo: `summary_text` (TEXT)

---

## Cómo se obtiene

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```

Respuesta (`summary_text` al mismo nivel que el resto del resultado, no anidado bajo `result` — ver [[polling]]):
```json
{
  "success": true,
  "data": {
    "job_id": "...",
    "job_status": "completed",
    "summary_text": "# Executive Summary\n...",
    "notes_text": "...",
    "notes_json": {},
    "mind_map_json": {}
  },
  "error": null
}
```

El Knowledge Workspace pagina el Resumen por los headings `# ` (H1) reales del texto Markdown — cada
sección corresponde a un heading del prompt de arriba (Executive Summary, Main Topics, etc.), mismo
patrón que Notas pagina por concepto. Ver [[ADR-014-knowledge-workspace-versioning]].

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre de los resúmenes
- [[azure-function]] — Componente que ejecuta la generación
- [[notes]] — Otro output del mismo flujo
- [[mind-maps]] — Otro output del mismo flujo
- [[EPICS]] — Evolución futura del pipeline (EPIC V2 — Intelligent Study)
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
