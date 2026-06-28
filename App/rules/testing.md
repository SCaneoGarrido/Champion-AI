# Reglas — Testing

Criterios y restricciones para testear Champion AI. El sistema tiene características que afectan cómo se diseñan los tests.

## R-TEST-01: El flujo STT puede testearse sin UI

El flujo completo de extremo a extremo puede ejecutarse con Postman o curl sin necesidad de la app móvil:

```
1. POST /API/AUTH/register         → crear usuario
2. POST /API/AUTH/login            → obtener JWT
3. POST /AIServices/Speechv2/init  → obtener job_id + SAS URL
4. PUT  {sas_url} [archivo audio]  → subir audio directamente a Azure Blob
5. POST /AIServices/Speechv2/SpeechToTextv2 → crear job y enqueue
6. GET  /AIServices/Speechv2/jobs/{job_id}/status → polling
7. GET  /AIServices/Speechv2/jobs/{job_id}/result → resultado
```

Esto es una ventaja del diseño: no hay dependencia de la app para testear el pipeline completo.

## R-TEST-02: Los Stored Procedures pueden testearse de forma independiente

Los SPs encapsulan la lógica del dominio y pueden ejecutarse directamente en PostgreSQL sin necesitar el código de la API ni de la Azure Function.

Para testear un SP:
```sql
-- Ejemplo: crear un job
CALL sp_create_stt_live_recording_job_v1(
  'job_test_001', -- job_id
  gen_random_uuid(), -- user_id
  'STT', 'live_recording', 'flow_live_recording',
  'queued', 'Job de prueba', 'backend',
  'es-CL', 'Spanish (Chile)', 'webm', 16000, 30.0,
  'test.webm', 'https://blob.test/audio/test.webm',
  'initialized', NULL
);
-- Verificar resultado
SELECT * FROM vw_ai_job_current_status WHERE job_id = 'job_test_001';
```

## R-TEST-03: Testear idempotencia de SPs

Para cada SP que pueda ser ejecutado por la Azure Function, verificar que funciona correctamente al ejecutarse dos veces con los mismos argumentos:

```sql
-- Ejecutar el SP
CALL sp_complete_stt_live_recording_job_v1(...);
-- Ejecutar nuevamente — debe producir el mismo resultado sin error
CALL sp_complete_stt_live_recording_job_v1(...);
-- Verificar que el estado es correcto
SELECT * FROM vw_ai_job_current_status WHERE job_id = '...';
```

**Si el segundo CALL lanza excepción → el SP viola la regla de idempotencia (R-DB-02).**

## R-TEST-04: Verificar el protocolo is_current después de cada transición

Después de cualquier operación que cambie el estado de un job, verificar la invariante:

```sql
-- Debe retornar exactamente 1 fila
SELECT COUNT(*) FROM ai_job_status_history WHERE job_id = '...' AND is_current = TRUE;
-- Debe retornar 0
SELECT COUNT(*) FROM ai_job_status_history WHERE job_id = '...' AND is_current = TRUE
HAVING COUNT(*) > 1;
```

## R-TEST-05: El envelope de respuesta es verificable en todo test de API

Cualquier test de endpoint HTTP debe verificar la estructura completa de la respuesta:

```javascript
// Éxito
expect(response.body.success).toBe(true);
expect(response.body.error).toBeNull();
expect(response.body.data).toBeDefined();

// Error
expect(response.body.success).toBe(false);
expect(response.body.data).toBeNull();
expect(response.body.error.code).toMatch(/^[A-Z_]+$/); // SCREAMING_SNAKE_CASE
```

## R-TEST-06: Simular fallo de queue al testear el endpoint SpeechToTextv2

Un caso de test importante es el fallo al publicar en la queue:

**Resultado esperado:**
- El job existe en `ai_job` con `status = 'failed'`
- `ai_job_status_history` tiene un registro con `error_code = 'QUEUE_SEND_FAILED'` y `is_current = TRUE`
- La respuesta HTTP es `500 INTERNAL_ERROR`
- No quedan jobs en `queued` sin procesar

## R-TEST-07: Testear guard de idempotencia con jobs terminales

Simular redelivery de un mensaje ya procesado:
1. Completar un job hasta `completed` o `failed`
2. Llamar `fn_can_process_ai_job(job_id)` nuevamente
3. Verificar que retorna `can_process = false` con la razón correcta

```sql
SELECT * FROM fn_can_process_ai_job('job_ya_completado');
-- Debe retornar: can_process = false, reason = 'JOB_ALREADY_COMPLETED'
```

## R-TEST-08: Testear validaciones de la API — orden y códigos

Para `POST /AIServices/Speechv2/SpeechToTextv2`, verificar que cada validación produce el código correcto:

| Escenario | Código esperado |
|---|---|
| Sin JWT | `INVALID_TOKEN` (401) |
| JWT expirado | `TOKEN_EXPIRED` (403) |
| user_id del payload diferente al del token | `USER_MISMATCH` (403) |
| Sin `req_info` | `INVALID_PAYLOAD` (400) |
| Formato de audio inválido | `UNSUPPORTED_FORMAT` (400) |
| Sample rate inválido | `INVALID_SAMPLE_RATE` (400) |
| Audio > 3 horas | `DURATION_EXCEEDED` (400) |
| Sin blob_url | `INVALID_BLOB_URL` (400) |

## R-TEST-09: Las vistas son testeables independientemente de los endpoints

Las vistas `vw_ai_job_current_status` y `vw_stt_recording_result` pueden consultarse directamente en la BD para verificar que devuelven los datos correctos antes de implementar los endpoints que las consumen.

## R-TEST-10: No testear lo que la BD ya garantiza por constraint

Los constraints de la BD (`chk_ai_job_status`, `chk_stt_recording_audio_format`, el índice único de `is_current`) garantizan la integridad a nivel de datos. No es necesario testear en la capa de aplicación que "dos registros con `is_current = TRUE` no pueden existir" — la BD lo rechazará.

Testear en la capa de aplicación el comportamiento observable (respuestas HTTP, estado final del job), no las garantías de la BD.
