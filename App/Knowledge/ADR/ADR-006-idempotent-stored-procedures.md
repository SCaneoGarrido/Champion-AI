# ADR-006: Stored Procedures idempotentes ante redelivery de queue

tags: #adr #database #idempotency #queue

---

## Estado

Adoptado

## Contexto

Azure Queue Storage garantiza **at-least-once delivery**: en condiciones de red inestable o reinicios de la Function, el mismo mensaje puede ser entregado más de una vez.

Si el procesamiento no es idempotente:
- Un job podría quedar como `completed` pero con el resultado duplicado en BD
- Los SPs podrían fallar con errores de constraint
- El historial de estados podría tener entradas inconsistentes

## Decisión

Los Stored Procedures críticos del sistema son idempotentes: pueden ejecutarse múltiples veces con los mismos argumentos sin producir estado inconsistente.

### Mecanismos implementados

#### 1. ON CONFLICT DO UPDATE en sp_create_stt_live_recording_job_v1

```sql
INSERT INTO ai_job (...) VALUES (...)
ON CONFLICT (job_id) DO UPDATE SET
  status = EXCLUDED.status,
  ...
  updated_at = NOW();
```

Si el mismo `job_id` se intenta crear dos veces, el segundo intento solo actualiza.

#### 2. ON CONFLICT DO UPDATE en sp_complete_stt_live_recording_job_v1

```sql
INSERT INTO stt_recording_result (...) VALUES (...)
ON CONFLICT (recording_id) DO UPDATE SET
  transcription_text = EXCLUDED.transcription_text,
  summary_text = EXCLUDED.summary_text,
  ...
```

Si el resultado ya fue guardado, el segundo intento lo actualiza con los mismos valores.

#### 3. fn_can_process_ai_job como guard de entrada

Antes de iniciar el procesamiento, la Azure Function consulta:

```sql
SELECT * FROM fn_can_process_ai_job(job_id)
```

Si el job ya está `completed` o `failed`, la Function detiene la ejecución silenciosamente. Este es el mecanismo principal de protección.

## Razonamiento

### Defensa en profundidad

- **Primera línea:** `fn_can_process_ai_job` detecta jobs ya terminados
- **Segunda línea:** `ON CONFLICT DO UPDATE` en los SPs protege si el guard falla
- **Resultado:** El sistema es robusto ante redelivery en múltiples niveles

### No se requiere deduplicación explícita

Azure Queue no garantiza exactly-once, pero el sistema no necesita una tabla de mensajes procesados (deduplication log) porque los SPs mismos son idempotentes.

## Consecuencias

**Positivas:**
- El sistema tolera at-least-once delivery sin efectos adversos
- No se requiere infraestructura adicional de deduplicación
- Los SPs son más robustos en general (también protegen ante bugs de reintentos manuales)

**Negativas / Compromisos:**
- Los `ON CONFLICT DO UPDATE` añaden complejidad a los SPs
- Los parámetros de los SPs deben ser deterministas (misma entrada = mismo resultado)
- Si el procesamiento de IA devuelve resultados distintos en dos ejecuciones (no determinista), el segundo resultado sobreescribería al primero

---

## Referencias cruzadas

- [[stored-procedures]] — SPs que implementan idempotencia
- [[functions]] — `fn_can_process_ai_job`
- [[azure-services]] — Azure Queue (at-least-once delivery)
- [[azure-function]] — Componente que debe usar el guard
- [[stt-processing]] — Flujo donde se aplica en práctica
- [[ADR-001-queue-based-processing]] — Por qué usamos queue
