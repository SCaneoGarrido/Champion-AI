# Comando — /feature

Prompt reutilizable para diseñar e implementar nuevas features en Champion AI.

## Uso

Copiar el template correspondiente a la fase de trabajo. El flujo recomendado es: diseño → BD → API → Function → Mobile.

---

## Fase 1 — Diseño de la feature

```
Voy a implementar una nueva feature en Champion AI: [NOMBRE DE LA FEATURE]

Descripción: [QUÉ HACE]
Tipo de procesamiento: [Síncrono en API / Asíncrono via queue + Function]

Basándote en los principios de CLAUDE.md y ARCHITECTURE.md, diseña:

1. FLUJO COMPLETO
   Siguiendo el patrón: init → upload/submit → create job → [queue] → function → polling → result

2. ENDPOINTS DE LA API (App/API/CLAUDE.md)
   Para cada endpoint:
   - Método + Ruta
   - ¿Requiere JWT?
   - Body de request
   - Respuesta exitosa (HTTP status + estructura data)
   - Errores posibles (código + HTTP status)

3. SCHEMA DE BD
   - Tablas nuevas (nombre con prefijo del servicio, ej: tts_*)
   - Columnas y tipos
   - Constraints
   - Relación con ai_job

4. STORED PROCEDURES
   - sp_create_{feature}_job_v1
   - sp_complete_{feature}_job_v1
   - ¿Reutiliza sp_update_ai_job_status_v1?

5. AZURE FUNCTION
   - Queue: champion-ai-{servicio}-{feature}
   - Steps del pipeline
   - Servicios Azure a usar

6. IMPACTO EN LA APP MÓVIL
   - ¿Nuevas pantallas?
   - ¿Nuevo flujo de polling?

Referencia de implementación: App/Knowledge/Features/speech-to-text.md
```

---

## Fase 2 — Implementar el schema de BD

```
Voy a crear el schema de BD para la feature [NOMBRE] de Champion AI.

Diseño aprobado:
[PEGAR DISEÑO DE TABLAS]

Genera:

1. MIGRACIÓN SQL con:
   - CREATE TABLE para cada tabla nueva
   - Constraints (chk_, uq_, fk_)
   - Índices necesarios
   - Trigger trg_{tabla}_updated_at → set_updated_at()

2. STORED PROCEDURES:
   - sp_create_{feature}_job_v1 (idempotente — ON CONFLICT DO UPDATE)
   - sp_complete_{feature}_job_v1 (idempotente — ON CONFLICT DO UPDATE)

3. VISTAS:
   - vw_{feature}_current_status (para endpoint /status)
   - vw_{feature}_result (para endpoint /result)

Reglas obligatorias:
- Todo SP debe ser idempotente (R-DB-02)
- Toda transición de estado en ai_job_status_history debe respetar is_current (R-DB-03)
- Los SPs deben incluir created_by_type ('backend' o 'azure_function')

Referencia: App/rules/database.md, App/Knowledge/Database/stored-procedures.md
```

---

## Fase 3 — Implementar endpoints de la API

```
Voy a implementar los endpoints de la API para la feature [NOMBRE].

Endpoints a implementar:
[LISTA DE ENDPOINTS]

Para cada endpoint, genera el código Node.js/Express siguiendo las reglas de App/rules/api.md:

1. Validación de JWT como primer paso
2. Extracción de user_id del token
3. Validaciones de payload con códigos de error específicos
4. Llamada al SP correspondiente
5. Publicación en queue (si es endpoint de creación de job)
6. Manejo del fallo de queue (sp_update_ai_job_status_v1 con QUEUE_SEND_FAILED)
7. Respuesta con el envelope { success, data, error }

Reglas obligatorias:
- Toda respuesta debe usar el contrato { success, data, error } (R-API-01)
- user_id siempre del token (R-API-03)
- Escritura de dominio via SPs (R-API-04)
- Lecturas de polling via vistas (R-API-09)
```

---

## Fase 4 — Implementar la Azure Function

```
Voy a implementar la Azure Function para la feature [NOMBRE].

Queue trigger: [NOMBRE_DE_QUEUE]
Pipeline de steps: [LISTA DE STEPS]
Servicios Azure: [Azure Speech / Azure OpenAI / otro]

Genera el código de la Function siguiendo las reglas de App/procesamiento/CLAUDE.md:

1. Paso 0: fn_can_process_ai_job — guard de idempotencia
2. Paso 1: fn_get_{feature}_job_context — obtener contexto
3. Por cada step:
   - sp_update_ai_job_status_v1(status='processing', step_name='{step}')
   - Llamada al servicio Azure
   - Manejo de error: sp_update_ai_job_status_v1(status='failed', error_code='...')
4. Paso final: sp_complete_{feature}_job_v1

Reglas obligatorias:
- Cero DML directo (solo SPs) (R-DB-01)
- fn_can_process_ai_job siempre primero (R-AZURE-08)
- language_locale del contexto del job — no hardcodeado (R-AZURE-11)
- Cada step actualiza estado ANTES de comenzar el trabajo
```

---

## Fase 5 — Implementar en la app móvil

```
Voy a implementar el flujo de la feature [NOMBRE] en la app React Native de Champion AI.

Endpoints disponibles:
[LISTA DE ENDPOINTS]

Genera el código React Native siguiendo App/Mobile/CLAUDE.md:

1. Hook o servicio de llamadas a la API
   - Incluir Authorization: Bearer {token} en todos los endpoints protegidos
   - Manejar el envelope { success, data, error }
   - Interceptor para TOKEN_EXPIRED

2. Flujo de upload (si aplica)
   - POST /init → obtener SAS URL
   - PUT directo a Azure Blob con headers correctos
   - Verificar 201 antes de continuar

3. Flujo de polling
   - Loop: GET /status hasta completed o failed
   - Si completed → GET /result
   - Si failed → mostrar error al usuario

Reglas obligatorias:
- No enviar user_id en el payload (R-SEC-02)
- Upload directo a Blob — nunca a través de la API (R-API-06)
- El polling se detiene en estados terminales
```
