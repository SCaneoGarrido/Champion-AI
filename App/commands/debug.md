# Comando — /debug

Prompt reutilizable para debugging de Champion AI. Cubre los puntos de fallo más comunes del sistema.

## Uso

Copiar el template correspondiente al problema e indicar los síntomas observados.

---

## Debug — Job no transiciona de queued a processing

```
Tengo un job en Champion AI con job_id = [JOB_ID] que está en estado 'queued' y no avanza.

Contexto del sistema:
- La API creó el job y respondió 202 Accepted
- El job lleva más de [N] minutos en 'queued'

Ayúdame a diagnosticar. Revisa en este orden:

1. BD — Estado del job:
   SELECT * FROM vw_ai_job_current_status WHERE job_id = '[JOB_ID]';
   SELECT * FROM ai_job_status_history WHERE job_id = '[JOB_ID]' ORDER BY created_at;

2. BD — ¿El mensaje fue publicado en la queue?
   (Revisar si ai_job tiene status='queued' o si ya pasó a 'failed' con QUEUE_SEND_FAILED)

3. Azure Queue — ¿Hay mensajes pendientes en championaiqueue?

4. Azure Function — ¿La Function está activa y consumiendo mensajes?

Indica qué información falta y qué paso podría estar fallando.
```

---

## Debug — Job falla con error_code desconocido

```
Un job de Champion AI terminó en estado 'failed' con el siguiente error:

job_id: [JOB_ID]
error_code: [CÓDIGO]
step que falló: [STEP]

Consultas útiles para diagnosticar:
SELECT * FROM ai_job WHERE job_id = '[JOB_ID]';
SELECT * FROM ai_job_status_history WHERE job_id = '[JOB_ID]' ORDER BY created_at;

Basándote en el error_code y el step:
1. ¿En qué parte del pipeline de la Azure Function ocurrió?
2. ¿Qué servicio Azure puede estar fallando?
3. ¿El error es retryable?
4. ¿Cómo se puede resetear el job para reintentar?

Referencia: App/Knowledge/Operations/error-codes.md
```

---

## Debug — Endpoint devuelve estructura incorrecta

```
El siguiente endpoint de Champion AI está devolviendo una respuesta inesperada:

Endpoint: [MÉTODO] [RUTA]
Respuesta recibida: [PEGAR JSON]
Respuesta esperada según el contrato: { success, data, error }

Ayúdame a identificar:
1. ¿La respuesta viola el contrato de envelope (ADR-004)?
2. ¿El error code está en SCREAMING_SNAKE_CASE?
3. ¿El HTTP status code es el correcto?
4. ¿Hay algún caso edge no manejado en el endpoint?

Referencia: App/API/CLAUDE.md, App/rules/api.md
```

---

## Debug — Upload a Azure Blob falla desde la app

```
El upload de audio a Azure Blob está fallando con el siguiente error:

Paso donde falla: [init / PUT a blob / SpeechToTextv2]
Error recibido: [MENSAJE DE ERROR]
Código HTTP: [STATUS]

Ayúdame a diagnosticar:

Si falla en POST /init:
- ¿El JWT es válido?
- ¿El formato de audio es uno de: webm, mp4, m4a, mp3, wav, ogg?

Si falla en PUT a Azure Blob:
- ¿Se incluye el header x-ms-blob-type: BlockBlob?
- ¿Se incluye Content-Type: audio/{formato}?
- ¿La SAS URL expiró (expira a los 3600 segundos del init)?

Si falla en POST /SpeechToTextv2:
- ¿El blob_url en el body corresponde a la SAS URL o al blob_url permanente?
- ¿El user_id del token coincide con el job?
- ¿El audio fue subido exitosamente antes de llamar a este endpoint?
```

---

## Debug — Inconsistencia en is_current

```
Encontré una inconsistencia en ai_job_status_history: hay más de un registro con is_current = TRUE para el mismo job, o ninguno.

Diagnóstico:
SELECT job_id, COUNT(*) as current_count
FROM ai_job_status_history
WHERE is_current = TRUE
GROUP BY job_id
HAVING COUNT(*) != 1;

Si hay más de uno:
- ¿Se ejecutó DML directo fuera de los Stored Procedures?
- ¿El índice uq_ai_job_status_history_current está activo?

Si hay cero (job sin is_current):
- ¿El SP que creó el último estado completó correctamente?
- ¿Hubo un error de transacción que hizo rollback?

Para corregir manualmente (con precaución):
UPDATE ai_job_status_history SET is_current = FALSE WHERE job_id = '[JOB_ID]';
-- Luego activar el último registro según created_at
UPDATE ai_job_status_history SET is_current = TRUE WHERE id_history = '[ID_CORRECTO]';

Referencia: App/Knowledge/ADR/ADR-005-is-current-pattern.md
```

---

## Debug — Polling no obtiene resultado

```
El cliente está haciendo polling sobre un job que según la BD está en status='completed',
pero GET /jobs/{job_id}/result devuelve 404 o no tiene datos.

Diagnóstico en BD:
SELECT * FROM vw_stt_recording_result WHERE job_id = '[JOB_ID]';
SELECT * FROM stt_recording WHERE job_id = '[JOB_ID]';
SELECT * FROM stt_recording_result WHERE recording_id = (
  SELECT recording_id FROM stt_recording WHERE job_id = '[JOB_ID]'
);

Verificar:
1. ¿Existe un registro en stt_recording para este job?
2. ¿Existe un registro en stt_recording_result?
3. ¿La vista vw_stt_recording_result devuelve datos para este job?
4. ¿El endpoint GET /result está implementado? (Nota: está pendiente de implementación)
```
