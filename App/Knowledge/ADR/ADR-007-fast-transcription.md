# ADR-007: Azure AI Speech Fast Transcription en lugar de SDK Continuous Recognition

tags: #adr #decision #azure #speech #transcription

---

## Estado

Implementado (2026-06)

---

## Contexto

La primera implementación del paso `transcription` usaba **Azure Speech SDK Continuous Recognition** (biblioteca `azure-cognitiveservices-speech`). Este enfoque presentó los siguientes problemas:

1. **Rendimiento inaceptable:** el SDK de Continuous Recognition está diseñado para streaming en tiempo real. Procesaba audio a ≤1× velocidad real — un audio de 14 minutos tardaba ~26 minutos solo en la etapa de transcripción.

2. **Conversión de formato obligatoria:** el SDK requería audio en formato WAV PCM (16kHz, mono, 16-bit). Esto exigía una conversión previa desde el formato original (WebM, M4A, etc.) usando PyAV (`av`), añadiendo complejidad y dependencias pesadas.

3. **Dependencias pesadas:** el paquete `azure-cognitiveservices-speech` pesa ~150 MB y tiene binarios nativos que complican el deployment en Azure Functions.

4. **API deprecada:** el método `AudioStreamFormat.get_wave_format_pcm()` fue eliminado en SDK ≥1.24, causando `AttributeError` en producción.

---

## Decisión

Migrar completamente a **Azure AI Speech Fast Transcription REST API**.

Endpoint:
```
POST https://{SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15
```

---

## Consecuencias

### Positivas

- **Velocidad:** procesamiento a ~10–50× velocidad real. Audio de 14 min → 1–2 min.
- **Formatos nativos:** acepta WebM, MP3, M4A, MP4, OGG, WAV, FLAC, AAC sin conversión previa.
- **Dependencias eliminadas:** `azure-cognitiveservices-speech` (~150 MB) y `av` (PyAV) removidos de `requirements.txt`.
- **Simplicidad:** una sola llamada HTTP POST con `multipart/form-data`. Sin callbacks, sin threading, sin event handlers.
- **Respuesta sincrónica:** el resultado (`combinedPhrases[0].text` + `phrases[]` con offsets) llega en la misma respuesta HTTP.

### Negativas

- **Límite de tamaño:** 200 MB por archivo (vs sin límite práctico en streaming).
- **Límite de duración:** 4 horas por archivo.
- **Sin streaming:** no apto para transcripción en tiempo real o en vivo.
- **Dependencia de red:** una sola llamada HTTP — si falla, hay que reintentarla completa.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Azure Speech SDK Continuous Recognition | Rendimiento ≤1× real-time, conversión obligatoria, dependencias pesadas |
| Azure Speech Batch Transcription | Asíncrona (requiere polling a Azure), más compleja de integrar, latencia mayor |
| OpenAI Whisper | No disponible en el entorno Azure actual, costo adicional |

---

## Referencias

- [[azure-services]] — Documentación de Fast Transcription
- [[stt-processing]] — Flujo de procesamiento actual
- [[azure-function]] — Componente que usa este servicio
- R-AZURE-11 en `App/rules/azure.md`
