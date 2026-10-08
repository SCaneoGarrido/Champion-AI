# Feature: Text to Speech (TTS) — Intelligent Audio Learning (EPIC V4)

tags: #feature #tts #roadmap #v4

---

## Estado

> Esta feature ya **no es una capacidad genérica de TTS**. Fue reencuadrada como parte de **EPIC V4 — Intelligent Audio Learning** (ver [[EPICS]] y [[ROADMAP]]). Sigue sin implementación real — este documento describe el alcance planificado, no algo ya construido.
>
> Existe scaffolding inicial sin lógica (`App/API/src/controllers/tts.controller.js` — try/catch
> vacío con comentarios de los datos que necesitaría recibir; `App/API/src/routes/text_routes.js` —
> un único `GET /text-to-speech` que responde un mensaje fijo, sin validación ni cola). No hay
> endpoint POST, no hay job, no hay Stored Procedure ni integración con Azure Speech TTS todavía —
> ver la tabla de endpoints en [[backend-api]] donde se documenta explícitamente como **stub**.

---

## Alcance actual (V4)

TTS deja de significar "convertir cualquier texto a voz". El alcance acotado es: **narrar el contenido que el Knowledge Workspace ya generó** — específicamente `summary_text` y `notes_text` de un Knowledge Pack — con:

- Selección de voz
- Narración del Summary
- Narración de Notes (Study Narration)
- SSML con prosodia contextual
- Caché de audio narrado (evitar regenerar si el texto fuente no cambió)
- Descarga offline

Ver el detalle completo (historias de usuario, subtareas técnicas, dependencias, riesgos) en [[EPICS#EPIC V4 — Intelligent Audio Learning]].

---

## Diseño esperado (siguiendo el patrón STT)

Siguiendo el mismo patrón arquitectónico que [[speech-to-text]] — la Function procesa, la API orquesta, todo vía SP — el flujo esperado es:

```
Summary/Notes ya generados (Knowledge Pack existente)
        │
        ▼
POST /AIServices/.../narrate (a definir)  →  encola job de narración
        │
        ▼  [Azure Function — Durable]
Azure AI Speech (TTS) → SSML → audio narrado
        │
        ▼
Guarda en Azure Blob + metadata (voz, duración) vía SP dedicado
        │
        ▼
Polling de estado y resultado (mismo patrón que STT)
```

> Este es el diseño esperado según los invariantes arquitectónicos del proyecto, no un contrato ya implementado. El diseño técnico definitivo se hace como spike al inicio del EPIC V4 (ver [[BACKLOG]]).

---

## Preguntas abiertas

- ¿Qué endpoint HTTP expone la API para solicitar narración?
- ¿La narración es un nuevo tipo de `ai_job` o una extensión de `stt_recording_result`?
- ¿Qué voces/locales de Azure Speech se soportan inicialmente?
- ¿Cómo se invalida el caché de audio narrado si el usuario regenera el resumen/notas?

---

## Referencias cruzadas

- [[PROJECT_VISION]] — mención de esta capacidad dentro de la cadena de valor del producto
- [[EPICS]] — EPIC V4, alcance técnico completo
- [[ROADMAP]] — versión V4 — Intelligent Audio Learning
- [[speech-to-text]] — Feature análoga, completamente documentada, mismo patrón arquitectónico a seguir
- [[known-issues]] — ISSUE-004, estado de esta feature
