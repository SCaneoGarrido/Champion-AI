# Roadmap del Pipeline Inteligente

tags: #roadmap #pipeline #future #ai

---

## Visión

El pipeline de procesamiento STT de Champion AI está diseñado para evolucionar progresivamente desde una transcripción básica hacia un **motor de conocimiento estructurado y navegable**. Cada nueva etapa amplifica el valor de las anteriores sin reemplazarlas.

---

## Estado actual del pipeline (implementado)

```
Audio (formato original)
        │
        ▼
Azure AI Speech — Fast Transcription
        │
        ▼
Resumen ejecutivo (gpt-5-mini)
        │
        ▼
Notas estructuradas — texto + JSON (gpt-5-mini)
        │
        ▼
Mapa mental jerárquico — JSON (gpt-5-mini)
        │
        ▼
Resultado disponible via polling
```

| Step name | Servicio | Output | Estado |
|---|---|---|---|
| `transcription` | Azure AI Speech Fast Transcription | `transcription_text` | Implementado |
| `summary` | gpt-5-mini | `summary_text` | Implementado |
| `notes` | gpt-5-mini | `notes_text` + `notes_json` | Implementado |
| `mind_map` | gpt-5-mini | `mind_map_json` | Implementado |

---

## Fase 2 — Transcript Cleanup (próxima implementación)

### Qué es

Un paso de limpieza que usa GPT-5 para procesar el texto crudo de Fast Transcription antes de que lo consuman los pasos de generación de contenido.

### Por qué

La Fast Transcription produce texto fiel al audio, incluyendo:
- Muletillas y frases de relleno ("eh", "o sea", "bueno")
- Repeticiones y correcciones en voz
- Frases incompletas
- Ruido conversacional

Limpiar estos artefactos antes del resumen, notas y mapa mental mejora la calidad de todos los outputs downstream sin cambiar el significado del contenido.

### Pipeline con Transcript Cleanup

```
transcription_text (crudo)
        │
        ▼
transcript_cleanup (gpt-5-mini)
        │
        ▼
transcript_text (limpio)
        │
        ├──► summary
        ├──► notes
        └──► mind_map
```

### Implementación

- Nueva activity: `cleanup_activity.py`
- Nuevo prompt: `prompts/transcript_cleanup.md`
- Nuevo step name: `transcript_cleanup`
- Nuevo campo en resultado: `transcript_clean_text` (TEXT) en `stt_recording_result`
- Nuevo SP o extensión del SP existente para persistir resultado parcial
- El smart retry ya soporta el nuevo paso via `sp_save_stt_partial_result_v1` + COALESCE

---

## Fase 3 — Topic Extraction (roadmap)

### Qué es

Un paso de extracción semántica que analiza la transcripción limpia e identifica los **temas principales**, su posición temporal en el audio y su jerarquía conceptual.

### Por qué

Topic Extraction convierte el audio de un bloque monolítico en un documento **navegable por capítulos**, análogo a lo que los índices hacen en un libro.

### Qué habilita

| Capacidad futura | Descripción |
|---|---|
| Navegación por capítulos | El usuario puede saltar a una sección del audio por nombre de tema |
| Study Mode | Modo de estudio que presenta los topics uno a uno con sus notas asociadas |
| Búsqueda dentro del audio | Buscar "¿dónde se habló de X?" y obtener el timestamp exacto |
| Citas temporales | Referenciar un fragmento específico del audio con timestamp |
| Flashcards automáticas | Generadas por topic: pregunta → respuesta basada en el contenido |
| Quizzes | Tests de comprensión generados automáticamente por tema |

### Estructura de output (propuesta)

```json
{
  "topics": [
    {
      "id": "topic_01",
      "name": "Introducción al proyecto",
      "start_time_seconds": 0.0,
      "end_time_seconds": 182.5,
      "summary": "...",
      "key_points": ["...", "..."]
    },
    {
      "id": "topic_02",
      "name": "Arquitectura del sistema",
      "start_time_seconds": 182.5,
      "end_time_seconds": 524.0,
      "summary": "...",
      "key_points": ["...", "..."]
    }
  ]
}
```

Los `start_time_seconds` y `end_time_seconds` se derivan de los `phrases` con `offset` que devuelve Fast Transcription, cruzados con los segmentos identificados por el modelo.

### Dependencias técnicas

- Los offsets de `phrases[]` en la respuesta de Fast Transcription ya están disponibles
- Requiere un nuevo campo JSONB (`topics_json`) en `stt_recording_result`
- Requiere nuevo SP o extensión de `sp_save_stt_partial_result_v1`
- Requiere nuevos endpoints de API: `GET /jobs/{id}/topics`

### Pipeline completo con Topic Extraction

```
transcription_text (crudo)
        │
        ▼ transcript_cleanup
transcript_text (limpio) + phrases[] con offsets
        │
        ├──► summary
        ├──► notes
        ├──► mind_map
        └──► topic_extraction
                   │
                   ├── topics_json (navegación, Study Mode)
                   ├── flashcards_json (futuro)
                   └── quiz_json (futuro)
```

---

## Fase 4 — Study Mode y capacidades avanzadas (visión)

### Study Mode

Interfaz en la app móvil que presenta el contenido del audio en modo de aprendizaje:
- Topic por topic (navegación secuencial o aleatoria)
- Reproducción del fragmento de audio del topic
- Notas asociadas al topic
- Flashcards del topic

### Búsqueda semántica dentro del audio

El usuario escribe "¿en qué minuto se habló de X?" y el sistema:
1. Busca en `topics_json` el topic más relevante
2. Devuelve el timestamp y un fragmento de la transcripción
3. La app salta al minuto exacto en el reproductor de audio

### Citas temporales compartibles

Links con timestamp: `champion://audio/{job_id}?t=182` que abren la app en el minuto exacto.

---

## Evolución de la máquina de estados

### Estado actual

```
queued → processing/transcription → processing/summary
       → processing/notes → processing/mind_map → completed
```

### Con Transcript Cleanup

```
queued → processing/transcription → processing/transcript_cleanup
       → processing/summary → processing/notes
       → processing/mind_map → completed
```

### Con Topic Extraction

```
queued → processing/transcription → processing/transcript_cleanup
       → processing/summary → processing/notes
       → processing/mind_map → processing/topic_extraction → completed
```

---

## Criterios de decisión para nuevas etapas del pipeline

Al diseñar una nueva etapa de procesamiento, responder:

1. **¿Qué input necesita?** — ¿texto crudo, texto limpio, topics, audio original?
2. **¿Qué output produce?** — ¿nuevo campo en `stt_recording_result` o nueva tabla?
3. **¿Es dependiente de etapas anteriores o paralela?** — Paralela → ejecutar con `yield context.task_all([])`
4. **¿Qué SP o extensión necesita?** — Siempre via SP, nunca DML directo
5. **¿Qué endpoint expone hacia el cliente?** — Definir antes de implementar
6. **¿El smart retry la cubre?** — Verificar que `sp_save_stt_partial_result_v1` persiste su resultado parcial

---

## Referencias cruzadas

- [[speech-to-text]] — Feature STT actual
- [[azure-function]] — Componente que ejecuta el pipeline
- [[azure-services]] — Fast Transcription y Azure OpenAI
- [[stt-processing]] — Flujo de procesamiento actual
- [[pending-features]] — Features pendientes de implementación
