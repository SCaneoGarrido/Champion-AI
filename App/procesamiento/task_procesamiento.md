# Task Procesamiento (Azure Function) — pendiente desde Sprint 1 de Mobile (Knowledge Workspace)

> Contexto: Sprint 1 (EPIC V1 — Knowledge Workspace) se está desarrollando desde Mobile. El punto 3
> del sprint ("reproductor de audio integrado") se confirmó con el usuario que en realidad significa
> **narración TTS del contenido generado** (Resumen/Notas), no reproducción del audio original. Eso
> es, textualmente, el alcance de **EPIC V4 — Intelligent Audio Learning**
> (`App/Knowledge/Roadmap/EPICS.md`) — hoy sin implementar. Al traer esa pieza a Sprint 1, se trae
> también su dependencia real en este componente, aunque EPICS.md decía que V1 "no requiere cambios
> en la Azure Function".

Ver también `App/API/task_api.md` sección 3 — contraparte de API de esta misma pieza (endpoint de
narración + selector de voz, este último ya implementado y reutilizable).

---

## 1. Nueva activity de síntesis de voz (Azure AI Speech TTS)

**Qué hace:** toma `summary_text` y/o `notes_text` ya generados (`stt_recording_result`) y produce
audio narrado, subido a Azure Blob, con la voz seleccionada por el usuario.

**Cómo debe ejecutarse (siguiendo los invariantes de `CLAUDE.md` raíz):**
- Asíncrona, vía el mismo mecanismo queue + Durable Function que el resto del pipeline STT — nunca
  síncrona ni disparada directo desde la API.
- Nuevo step del orquestador Durable (o un orquestador separado si el equipo decide que narración es
  un flujo independiente del pipeline STT original — a definir en diseño técnico).
- Toda escritura de estado/resultado vía Stored Procedure nuevo, mismo patrón que
  `sp_save_stt_partial_result_v1` — nunca DML directo.
- Idempotente desde el diseño (`ON CONFLICT DO UPDATE`), igual que el resto del pipeline.

**Nota sobre el código TTS existente en el API** (`App/API/src/services/speech_services.js`,
`App/API/src/helpers/speech_helpers.js`): es código de **POC** (prueba de concepto), no invocado
desde ningún controlador ni ruta viva del API — no es una implementación en producción a migrar,
solo una referencia de cómo invocar el SDK de Azure Speech para síntesis
(`#createSpeechSynthesizer`, `synthesizeToFile`). El flujo real (persistencia, control de estado,
encolado) se construye desde cero acá en `App/procesamiento`, siguiendo el patrón ya establecido
(queue → Durable Function → activity → SP → PostgreSQL) — no el `executeflow1`/`executeflow2` del
POC. `cosmosdb_service.js` tampoco es algo a limpiar: es una dirección intencional a futuro para
manejo de jobs/estado, en pausa, no relacionada con este trabajo. Detalle completo en
`App/API/task_api.md` sección 3.

---

## 2. Migración: tabla/campos para audio narrado

Por EPICS.md V4: nuevo campo/tabla — `narration_audio_url`, voz usada, duración — vía SP dedicado,
mismo patrón que `stt_recording_result`. A definir en diseño técnico si es una tabla nueva
(`stt_recording_narration` o similar, ya que puede haber una narración por `summary` y otra por
`notes`, potencialmente con voces distintas) o campos adicionales en `stt_recording_result`.

---

## 3. Construcción de SSML con prosodia básica

Marcado de pausas y énfasis a partir del texto fuente. Por EPICS.md: acotar el alcance inicial a
pausas/énfasis básicos — la prosodia avanzada es la parte más experimental del EPIC y no es
necesaria para un primer entregable funcional.

---

## 4. Caché de audio narrado en Blob

Evitar regenerar la narración si el texto fuente (`summary_text`/`notes_text`) no cambió desde la
última síntesis — comparar contra lo ya persistido antes de volver a llamar a Azure AI Speech (costo
y latencia, ver riesgo documentado en EPICS.md V4).

---

## Dependencias y orden sugerido

1. Diseño técnico corto primero: alcance de la narración (¿summary y notes por separado o
   combinados?, ¿una voz por Knowledge Pack o por sección?) — spike, no bloquea si se acota rápido.
2. Migración de tabla/campos (punto 2) — puede ir en paralelo al diseño de SSML.
3. Activity de síntesis (punto 1) — depende del punto 2 (necesita dónde persistir el resultado).
4. SSML con prosodia básica (punto 3) — puede empezar acotado (solo texto plano a la API de síntesis,
   sin SSML) para no bloquear un primer entregable, y sumar SSML como iteración siguiente.
5. Caché (punto 4) — optimización, no bloquea el primer entregable funcional.

No depende de V3. Se beneficia de V2 (Transcript Cleanup) pero no lo requiere — puede narrar el
`summary_text`/`notes_text` actuales tal cual existen hoy.
