# Comando — /architecture

Prompt reutilizable para consultas y análisis arquitectónicos de Champion AI.

## Uso

Copiar el template correspondiente a la pregunta o análisis que necesitas.

---

## Consulta — ¿Dónde debe ir esta lógica?

```
Tengo que implementar la siguiente funcionalidad en Champion AI:

[DESCRIBIR LA FUNCIONALIDAD]

Basándote en los principios arquitectónicos del sistema (CLAUDE.md):

1. ¿En qué componente debe implementarse?
   - App Móvil: si es solo UI o coordinación de llamadas a la API
   - Champion API: si es orquestación, validación o coordinación de recursos
   - Azure Function: si requiere procesamiento de IA o trabajo pesado asíncrono
   - PostgreSQL (SP): si es lógica de dominio de persistencia

2. ¿Requiere una nueva queue o puede usar la existente?

3. ¿Requiere nuevas tablas o puede extender las existentes?

4. ¿El procesamiento debe ser síncrono (API responde con resultado) o asíncrono (queue + function)?

Referencia: CLAUDE.md, ARCHITECTURE.md
```

---

## Consulta — ¿Cómo diseñar una nueva feature de IA?

```
Necesito agregar una nueva feature de IA a Champion AI: [NOMBRE]

La feature hace: [DESCRIPCIÓN]

Ayúdame a diseñar la arquitectura siguiendo los patrones del sistema:

1. ¿Cuál es el flujo completo (similar a upload-audio → stt-processing → polling)?

2. ¿Cuántos endpoints necesita la API?
   - ¿Necesita un /init para reservar recursos?
   - ¿El endpoint de creación devuelve 202 Accepted?
   - ¿Necesita endpoints de polling separados (/status, /result)?

3. ¿Qué tablas de BD se necesitan?
   - ¿Tabla de datos de la feature (similar a stt_recording)?
   - ¿Tabla de resultados (similar a stt_recording_result)?
   - ¿Reutiliza ai_job y ai_job_status_history?

4. ¿Qué Stored Procedures se necesitan?
   - ¿sp_create_{feature}_job_v1?
   - ¿sp_complete_{feature}_job_v1?
   - ¿Los existentes sp_update_ai_job_status_v1 son suficientes?

5. ¿Qué queue necesita?
   - Nombre sugerido: champion-ai-{servicio}-{feature}

6. ¿Qué steps tiene el pipeline de procesamiento?

Referencia: App/Knowledge/Features/speech-to-text.md como feature de referencia
```

---

## Consulta — Impacto de un cambio de schema

```
Quiero modificar el schema de Champion AI:

Cambio: [DESCRIBIR EL CAMBIO — ej: agregar columna X a tabla Y, cambiar tipo de columna Z]

Ayúdame a identificar el impacto completo:

1. ¿Qué vistas usan esta tabla? (deben recrearse)
   - vw_ai_job_current_status
   - vw_stt_recording_result

2. ¿Qué Stored Procedures usan esta tabla o columna? (deben actualizarse)
   - sp_create_stt_live_recording_job_v1
   - sp_update_ai_job_status_v1
   - sp_complete_stt_live_recording_job_v1

3. ¿Qué Functions retornan esta tabla? (deben actualizarse)
   - fn_get_stt_live_recording_job_context
   - fn_can_process_ai_job

4. ¿Qué código de la API o la Function usa esta columna?

5. ¿La migración es reversible?

Genera la lista de archivos que deben modificarse en la misma migración.
```

---

## Consulta — Verificar consistencia con los ADRs

```
La siguiente implementación/propuesta está en revisión:

[DESCRIPCIÓN O CÓDIGO]

Verifica si es consistente con los 6 ADRs de Champion AI:

ADR-001 (Queue + Azure Function para IA async):
- ¿El procesamiento de IA ocurre en la Function, no en la API?

ADR-002 (Azure Function solo usa SPs):
- ¿Hay DML directo en la Function?

ADR-003 (Upload directo via SAS URL):
- ¿El audio pasa por la API?

ADR-004 (Envelope { success, data, error }):
- ¿Todas las respuestas tienen esta estructura?

ADR-005 (Flag is_current en historial):
- ¿El protocolo de is_current se respeta?

ADR-006 (SPs idempotentes):
- ¿Los SPs nuevos son idempotentes ante redelivery?

Para cada ADR: [CUMPLE / VIOLA / NO APLICA] con justificación.
```

---

## Consulta — Diseñar un nuevo Stored Procedure

```
Necesito crear un nuevo Stored Procedure en Champion AI para:

[DESCRIPCIÓN DEL PROPÓSITO]
Ejecutado por: [API / Azure Function]
Tablas que toca: [LISTA]

Diseña el SP siguiendo las reglas del sistema:

1. ¿Debe ser idempotente? (R-DB-02)
   Si lo ejecuta la Azure Function → sí, obligatoriamente

2. ¿Incluye transición de estado en ai_job_status_history?
   Si sí → incluir el protocolo is_current (R-DB-03)

3. ¿Qué parámetros necesita?
   - job_id: VARCHAR(100)
   - user_id: UUID (si aplica)
   - actor_type: VARCHAR(30) — 'backend' o 'azure_function'

4. ¿Qué debe hacer si el job_id no existe?
   → RAISE EXCEPTION con mensaje descriptivo

Genera la firma del SP y el esqueleto de la lógica interna.
Referencia: App/Knowledge/Database/stored-procedures.md
```
