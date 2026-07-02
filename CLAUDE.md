# Champion AI — Contexto Global para Claude Code

## Qué es este proyecto

Champion AI es un hub de servicios de Inteligencia Artificial accesible desde una app móvil.
Permite procesar contenido (audio, texto) usando IA de Azure, de forma simple y sin conocimiento técnico.

La primera feature implementada de extremo a extremo es **Speech-to-Text (STT) live_recording**:
el usuario graba audio → la app lo sube a Azure Blob → la API lo encola → una Azure Function
transcribe, resume, genera notas y un mapa mental → el cliente hace polling hasta obtener el resultado.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| App móvil | React Native (Expo) |
| Backend | Node.js + Express.js — puerto 5000 (`PORT` en `App/.env`) |
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

### 7. El cliente hace polling (con push notifications como complemento)
El mecanismo primario sigue siendo polling: el cliente consulta periódicamente
`GET /AIServices/Speechv2/jobs/{job_id}/status` hasta `completed` o `failed`,
luego `GET /AIServices/Speechv2/jobs/{job_id}/result`. Push notifications (Expo Push Service)
avisan al usuario cuando un job termina, pero no reemplazan el polling como fuente de verdad
del estado — son un complemento de UX, no un mecanismo de sincronización.

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

## Knowledge Pack — próxima generación del pipeline

Champion AI está diseñando la evolución del resultado STT hacia un objeto de conocimiento unificado y extensible: el **Knowledge Pack**. No es una feature nueva — es el marco conceptual bajo el cual toda capacidad futura de generación de conocimiento (topics, capítulos, flashcards, quiz, búsqueda semántica, chat) se diseña de forma consistente, sin romper los 10 principios arquitectónicos de este documento ni el contrato HTTP existente.

Diseño funcional completo (visión, especificación de componentes, pipeline, arquitectura de datos, capacidades UX, roadmap y riesgos) en `App/Docs/product/` — punto de entrada: `App/Docs/product/README.md`.

**Regla para trabajo futuro:** toda feature nueva de generación de conocimiento debe poder ubicarse dentro del modelo del Knowledge Pack antes de implementarse — ver criterio en `App/Docs/product/02-knowledge-pack-spec.md`.

**Importante — no confundir con la Presentation Layer (sección siguiente):** el Knowledge Pack gobierna la generación de *datos nuevos* derivados de IA (topics, capítulos, flashcards...). La Presentation Layer gobierna cómo se *renderizan* datos que la IA ya generó (Markdown, LaTeX, mapas mentales). Si una tarea no agrega una etapa de IA nueva ni un campo nuevo derivado de razonamiento — es Presentation Layer, no Knowledge Pack, y no pasa por `App/agents/knowledge-pack-reviewer.md` ni por `App/commands/knowledge-pack.md`.

## Presentation Layer — capa de renderizado de resultados

El pipeline de IA (transcripción → resumen → notas → mapa mental) genera contenido correcto, pero hasta esta etapa se mostraba como texto plano en la app móvil. La **Presentation Layer** es la capa responsable de transformar ese contenido ya generado en una experiencia de lectura real — sin tocar el pipeline de IA, los prompts (salvo una excepción puntual documentada abajo) ni el contrato HTTP.

**Capacidades:**

| Capacidad | Cómo funciona |
|---|---|
| Markdown | `summary_text`/`notes_text` (ya son Markdown en el prompt) se renderizan de verdad en el cliente — headers, listas, tablas, checklists, citas, código, links, negrita/cursiva, separadores. Nunca se muestran caracteres Markdown sin procesar. |
| Soporte matemático (LaTeX) | Único cambio de prompt de toda esta capa: `summary.md`/`notes.md` piden envolver notación matemática en `$...$`/`$$...$$` cuando corresponda. El cliente renderiza esas expresiones con KaTeX, nunca como texto plano. |
| Mapas mentales reales (Mermaid) | El árbol `mind_map_json` (sin cambios, sigue siendo JSON puro, sin tocar el prompt `mind_map.md`) se convierte de forma **determinística** (no-IA) a sintaxis Mermaid `mindmap` dentro del orquestador, se persiste como `mind_map_mermaid_code`, y el cliente lo renderiza a SVG la primera vez que se ve, cacheando el SVG resultante (`mind_map_svg`) en el backend. |
| Push notifications | Infraestructura basada en Expo Push Service — avisa cuando un job termina o falla. Ver principio 7. |

**Mecanismo de renderizado (Mermaid + LaTeX):** 100% cliente, vía `react-native-webview` con mermaid.js/KaTeX embebidos como asset local (sin red, sin dependencias nuevas en la Azure Function). El SVG resultante se sube al backend una sola vez para cachearlo — nunca se trata una imagen como fuente de verdad; la fuente de verdad es siempre el texto/código (Markdown, LaTeX, Mermaid), la imagen es una proyección cacheada. Detalle completo en `App/rules/mobile-rendering.md` y `App/Knowledge/ADR/ADR-008-client-side-rendering.md`.

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
| STT — Transcript Cleanup (GPT-5) | Planificado — próxima implementación |
| STT — Topic Extraction | Roadmap |
| Presentation Layer — Markdown rendering | Implementado |
| Presentation Layer — Soporte matemático (LaTeX) | Implementado — bug de superposición corregido, **visualización mobile en revisión** (ver `Roadmap/pending-features.md`) |
| Presentation Layer — Mind maps reales (Mermaid → SVG) | Implementado |
| Presentation Layer — Mermaid embebido en Markdown | Roadmap — solo arquitectura preparada, sin implementar |
| Presentation Layer — Resultado enriquecido (UI) | Pendiente — no iniciado |
| Push notifications (Expo Push Service) — infraestructura | Pendiente — no iniciado |
| Background sync hardening (AppState) | Pendiente — no iniciado |
| Text to Speech (TTS) | Sin documentar |
| Gestión de Archivos | Sin documentar |

## Referencias de contexto

- Arquitectura detallada: `ARCHITECTURE.md`
- Diseño del Knowledge Pack (próxima generación del pipeline): `App/Docs/product/`
- Presentation Layer — reglas de renderizado: `App/rules/mobile-rendering.md`
- Presentation Layer — decisiones de arquitectura: `App/Knowledge/ADR/ADR-008-client-side-rendering.md`, `App/Knowledge/ADR/ADR-009-expo-push-service.md`
- Reglas por dominio: `App/rules/`
- Agentes especializados: `App/agents/`
- Prompts reutilizables: `App/commands/`
- Bóveda de conocimiento: `App/Knowledge/`
- Contexto del componente API: `App/API/CLAUDE.md`
- Contexto del componente Mobile: `App/Mobile/CLAUDE.md`
- Contexto del componente Azure Function: `App/procesamiento/CLAUDE.md`
