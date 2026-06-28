# Feature: Text to Speech (TTS)

tags: #feature #tts #pending

---

## Estado

> **Esta feature está mencionada en el README pero no tiene documentación técnica en las fuentes disponibles.**
> No existe contrato API, ni schema de BD, ni flujo documentado para TTS.

---

## Lo que se sabe

El README de Champion AI menciona:

> "Conversión de **texto a voz**"
> "Generación automática de resúmenes"

Y como capacidad de los servicios Azure AI integrados:

> "procesamiento de voz"

No hay más información sobre endpoints, parámetros, formatos de salida ni implementación.

---

## Preguntas abiertas

- ¿Existe un endpoint `/AIServices/TTS/...`?
- ¿El audio generado se almacena en Azure Blob?
- ¿Se sigue el mismo patrón async (Queue + Function) que el STT?
- ¿Cuáles son los formatos de audio de salida?
- ¿Qué voces o locales de Azure Speech se usan?
- ¿Se crea un job tipo `ai_job` para TTS también?
- ¿Existe una tabla `tts_*` análoga a `stt_recording`?

---

## Suposición arquitectónica (no confirmada)

Si se sigue el mismo patrón que [[speech-to-text]], el flujo esperado sería:

```
POST /AIServices/TTS/init
→ Crear job
→ Encolar en queue dedicada
→ Azure Function procesa TTS
→ Almacena audio en Blob
→ Polling de estado y resultado
```

> **Advertencia:** Esto es una inferencia, no está documentado. No implementar basándose en este supuesto.

---

## Acción recomendada

Documentar el contrato HTTP y el flujo una vez que sea implementado, siguiendo el mismo estándar que [[speech-to-text]].

---

## Referencias cruzadas

- [[vision]] — Mención como capacidad del sistema
- [[speech-to-text]] — Feature análoga, completamente documentada
- [[pending-features]] — Lista de features pendientes
- [[known-issues]] — Registro de vacíos de información
