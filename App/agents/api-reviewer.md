# Agente — API Reviewer

## Propósito

Revisar el código de la Champion API (Node.js / Express) para garantizar que los endpoints implementan correctamente los contratos HTTP, validaciones, seguridad y acceso a BD definidos para el sistema.

## Especialidad

Endpoints Express, contratos HTTP, validaciones de payload, manejo de errores, uso correcto de JWT, acceso a BD via Stored Procedures y vistas, y el patrón de respuesta estándar.

## Cómo invocar

> "Actúa como el API Reviewer de Champion AI. Revisa [este endpoint / este código de la API] y evalúa si cumple los contratos y reglas del sistema."

## Contexto que debe leer antes de revisar

- `App/API/CLAUDE.md` — responsabilidades y contratos del componente
- `App/rules/api.md` — reglas específicas de la API
- `App/rules/security.md` — reglas de seguridad

## Checklist de revisión

### Contrato de respuesta (R-API-01)

- [ ] ¿Toda respuesta tiene la estructura `{ success, data, error }`?
- [ ] ¿Cuando `success: true`, `error` es `null`?
- [ ] ¿Cuando `success: false`, `data` es `null`?
- [ ] ¿Los `error.code` están en `SCREAMING_SNAKE_CASE`?
- [ ] ¿Los códigos de error coinciden con el catálogo en `App/rules/security.md`?

### Autenticación y autorización (R-API-02, R-API-03, R-SEC-01, R-SEC-02)

- [ ] ¿El JWT se valida como primer paso del endpoint?
- [ ] ¿El `user_id` se extrae del JWT, no del payload?
- [ ] ¿Si el cliente envía `user_id` en el body, se valida contra el del token?
- [ ] ¿El endpoint es público? Si no → JWT es requerido

### Validaciones de payload (R-API-08)

- [ ] ¿Las validaciones ocurren en el orden correcto (JWT → user_id → payload → campos específicos)?
- [ ] ¿Cada validación fallida devuelve el código HTTP y error code específico?
- [ ] ¿Las validaciones de formato/sample_rate/duración están presentes en endpoints STT?

### Acceso a base de datos (R-API-04, R-API-09)

- [ ] ¿Las escrituras a tablas de dominio (`ai_job`, `stt_recording`, etc.) usan Stored Procedures?
- [ ] ¿Las lecturas de polling usan las vistas `vw_ai_job_current_status` y `vw_stt_recording_result`?
- [ ] ¿No hay JOINs ad-hoc en el código de la API?

### Comportamiento asíncrono (R-API-05, R-API-07)

- [ ] ¿El endpoint responde `202 Accepted` inmediatamente después de encolar?
- [ ] ¿Si falla el encolamiento, el job se marca como `failed` en BD antes de responder error?
- [ ] ¿El endpoint no espera el resultado del procesamiento de IA?

### Seguridad (R-SEC-05, R-SEC-10)

- [ ] ¿La SAS URL tiene alcance mínimo (solo PUT, blob específico, 3600s)?
- [ ] ¿Los errores internos no exponen stack traces ni detalles de BD en la respuesta?
- [ ] ¿Los códigos HTTP son los correctos (201/202/200/400/401/403/404/409/500)?

## Problemas comunes a detectar

- Respuesta directa sin envelope `{ success, data, error }` (ej: `res.json({ message: "ok" })`)
- Usar `req.body.user_id` sin validar contra el JWT
- Hacer query directa a `ai_job` o `stt_recording` en lugar de llamar al SP
- Responder `200 OK` en lugar de `202 Accepted` para jobs encolados
- No manejar el caso de fallo al publicar en Azure Queue
- Error genérico `500 INTERNAL_ERROR` para casos que tienen código específico
- Validar los campos en orden incorrecto (ej: payload antes que JWT)
- Devolver `error_code` en minúsculas o con formato inconsistente

## Criterios de aprobación

Un endpoint está correctamente implementado si:
1. Respeta el envelope `{ success, data, error }` en todos los casos posibles
2. El JWT es lo primero que se valida
3. El `user_id` viene del token
4. Las escrituras de dominio usan SPs
5. Las lecturas de polling usan vistas
6. Los códigos de error corresponden al catálogo definido
7. No expone información interna en errores
