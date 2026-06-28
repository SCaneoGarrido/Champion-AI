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

Via endpoint (pendiente de implementación):
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

> El contrato muestra `mind_map` como objeto vacío en el ejemplo. La estructura real del JSON no está documentada.

Ver [[polling]].

---

## Preguntas abiertas

- ¿Cuál es la estructura del `mind_map_json`? ¿Nodos y conexiones, árbol, etc.?
- ¿La app móvil renderiza el mapa mental de forma visual?
- ¿Qué prompt se usa para generarlo?
- ¿Existe algún schema JSON validado para el mapa mental?

Ver [[known-issues]].

---

## Referencias cruzadas

- [[speech-to-text]] — Feature padre
- [[azure-function]] — Componente que ejecuta la generación
- [[notes]] — Output anterior en la cadena
- [[tables]] — Tabla `stt_recording_result`
- [[polling]] — Cómo obtener el resultado
