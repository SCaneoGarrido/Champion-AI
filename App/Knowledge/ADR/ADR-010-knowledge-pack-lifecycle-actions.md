# ADR-010: Acciones de administración de Knowledge Packs — Editar, Eliminar, reprocesamiento con instrucciones propias

tags: #adr #decision #mobile #api #procesamiento #workspace

---

## Estado

Adoptado (2026-07-13)

---

## Contexto

[[ADR-009-mobile-navigation-manager-viewer-seam]] estableció que "Mis Apuntes" debe comportarse
como el **administrador de Knowledge Packs** de la app, con la navegación al viewer desacoplada de
su implementación concreta. Esta decisión completa esa administración agregando las acciones que le
faltaban al menú de opciones (`JobOptionsModal`) de un Knowledge Pack completado:

- **Renombrar** — ya existía backend (`PATCH /jobs/{id}/name`), pero no estaba conectado a la UI
- **Eliminar** — no existía en ninguna capa
- **Reprocesar un step con instrucciones propias** — no existía en ninguna capa

Ninguna de las dos últimas tenía soporte en SQL, API o Azure Function antes de este cambio. El
menú de opciones pasa de `Visualizar apunte / Descargar PDF` (más `Reintentar` para jobs fallidos) a
`Knowledge Workspace / Editar / Eliminar` (más `Reintentar` + `Eliminar` para fallidos).

---

## Decisión

### 1. Eliminar → soft delete, filtrado a nivel de vista

`ai_job` gana `is_deleted BOOLEAN DEFAULT FALSE` + `deleted_at TIMESTAMPTZ`. Un nuevo
`sp_soft_delete_stt_job_v1(job_id, user_id)` los marca — idempotente, no valida el `status` del job
(se puede eliminar en cualquier estado; un pipeline en curso no se detiene, solo deja de ser visible).
No borra filas ni el audio en Azure Blob.

El filtro `WHERE is_deleted = FALSE` se agrega **una sola vez**, en `vw_ai_job_current_status` y
`vw_stt_recording_result` — las dos vistas de las que leen todos los endpoints de consulta
(`/jobs`, `/jobs/stats`, `/jobs/{id}/status`, `/jobs/{id}/result`). Ningún repositorio necesita
agregar su propio `AND is_deleted = FALSE`.

### 2. Reprocesar un step → reutiliza el pipeline existente, sin orquestador nuevo

`sp_request_stt_step_reprocess_v1(job_id, user_id, step, custom_instructions)` — solo permitido si
el job está `completed` y `step ∈ {summary, notes, mind_map}` (no `transcription`: es audio→texto,
"instrucciones propias" no aplica). Hace dos cosas:

1. Anula (`SET ... = NULL`) **solo** la columna de `stt_recording_result` del step pedido.
2. Dispara el mismo camino que el retry: transiciona el job a `queued`, deja
   `pending_reprocess_step` / `pending_reprocess_instructions` en `ai_job`, y la API publica
   `{ job_id }` en `championaiqueue` — **la misma llamada `uploadToQueue` que usa `retryJob`**.

El orquestador Durable (`stt_live_recording.py`) ya decide, por cada step, "si el campo está en la
BD lo reutilizo, si no lo regenero" (smart retry). Como el SP anuló únicamente el campo del step
pedido, ese mecanismo existente reprocesa exactamente ese step y sirve el resto desde caché — cero
orquestador nuevo, cero mensaje de queue nuevo. `fn_get_stt_live_recording_job_context` expone
`pending_reprocess_step`/`pending_reprocess_instructions`; el orquestador se los pasa solo a la
activity del step que le corresponde (`generate_summary_activity`, etc., cuyo input cambió de un
string plano a `{transcription, custom_instructions}`). `sp_complete_stt_live_recording_job_v1` los
limpia (`NULL`) al completar — no queda estado pendiente colgado.

Solo puede haber **un** reprocesamiento pendiente por job a la vez: pedir uno requiere
`status='completed'`, y al pedirlo el job pasa a `queued`, bloqueando una segunda solicitud
concurrente hasta que el ciclo termine.

### 3. Instrucciones propias → se agregan al prompt, no a los archivos .md

`openai_service.py` agrega una función `_append_custom_instructions` que concatena las
instrucciones al final del `user_message` ya construido, **solo si vienen presentes**. Los archivos
`prompts/summary.md`, `notes.md`, `notes_json.md`, `mind_map.md` no cambian — la mayoría de las
ejecuciones (primera vez, sin reprocesamiento) no llevan instrucciones y el prompt queda idéntico
al de hoy.

### 4. "Descargar PDF" sale del menú de opciones

El viewer (`NoteDetailScreen`, futuro Knowledge Workspace) ya tiene su propio botón de descarga de
PDF en el header. Mantenerlo también en `JobOptionsModal` era una entrada duplicada. Se retira de
ahí para dejar el menú de un job completado en `Knowledge Workspace / Editar / Eliminar` — el set
clásico ver/editar/eliminar de un administrador de recursos, coherente con el rol que le da
ADR-009 a "Mis Apuntes". La función de exportar PDF (`pdfExport.js`) no se toca — sigue
usándose desde el viewer.

---

## Consecuencias

### Positivas

- Cero infraestructura Azure nueva: reprocesar reutiliza el mismo Durable Function, el mismo
  orquestador, la misma cola. El riesgo de este cambio vive casi enteramente en SQL + prompt
  building, no en orquestación distribuida nueva.
- El soft delete es, en principio, reversible a nivel de dato (`UPDATE ai_job SET is_deleted =
  FALSE`) sin necesidad de código nuevo — aunque hoy no existe una acción de "restaurar" en la UI
  ni un endpoint dedicado (ver Negativas).
- El filtrado centralizado en las vistas hace que un job eliminado desaparezca automáticamente de
  todo lo que ya existía, sin tocar `getRecentJobsByUser`, `getStatsByUser`, `getJobStatus` ni
  `getJobResult`.

### Negativas

- **Hard delete no está implementado.** El audio permanece en Azure Blob y las filas en Postgres
  indefinidamente tras un soft delete. Si el proyecto necesita cumplimiento de borrado real
  (retención de datos, GDPR-like), esto requiere una decisión y un ADR propios — no se implementó
  aquí porque el soft delete fue la opción elegida explícitamente para esta iteración.
- **No hay acción de "restaurar" en la UI ni endpoint dedicado.** Revertir un soft delete hoy
  requiere acceso directo a la base de datos. Si se necesita como feature de producto, agregar
  `sp_restore_stt_job_v1` + `POST /jobs/{id}/restore` es una extensión directa del mismo patrón.
- **Transcripción queda fuera del reprocesamiento.** Si en el futuro se necesita re-transcribir
  (ej. locale de idioma incorrecto), no se puede resolver con el mecanismo de este ADR: cambiar la
  transcripción invalidaría resumen/notas/mapa mental (los tres derivan de `transcription_text`), lo
  que requiere decidir si cascada o no — diseño explícitamente fuera de alcance aquí.
- Los parámetros de reprocesamiento (`step`, `custom_instructions`) no están tipados más allá de la
  validación `IN ('summary','notes','mind_map')` del SP y el controller — se sostiene por
  convención/revisión, igual que el resto del proyecto.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Orquestador Durable dedicado (`stt_step_reprocess`) + mensaje de queue con forma distinta (`{job_id, action, step}`) | El orquestador `stt_live_recording` ya resuelve exactamente "qué steps ya están, cuáles regenero" via `partial_results`. Duplicarlo en un segundo orquestador solo para reprocesamiento habría significado mantener dos copias de la misma lógica de pipeline y dos formas de mensaje de queue en paralelo. |
| Placeholder `{{CUSTOM_INSTRUCTIONS}}` dentro de cada prompt `.md` | Obliga a que cada archivo de prompt siempre contemple el placeholder aunque el 95%+ de las ejecuciones no lo usen (solo aplica en reprocesamiento). Concatenar condicionalmente en `openai_service.py` deja los `.md` limpios para el camino común. |
| Hard delete (borrar filas + blob) | Fue la alternativa evaluada junto con soft delete; se optó explícitamente por soft delete por ser reversible a nivel de dato y no requerir manejo de cascada de FKs ni limpieza de Blob Storage en esta iteración. Ver Negativas — queda documentado como trabajo futuro, no implementado silenciosamente. |

---

## Referencias

- [[ADR-009-mobile-navigation-manager-viewer-seam]] — establece a "Mis Apuntes" como administrador de Knowledge Packs
- [[ADR-003-sas-direct-upload]] — rol de la API frente a Azure Blob, relevante si se implementa hard delete más adelante
- [[EPICS]] — EPIC V3, "Reprocesamiento parcial" (implementado por adelantado y con alcance reducido por este ADR)
- [[ADR-006-idempotent-stored-procedures]] — mismo patrón de idempotencia aplicado a `sp_soft_delete_stt_job_v1`
