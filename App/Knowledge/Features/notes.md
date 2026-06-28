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

Via endpoint (pendiente de implementación):
```http
GET /AIServices/Speechv2/jobs/{job_id}/result
```

Respuesta:
```json
{
  "data": {
    "result": {
      "notes": "..."
    }
  }
}
```

> El contrato actual del endpoint devuelve `notes` como campo único. No está especificado si devuelve texto, JSON o ambos.

Ver [[polling]].

---

## Preguntas abiertas

- ¿Cuál es la estructura del `notes_json`? ¿Listas de puntos, secciones, etc.?
- ¿El endpoint devuelve `notes_text` o `notes_json` o ambos?
- ¿Qué prompt se usa para generar las notas?

Ver [[known-issues]].

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación
- [[summaries]] — Output anterior en la cadena
- [[mind-maps]] — Output siguiente en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
