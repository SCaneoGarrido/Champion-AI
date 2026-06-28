# ADR-005: Flag is_current en historial de estados

tags: #adr #database #pattern #history

---

## Estado

Adoptado

## Contexto

El sistema necesita:
1. **Historial completo**: registrar cada transición de estado con timestamp y metadata
2. **Acceso eficiente al estado actual**: para que el endpoint de polling responda rápido

Sin un mecanismo especial, obtener el estado actual requeriría:
```sql
SELECT * FROM ai_job_status_history
WHERE job_id = '...'
ORDER BY created_at DESC
LIMIT 1;
```
Esto es costoso a escala y no aprovecha índices de forma óptima.

## Decisión

La tabla `ai_job_status_history` tiene un campo `is_current BOOLEAN` que indica cuál es el estado activo del job.

**Invariante:** Solo puede haber **un registro con `is_current = true`** por `job_id`.

Esta invariante está reforzada por un índice único parcial:
```sql
CREATE UNIQUE INDEX uq_ai_job_status_history_current
ON ai_job_status_history (job_id)
WHERE (is_current = true);
```

### Protocolo de transición

Cada cambio de estado ejecuta:
1. `UPDATE SET is_current = FALSE` en el registro anterior
2. `INSERT` del nuevo registro con `is_current = TRUE`

## Razonamiento

### Consulta del estado actual es O(1) via índice

```sql
SELECT * FROM ai_job_status_history
WHERE job_id = '...' AND is_current = TRUE;
-- Usa el índice uq_ai_job_status_history_current directamente
```

### Historial completo preservado

Los registros con `is_current = FALSE` permanecen en la tabla para auditoría.

### Consistencia garantizada por la BD

El índice único parcial hace que la BD rechace dos registros con `is_current = TRUE` para el mismo job, incluso si hay bugs en el código.

### Redundancia con ai_job

`ai_job` también mantiene `status` y `current_step` actualizados. La vista `vw_ai_job_current_status` une ambas tablas y expone información de ambas fuentes.

## Consecuencias

**Positivas:**
- Consulta de estado actual es eficiente
- Historial completo disponible para auditoría
- La BD garantiza la invariante con el índice único
- Compatible con el patrón de Stored Procedures (ver [[ADR-002-stored-procedures-only]])

**Negativas / Compromisos:**
- Cada transición de estado requiere dos operaciones (UPDATE + INSERT)
- La lógica de transición está duplicada en el SP y en el trigger `sync_ai_job_from_history`
- Si se inserta un registro directamente (fuera de SPs), el desarrollador debe recordar activar el protocolo

---

## Referencias cruzadas

- [[tables]] — Tabla `ai_job_status_history`
- [[stored-procedures]] — `sp_update_ai_job_status_v1` que implementa el protocolo
- [[functions]] — Trigger `sync_ai_job_from_history`
- [[job-states]] — Máquina de estados que usa este patrón
- [[views]] — `vw_ai_job_current_status` que aprovecha el índice
