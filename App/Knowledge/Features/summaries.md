# Feature: Summaries (Generación de Resúmenes)

tags: #feature #summaries #llm

---

## Descripción

La generación de resúmenes es un output automático del flujo [[speech-to-text]].
Cuando el usuario procesa un audio, el sistema genera un resumen estructurado a partir de la transcripción, usando Azure OpenAI.

> No existe como feature independiente: el resumen siempre es parte del resultado STT.

---

## Cómo se genera

El proceso ocurre dentro de la [[azure-function]], en el paso `summary`:

```
transcription_text → Azure OpenAI → summary_text
```

El paso `summary` es el segundo en la cadena de procesamiento:

```
transcription → summary → notes → mind_map → completed
```

---

## Dónde se almacena

Tabla: `stt_recording_result`
Campo: `summary_text` (TEXT)

---

## Cómo se obtiene

Via endpoint (pendiente de implementación):
```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "job_id": "...",
    "status": "completed",
    "result": {
      "transcription": "...",
      "summary": "...",
      "notes": "...",
      "mind_map": {}
    }
  }
}
```

Ver [[polling]].

---

## Preguntas abiertas

- ¿Qué prompt se usa para generar el resumen?
- ¿El resumen tiene una longitud máxima o estructura esperada?
- ¿Se puede solicitar el resumen de forma independiente (sin audio)?
- ¿Qué modelo de Azure OpenAI se usa?

Ver [[known-issues]].

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre de los resúmenes
- [[azure-function]] — Componente que ejecuta la generación
- [[notes]] — Otro output del mismo flujo
- [[mind-maps]] — Otro output del mismo flujo
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
