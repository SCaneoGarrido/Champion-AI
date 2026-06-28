# Reglas — Base de Datos (PostgreSQL)

Reglas específicas para acceso, modificación y extensión del modelo de datos de Champion AI.

## R-DB-01: Los Stored Procedures son el contrato del dominio

Los SPs encapsulan las reglas de negocio de persistencia. Son el único mecanismo válido para modificar el estado de los jobs.

**Ningún componente** (API ni Azure Function) hace DML directo sobre:
- `ai_job`
- `ai_job_status_history`
- `stt_recording`
- `stt_recording_result`

**Excepción documentada:** `sec_user` y `sec_user_password` reciben INSERT directo desde la API en el flujo de registro.

## R-DB-02: Todo SP nuevo debe ser idempotente

Azure Queue garantiza at-least-once delivery. Todo SP que pueda ser llamado desde la Azure Function debe soportar ser ejecutado múltiples veces con los mismos argumentos sin producir estado inconsistente.

Mecanismo recomendado:
```sql
INSERT INTO tabla (...)
ON CONFLICT (clave_unica) DO UPDATE SET
  campo = EXCLUDED.campo,
  updated_at = NOW();
```

**Violación:** un SP que falla con `UNIQUE VIOLATION` en la segunda ejecución.

## R-DB-03: Protocolo obligatorio para transiciones de estado

Cada transición de estado en `ai_job_status_history` debe seguir este orden dentro de la misma transacción:

```sql
-- 1. Desactivar estado actual
UPDATE ai_job_status_history SET is_current = FALSE WHERE job_id = '...' AND is_current = TRUE;
-- 2. Insertar nuevo estado activo
INSERT INTO ai_job_status_history (..., is_current = TRUE, ...);
-- 3. Actualizar tabla principal
UPDATE ai_job SET status = '...', current_step = '...';
```

Este protocolo lo implementan `sp_update_ai_job_status_v1` y `sp_complete_stt_live_recording_job_v1`.
El trigger `sync_ai_job_from_history` actúa como red de seguridad.

**Violación:** insertar en `ai_job_status_history` con `is_current = TRUE` sin desactivar el anterior.

## R-DB-04: Invariante de is_current

Solo puede existir **un registro con `is_current = TRUE`** por `job_id` en `ai_job_status_history`.
Esta invariante está reforzada por el índice único parcial:

```sql
CREATE UNIQUE INDEX uq_ai_job_status_history_current
ON ai_job_status_history (job_id) WHERE (is_current = true);
```

La BD rechazará cualquier violación aunque haya bugs en el código.

## R-DB-05: Las vistas son el contrato de lectura

La API no construye JOINs ad-hoc en el código. Usa las vistas del sistema:

| Vista | Propósito |
|---|---|
| `vw_ai_job_current_status` | Estado actual del job (para polling /status) |
| `vw_stt_recording_result` | Resultado completo del job STT (para /result) |

Si se necesita una nueva proyección de datos → crear una vista nueva, no query directa.

## R-DB-06: Migraciones — qué actualizar cuando cambia el schema

Si se modifica una tabla (columna, tipo, constraint), revisar y actualizar:
1. La tabla base en el archivo de migración
2. Las vistas que la referencian (DROP + CREATE)
3. Los Stored Procedures que la usan (si cambian parámetros)
4. Las Functions que la retornan (si cambian tipos de retorno)

Ejemplo documentado: el cambio de `duration_seconds INTEGER → NUMERIC(10,3)` afectó la tabla, la vista, el SP y la function.

## R-DB-07: Estados válidos de un job

Los estados válidos están definidos por el constraint `chk_ai_job_status`:

| Estado | Significado | Terminal |
|---|---|---|
| `queued` | Job creado, esperando procesamiento | No |
| `processing` | Azure Function está ejecutando | No |
| `completed` | Finalizado con éxito | Sí |
| `failed` | Terminó con error | Sí |

`fn_can_process_ai_job` rechaza reprocesamiento de estados terminales (`JOB_ALREADY_COMPLETED`, `JOB_ALREADY_FAILED`).

## R-DB-08: Steps válidos de procesamiento

El `current_step` durante `processing` sigue esta secuencia:

```
transcription → summary → notes → mind_map → (completed)
```

Los step names son strings exactos usados en `sp_update_ai_job_status_v1`. No usar valores diferentes.

## R-DB-09: Relaciones en cascada

Las eliminaciones en cascada están definidas:
```
ai_job → ai_job_status_history (CASCADE DELETE)
ai_job → stt_recording (CASCADE DELETE)
stt_recording → stt_recording_result (CASCADE DELETE)
```

Eliminar un `ai_job` elimina toda la cadena de datos relacionados.

## R-DB-10: El campo created_by_type registra el actor

Cada inserción en `ai_job_status_history` debe incluir `created_by_type` con el actor que produjo la transición:

| Actor | Valor |
|---|---|
| Backend API | `'backend'` |
| Azure Function | `'azure_function'` |

Esto es la trazabilidad del sistema. No dejar `NULL` si se conoce el actor.

## R-DB-11: updated_at es automático — no asignarlo manualmente

Todas las tablas tienen un trigger `BEFORE UPDATE` que llama `set_updated_at()`.
No incluir `updated_at = NOW()` en los INSERT/UPDATE manuales excepto dentro de los SPs existentes donde ya está.
