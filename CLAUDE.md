# Champion AI — Contexto Global para Claude Code

## Qué es este proyecto

Champion AI es una **plataforma de aprendizaje asistida por Inteligencia Artificial**, organizada
alrededor del concepto de **Knowledge Workspace**:

```
Champion AI → Knowledge Packs → Knowledge Workspace → Herramientas Inteligentes de Aprendizaje
```

La primera feature implementada de extremo a extremo es **Speech-to-Text (STT) live_recording**:
el usuario graba audio → la app lo sube a Azure Blob → la API lo encola → una Azure Function
transcribe, resume, genera notas y un mapa mental → el resultado (un **Knowledge Pack**) se
consume desde el **Knowledge Workspace**, la superficie principal de la app (reemplaza a la
antigua vista Markdown). Ver `App/Knowledge/Product/PROJECT_VISION.md` para la visión completa
y `App/Knowledge/Roadmap/ROADMAP.md` para las versiones V1–V5 planificadas.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| App móvil | React Native (Expo) |
| Backend | Node.js + Express.js — puerto 5051 |
| Procesamiento serverless | Azure Function Apps (Python) — Azure Durable Functions |
| Base de datos | PostgreSQL 17.10 (Docker) — puerto 5432 |
| Almacenamiento | Azure Blob Storage |
| Cola de mensajes | Azure Queue Storage |
| Transcripción | Azure AI Speech — Fast Transcription REST API |
| Generación de contenido | Azure OpenAI (gpt-5-mini) |

Base de datos: `champion_db`, usuario: `champion_db_user`.
Queue de STT: `championaiqueue`.

## Estructura del repositorio

```
Champion-AI/
  App/
    API/              ← Backend Node.js / Express
    Mobile/           ← App React Native / Expo
    procesamiento/    ← Azure Function App (Durable Functions)
      orchestrators/  ← Orquestadores Durable
      activities/     ← Activities modulares por dominio
      trigger/        ← Queue trigger (cliente Durable)
      shared/         ← DB, servicios de IA, utils
      prompts/        ← Prompts de Azure OpenAI
    SQL/              ← Migrations, Stored Procedures, Functions
    Knowledge/        ← Bóveda de conocimiento (fuente de verdad documental)
    rules/            ← Reglas reutilizables por Claude Code
    agents/           ← Agentes especializados por dominio
    commands/         ← Prompts reutilizables
    docker/           ← Configuración PostgreSQL Docker
    docker-compose.yml
```

## Principios arquitectónicos del sistema

Estos principios son invariantes. Toda sugerencia de código o diseño debe respetarlos.

### 1. La API orquesta — no procesa
La API acepta requests, valida, crea jobs via Stored Procedures, publica en queue y responde `202 Accepted`.
Nunca ejecuta IA. Nunca hace procesamiento pesado. Nunca recibe binarios de audio.

### 2. Las Functions procesan — no coordinan
La Azure Function consume mensajes de la queue y ejecuta el pipeline de IA completo.
No llama a la API. No hace DML directo en BD. Solo llama Stored Procedures.

### 3. PostgreSQL es la fuente de verdad
Todo estado de jobs, resultados y usuarios vive en PostgreSQL.
No existe estado en memoria entre componentes. No existe caché de estado de jobs.

### 4. Las colas desacoplan componentes
API y Azure Function se comunican solo vía mensaje `{ "job_id": "..." }` en Azure Queue.
At-least-once delivery garantizado por Azure → todos los SPs deben ser idempotentes.

### 5. Los Stored Procedures son el contrato del dominio
Las reglas de negocio de persistencia viven en SQL, no en código de aplicación.
Ningún componente hace `INSERT`, `UPDATE` o `DELETE` directo sobre las tablas de dominio.

### 6. Todo procesamiento es idempotente
Primera línea: `fn_can_process_ai_job` rechaza jobs ya terminados.
Segunda línea: `ON CONFLICT DO UPDATE` en los SPs críticos.
Esto protege ante redelivery de Azure Queue sin necesidad de tabla de deduplicación.

### 7. El cliente hace polling
No hay WebSocket ni push notifications **del servidor**. El cliente consulta periódicamente
`GET /AIServices/Speechv2/jobs/{job_id}/status` hasta `completed` o `failed`,
luego `GET /AIServices/Speechv2/jobs/{job_id}/result`.

> Nota: la app móvil sí dispara notificaciones locales del SO (100% cliente, sin canal push del
> servidor) cuando detecta — vía este mismo polling, generalizado a nivel global — que un job
> propio terminó. Esto no es una excepción a este principio: sigue siendo el cliente quien consulta
> periódicamente, solo que la superficie de polling se generalizó más allá de una sola pantalla.
> Push real (iniciado por el servidor) seguiría siendo una excepción a este principio y requeriría
> su propio ADR. Ver `App/Knowledge/ADR/ADR-011-local-job-completion-notifications.md`.

### 8. Contrato de respuesta HTTP invariante
Todas las respuestas de la API siguen esta estructura sin excepción:
```json
{ "success": true|false, "data": <objeto|null>, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." }|null }
```
Si `success: true` → `error` es `null`. Si `success: false` → `data` es `null`.

### 9. El audio nunca pasa por la API
La API genera una SAS URL temporal (3600s). El cliente sube directamente a Azure Blob.
La API solo maneja JSON. Nunca recibe ni almacena binarios.

### 10. El user_id siempre del JWT
El `user_id` se extrae del token en cada endpoint protegido.
Nunca se acepta `user_id` enviado por el cliente en el payload sin validación contra el token.

## Restricciones absolutas

| Restricción | Aplica a |
|---|---|
| Solo Stored Procedures — cero DML directo | Azure Function |
| Nunca recibe binarios | Champion API |
| Nunca llama Azure AI | Champion API |
| No conoce queues, Azure ni PostgreSQL | App Móvil |
| No contiene lógica de negocio | App Móvil |
| JWT requerido en todos los endpoints excepto `/register` y `/login` | Champion API |
| Solo un `is_current = TRUE` por job en `ai_job_status_history` | PostgreSQL |

## Reglas globales de desarrollo

- Ante cualquier duda sobre qué componente debe resolver algo: seguir los principios 1 y 2.
- Al agregar un endpoint: validar JWT, extraer `user_id` del token, responder con el envelope estándar.
- Al agregar escritura en BD desde la Azure Function: crear o reutilizar un Stored Procedure.
- Al agregar un SP: hacerlo idempotente desde el diseño (`ON CONFLICT DO UPDATE`).
- Al agregar una feature: definir primero si el procesamiento es síncrono (API) o async (queue + function).
  En Champion AI, si involucra IA → siempre async.
- Los errores de la Azure Function se registran en `ai_job` y `ai_job_status_history`, no se devuelven como HTTP.

## Anti-patrones — nunca hacer esto

- `INSERT`/`UPDATE`/`DELETE` directo en tablas de dominio desde código de Azure Function
- Procesar IA o ejecutar lógica pesada dentro de un endpoint Express
- Pasar el archivo de audio a través de la API (debe ir directo a Azure Blob)
- Aceptar `user_id` del body del cliente sin validar contra el JWT
- Crear jobs o transiciones de estado fuera de los Stored Procedures definidos
- Romper el envelope `{ success, data, error }` en cualquier respuesta HTTP
- Compartir estado de jobs en memoria entre requests (todo va a PostgreSQL)
- Hacer DML en `ai_job_status_history` sin seguir el protocolo `is_current`

## Pipeline de procesamiento STT (Azure Function)

```
transcription (Fast Transcription REST API — sin conversión de formato)
        ↓
[transcript_cleanup — GPT-5 — planificado, próxima implementación]
        ↓
summary (gpt-5-mini)
        ↓
notes (gpt-5-mini)
        ↓
mind_map (gpt-5-mini)
```

**Azure AI Speech Fast Transcription:** reemplaza al SDK Continuous Recognition. HTTP POST multipart, formatos nativos (WebM/M4A/MP3/OGG/WAV/FLAC/AAC), sin conversión previa a WAV, ~10–50× real-time. Endpoint: `https://{SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`.

**gpt-5-mini:** modelo de razonamiento. No acepta `temperature`. Parámetro correcto: `max_completion_tokens` (no `max_tokens`). Configurado con `max_completion_tokens: 16384` — los tokens de razonamiento interno cuentan contra el presupuesto.

**Smart retry:** resultados parciales persistidos tras cada paso via `sp_save_stt_partial_result_v1` (COALESCE upsert). Un retry reanuda desde el paso fallido sin repetir los pasos exitosos anteriores.

## Estado actual del proyecto

| Feature | Estado |
|---|---|
| Auth — register + login | Implementado |
| STT — init upload (SAS URL) | Implementado |
| STT — create job + enqueue | Implementado |
| STT — Azure Function pipeline (Durable Functions) | Implementado |
| STT — GET /jobs/{id}/status | Implementado |
| STT — GET /jobs/{id}/result | Implementado |
| STT — retry de jobs fallidos | Implementado |
| Knowledge Workspace (V1) | Próximo — ver Roadmap |
| Intelligent Study — Transcript Cleanup, Topics (V2) | Roadmap |
| Knowledge Enrichment (V2.5) | Roadmap |
| AI Learning Platform — Flashcards, Quiz, Chat (V3) | Roadmap |
| Intelligent Audio Learning — narración (V4) | Roadmap |
| Knowledge Platform — grafo, búsqueda semántica (V5) | Roadmap |

> Gestión de Archivos genérica fue retirada del roadmap activo. Ver `App/Knowledge/Bugs/known-issues.md`.

## Referencias de contexto

- Arquitectura detallada: `ARCHITECTURE.md`
- Visión de producto: `App/Knowledge/Product/PROJECT_VISION.md`
- Estrategia de producto: `App/Knowledge/Product/PRODUCT_STRATEGY.md`
- Roadmap oficial (V1–V5): `App/Knowledge/Roadmap/ROADMAP.md`
- Epics, backlog, milestones, sprint planning: `App/Knowledge/Roadmap/EPICS.md`, `BACKLOG.md`, `MILESTONES.md`, `SPRINT_PLANNING.md`
- Reglas por dominio: `App/rules/`
- Agentes especializados: `App/agents/`
- Prompts reutilizables: `App/commands/`
- Bóveda de conocimiento: `App/Knowledge/`
- Contexto del componente API: `App/API/CLAUDE.md`
- Contexto del componente Mobile: `App/Mobile/CLAUDE.md`
- Contexto del componente Azure Function: `App/procesamiento/CLAUDE.md`
