# Task API — pendiente desde Sprint 1 de Mobile (Knowledge Workspace)

> Contexto: Sprint 1 (EPIC V1 — Knowledge Workspace, ver `App/Knowledge/Roadmap/EPICS.md` y
> `App/Knowledge/Roadmap/SPRINT_PLANNING.md`) se está desarrollando desde Mobile. Varios puntos
> tocan al componente API y quedan anotados acá para no perderlos al volver a este componente.
>
> **Reframe importante (confirmado con el usuario):** el "reproductor de audio" del punto 3 de
> Sprint 1 **no reproduce el audio original grabado** — reproduce **narración TTS del contenido
> generado** (Resumen/Notas). Eso es, textualmente, el alcance de **EPIC V4 — Intelligent Audio
> Learning** (`App/Knowledge/Roadmap/EPICS.md`), hoy sin implementar y fuera del plan original de
> Sprint 1. El audio original grabado sigue siendo necesario, pero solo como **descarga/acceso**, no
> como reproducción integrada en el Workspace. Ver sección 3 más abajo para el detalle de TTS.

---

## 1. Confirmar si el audio original es descargable/accesible desde `blob_url`

**Origen:** requisito de descarga/acceso al audio original (ya no es "reproductor", ver reframe
arriba) — sigue siendo parte del Workspace, solo que como acción de descarga, no de streaming
integrado.

**Estado del código hoy** (verificado en `App/API/src/controllers/speech.controller.js` y
`App/API/src/services/azure_storage_service.js`):

- `POST /AIServices/Speechv2/init` genera dos URLs distintas para el mismo blob:
  - `upload_url` → `generateUploadUrl()`, SAS con permisos `create+write`, expira en 3600s. Solo
    sirve para el `PUT` inicial del cliente al subir el audio.
  - `blob_url` → `buildBlobUrl()`, URL **sin ningún token SAS**, se asume "permanente". Este es el
    valor que termina persistido en `stt_recording.blob_url` y expuesto por
    `vw_stt_recording_result` (consumido por `GET /jobs/{id}/result`).

**Lo que no está confirmado:** el nivel de acceso del container de Azure Blob Storage
(`SPEECH_BLOB_NAME`). Si el container es **privado** (default de Azure), un `GET` directo a
`blob_url` sin SAS devuelve 403 — el audio no sería reproducible desde Mobile tal cual, sin
importar qué tan bien esté hecho el componente de reproductor.

**Acción pendiente:**
1. Confirmar en Azure Portal (o en el IaC/infra si existe) el nivel de acceso del container usado
   para audio STT.
2. Si es privado → crear un endpoint nuevo, ej. `GET /AIServices/Speechv2/jobs/{job_id}/audio-url`,
   que genere una SAS de **solo lectura** on-demand (`BlobSASPermissions.parse("r")`), corta
   duración (ej. 15–30 min) — mismo patrón que `generateUploadUrl`, invertido en permisos.
3. Si es público → no se necesita ningún cambio de API, `blob_url` ya sirve para reproducir directo
   y este punto se cierra sin código nuevo.

**Nota para Mobile (ya aplicada del lado del cliente):** la acción de descarga del audio original no
debe asumir de antemano cuál de las dos opciones será. Se está construyendo detrás de una función
cliente única (ej. `getDownloadableAudioUrl(jobId)`) para poder cambiar la fuente sin tocar el
componente de UI cuando se resuelva este punto.

---

## 2. Cierre formal del punto 4 de Sprint 1 — endpoint de datos agregados

**Origen:** punto 4 de Sprint 1 — "Definir/ajustar endpoint de datos agregados del Knowledge Pack".
Este punto **no es trabajo de Mobile**, es una evaluación/decisión del lado API.

**Evaluación hecha hasta ahora:** `GET /jobs/{id}/result` (vía `vw_stt_recording_result`) ya
devuelve en una sola respuesta: `transcription_text`, `summary_text`, `notes_text`, `notes_json`,
`mind_map_json`, y metadata de audio (`blob_url`, `blob_name`, `duration_seconds`, `audio_format`).
No se identificó ningún campo que falte para lo que necesita el Workspace en V1, más allá del punto
1 de este archivo (reproducibilidad del audio).

**Acción pendiente:** una vez resuelto el punto 1, decidir formalmente si el endpoint actual
alcanza tal cual (probablemente sí) o si conviene una vista agregada nueva, y documentar esa
decisión en `App/Knowledge/Roadmap/BACKLOG.md` / `EPICS.md` para cerrar el ítem.

---

## 3. Endpoints para narración TTS del Workspace (reframe de punto 3 — ver nota superior)

**Origen:** el reproductor de audio del Workspace en realidad necesita voz sintetizada de
`summary_text`/`notes_text`, no el audio original. Esto es EPIC V4 y trae dependencia directa con
`App/procesamiento` — ver `App/procesamiento/task_procesamiento.md` para el detalle de la activity
de síntesis que debe crearse ahí (nueva, siguiendo el patrón `sp_*` + PostgreSQL, no reutilizando el
código legado descrito abajo).

**Selector de voz — ya existe, reutilizable tal cual:** `GET
/AIServices/Speechv2/getVoicesByLang` (`speech_routes.js:33-37` → `speech.controller.js` →
`speech_service.getVoicesByLang(lang)`) ya está implementado y montado en una ruta viva. Llama a la
API REST de voces de Azure AI Speech (`https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list`)
y filtra por locale. Mobile puede usarlo directo para el selector de voz de V4 sin ningún cambio de
API.

**Aclaración del usuario sobre el código existente (corrige mi lectura anterior):**
`speech_services.js` (y de igual manera `vision_services.js`) es código de **POC** — se probó el
concepto ahí, pero **no está invocado desde ningún controlador ni ruta del API**. No es una
violación arquitectónica activa, es código inerte que nunca se conectó a nada. `cosmosdb_service.js`
tampoco es legado accidental: se pensó deliberadamente para persistir manejo de jobs/estado a
futuro, simplemente no se aplica todavía — es una dirección a futuro, no algo a limpiar.

**Qué implica esto para V4:**
- `synthesizeToFile`/`#createSpeechSynthesizer` en `speech_services.js` puede servir como
  **referencia de cómo invocar el SDK de Azure Speech para síntesis** (la llamada en sí es válida),
  pero el flujo de ejecución debe construirse desde cero siguiendo el patrón actual: la síntesis
  ocurre en `App/procesamiento` (Azure Function), nunca en la API, vía queue + activity + SP +
  PostgreSQL — no reutilizar `executeflow1`/`executeflow2` tal cual (esos sí mezclan
  responsabilidades: encolan y a la vez procesan síncrono en el mismo módulo).
- Si el equipo decide en algún momento avanzar el plan de `cosmosdb_service.js` para manejo de
  jobs/estado, eso es una decisión de arquitectura aparte y no bloquea ni depende de V4 — se
  menciona acá solo para que quede claro que no es código a ignorar por error, sino una pieza
  intencional en pausa.

**Nuevo endpoint necesario, una vez exista la activity de síntesis:** algo como `GET
/AIServices/Speechv2/jobs/{job_id}/narration` que exponga `narration_audio_url` (sujeto al mismo
problema de accesibilidad del blob que el punto 1 de este archivo), `voice`, `duration_seconds` —
vía una vista nueva sobre la tabla/campos que se definan en `App/procesamiento/task_procesamiento.md`.

---

## Fuera de alcance de Sprint 1 — ya no aplica sin matices

`App/Knowledge/Roadmap/EPICS.md` (EPIC V1) dice que no requiere cambios en la Azure Function — eso
seguía siendo cierto para "reproducir el audio original", pero **deja de ser cierto** con el reframe
a narración TTS (sección 3 arriba), que sí trae trabajo real a `App/procesamiento`. Ver
`App/procesamiento/task_procesamiento.md`.
