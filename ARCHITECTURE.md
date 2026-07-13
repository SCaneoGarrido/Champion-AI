# Champion AI — Arquitectura del Sistema

## Diagrama general

```
┌─────────────────────────────────────────────────────────────┐
│                        App Móvil                            │
│                   React Native / Expo                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Champion API                             │
│                Node.js + Express — :5051                    │
│  Autenticación · Validación · SAS URL · Jobs · Polling      │
└──────┬────────────────────┬───────────────────┬────────────┘
       │ UPSERT/SELECT       │ Publica            │ Genera
       │ via SP              │ { job_id }         │ SAS URL
       ▼                     ▼                    ▼
┌─────────────┐    ┌─────────────────┐   ┌──────────────────┐
│ PostgreSQL  │    │  Azure Queue    │   │  Azure Blob      │
│   :5432     │    │ championaiqueue │   │  Storage         │
│  champion_db│    └────────┬────────┘   └────────┬─────────┘
└─────────────┘             │ Trigger               │ PUT directo
       ▲                    ▼                       │ (cliente)
       │ Solo SPs  ┌─────────────────┐              │
       └───────────│  Azure Function  │◄─────────────┘
                   │  Python / Durable│  Descarga audio
                   │                 │
                   │  Fast Transcription (REST)
                   │  + Azure OpenAI (gpt-5-mini)
                   └─────────────────┘
```

## Componentes y responsabilidades

### App Móvil — React Native (Expo)

**Qué hace:**
- Graba o selecciona audio del dispositivo
- Solicita SAS URL a la API (`POST /init`)
- Sube el audio **directamente** a Azure Blob via SAS URL
- Crea el job en la API (`POST /SpeechToTextv2`)
- Hace polling hasta obtener `completed` o `failed`
- Muestra transcripción, resumen, notas y mapa mental

**Qué no hace ni sabe:**
- No conoce Azure Queue, Azure Functions ni PostgreSQL
- No contiene lógica de negocio
- No ejecuta IA
- No recibe el resultado del procesamiento: lo consulta vía polling

**Contrato HTTP consumido:** siempre `{ success, data, error }`

---

### Champion API — Node.js / Express (:5051)

**Qué hace:**
- Autenticación JWT (registro y login)
- Validación de todos los payloads entrantes
- Generación de SAS URLs temporales para Azure Blob (expira 3600s)
- Creación de jobs via `sp_create_stt_live_recording_job_v1`
- Publicación de `{ job_id }` en la queue `championaiqueue`
- Exposición de endpoints de polling (`/jobs/{id}/status`, `/jobs/{id}/result`)
- Exposición de endpoint de retry (`/jobs/{id}/retry`)
- Centralización de toda la lógica de negocio del sistema

**Qué no hace:**
- No ejecuta IA
- No recibe binarios de audio
- No hace DML directo en tablas de dominio (usa Stored Procedures)
- No es intermediario del procesamiento de la Azure Function

**Acceso a BD:** vía Stored Procedures y vistas (`vw_ai_job_current_status`, `vw_stt_recording_result`)

---

### Azure Function — Python / Azure Durable Functions

**Lenguaje:** Python. **Patrón:** Orchestrator + Activities (Azure Durable Functions).

**Trigger:** queue `championaiqueue`, mensaje `{ "job_id": "..." }`

**Pipeline implementado (en orden):**
1. `fn_can_process_ai_job` — guard de idempotencia
2. `fn_get_stt_live_recording_job_context` — obtiene contexto completo del job + resultados parciales
3. `sp_update_ai_job_status_v1` → `processing / transcription`
4. Descarga audio de Azure Blob (formato original — sin conversión)
5. **Azure AI Speech Fast Transcription** → `transcription_text`
6. `sp_update_ai_job_status_v1` → `processing / summary`
7. **Azure OpenAI (gpt-5-mini)** → `summary_text`
8. `sp_update_ai_job_status_v1` → `processing / notes`
9. **Azure OpenAI (gpt-5-mini)** → `notes_text` + `notes_json`
10. `sp_update_ai_job_status_v1` → `processing / mind_map`
11. **Azure OpenAI (gpt-5-mini)** → `mind_map_json`
12. `sp_complete_stt_live_recording_job_v1` → guarda resultado + `completed`

**Smart retry:** si el job falla y es reintentado, la Function lee los resultados parciales ya guardados (`sp_save_stt_partial_result_v1`) y omite los pasos ya completados.

**Pipeline objetivo (incluye etapa planificada):**
```
transcription → [transcript_cleanup] → summary → notes → mind_map
```
El paso `transcript_cleanup` está planificado como próxima implementación. Usará GPT-5-mini para limpiar artefactos de voz antes de los pasos de generación de contenido.

**En caso de error en cualquier paso:**
```
sp_update_ai_job_status_v1(status='failed', error_code='STT_ENGINE_UNAVAILABLE')
```

**Regla absoluta:** Solo puede llamar Stored Procedures y Functions SQL. Cero DML directo.

**Conexión a BD:** directa a PostgreSQL (:5432). No pasa por la API.

---

### PostgreSQL 17.10 (Docker :5432)

**Base:** `champion_db`, usuario: `champion_db_user`, extensión: `pgcrypto`

**Grupos de tablas:**

| Grupo | Tablas | Propósito |
|---|---|---|
| `sec_*` | `sec_user`, `sec_user_password` | Identidad y autenticación |
| `ai_job*` | `ai_job`, `ai_job_status_history` | Orquestación de jobs |
| `stt_*` | `stt_recording`, `stt_recording_result` | Datos STT |

**Vistas:**
- `vw_ai_job_current_status` — estado actual para polling (usa `is_current = TRUE`)
- `vw_stt_recording_result` — resultado completo para el endpoint de resultado

**Stored Procedures:**

| SP | Ejecutado por | Cuándo |
|---|---|---|
| `sp_create_stt_live_recording_job_v1` | API | Al crear el job |
| `sp_update_ai_job_status_v1` | API + Function | En cada transición de estado |
| `sp_complete_stt_live_recording_job_v1` | Function | Al finalizar con éxito |
| `sp_save_stt_partial_result_v1` | Function | Después de cada paso de IA (smart retry) |
| `sp_reset_ai_job_for_retry_v1` | API | Al solicitar retry de un job fallido |

**Functions SQL:**

| Function | Ejecutado por | Propósito |
|---|---|---|
| `fn_can_process_ai_job` | Azure Function | Guard de idempotencia |
| `fn_get_stt_live_recording_job_context` | Azure Function | Contexto completo del job |
| `set_updated_at()` | Trigger (5 tablas) | Actualiza `updated_at` automáticamente |
| `sync_ai_job_from_history()` | Trigger en `ai_job_status_history` | Sincroniza `ai_job` |

---

### Azure Queue Storage

**Queue:** `championaiqueue`

**Mensaje:** `{ "job_id": "job_{uuid}" }` — deliberadamente mínimo

**Garantía:** at-least-once delivery → todos los SPs son idempotentes

**Error al publicar:** la API ejecuta `sp_update_ai_job_status_v1(status='failed', error_code='QUEUE_SEND_FAILED')`

---

### Azure Blob Storage

**Path:** `audio/{user_uuid}/{job_id}/{job_id}.{formato}`

**Formatos:** `webm`, `mp4`, `m4a`, `mp3`, `wav`, `ogg`, `flac`, `aac`

**SAS URL:** expira en 3600s, permite solo `PUT` sobre el blob específico

**Headers requeridos al subir:** `x-ms-blob-type: BlockBlob`, `Content-Type: audio/{formato}`

---

### Azure AI

| Servicio | Tecnología | Paso | Output |
|---|---|---|---|
| Azure AI Speech | Fast Transcription REST API | `transcription` | `transcription_text` |
| Azure OpenAI | gpt-5-mini | `summary` | `summary_text` |
| Azure OpenAI | gpt-5-mini | `notes` | `notes_text`, `notes_json` |
| Azure OpenAI | gpt-5-mini | `mind_map` | `mind_map_json` |

Solo la Azure Function llama estos servicios. La API nunca interactúa con Azure AI.

**Notas de integración con gpt-5-mini:**
- Modelo de razonamiento — los thinking tokens cuentan contra `max_completion_tokens`
- No acepta el parámetro `temperature` (solo soporta el valor por defecto = 1)
- Parámetro correcto: `max_completion_tokens` (no `max_tokens`)
- Configurado con `max_completion_tokens: 16384` para dar margen al razonamiento interno

**Notas de integración con Fast Transcription:**
- Endpoint: `POST https://{SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`
- Auth: header `Ocp-Apim-Subscription-Key`
- Request: `multipart/form-data` — `audio` (bytes originales) + `definition` (JSON con locales/channels)
- Response: `combinedPhrases[0].text` + `phrases[]` (segmentos con offset)
- Sin conversión de formato — el audio se envía tal como fue subido por el cliente

## Flujos del sistema

### Flujo completo STT

```
1. POST /API/AUTH/register → 201 Created
2. POST /API/AUTH/login    → 200 OK { access_token }

3. POST /AIServices/Speechv2/init            → 201 { job_id, upload_url, expires_in: 3600 }
4. PUT  {upload_url} [audio directo a Blob]  → 201 (Azure Blob, sin pasar por API)
5. POST /AIServices/Speechv2/SpeechToTextv2  → 202 { job_id, polling_url }

6. [Azure Queue → Azure Function]
   fn_can_process_ai_job → fn_get_context → processing/transcription
   → Fast Transcription → processing/summary → gpt-5-mini → processing/notes
   → gpt-5-mini → processing/mind_map → gpt-5-mini → completed

7. GET /AIServices/Speechv2/jobs/{id}/status → 200 { status, current_step }
   (repetir hasta completed o failed)

8. GET /AIServices/Speechv2/jobs/{id}/result → 200 { transcription, summary, notes, mind_map }
```

### Flujo de retry

```
1. GET /AIServices/Speechv2/jobs/{id}/status → 200 { status: "failed", error_code: "..." }
2. POST /AIServices/Speechv2/jobs/{id}/retry → 202 (re-encola el job)
3. [Azure Function consume el nuevo mensaje]
   → lee resultados parciales de stt_recording_result
   → omite pasos ya completados (smart retry)
   → ejecuta desde el paso fallido en adelante
```

### Máquina de estados de un job

```
[inicio]
   │ sp_create_stt_live_recording_job_v1
   ▼
queued ──── (falla queue) ────► failed
   │
   │ Azure Function consume mensaje
   ▼
processing / transcription
   │
   ▼
processing / summary
   │
   ▼
processing / notes
   │
   ▼
processing / mind_map
   │
   ▼
completed         ◄── cualquier paso puede fallar ──► failed
                                                         │
                                                         │ retry endpoint
                                                         ▼
                                                      queued (reintentado)
```

Estados terminales: `completed`, `failed`.
`fn_can_process_ai_job` rechaza reprocesamiento de estados terminales.
Máximo 3 reintentos controlados por `sp_reset_ai_job_for_retry_v1`.

### Protocolo de transición de estado

Cada transición ejecuta estas operaciones (vía SP):
```sql
-- 1. Desactiva estado actual
UPDATE ai_job_status_history SET is_current = FALSE WHERE job_id = '...' AND is_current = TRUE;
-- 2. Inserta nuevo estado activo
INSERT INTO ai_job_status_history (..., is_current = TRUE);
-- 3. Actualiza tabla principal
UPDATE ai_job SET status = '...', current_step = '...';
```

## Comunicación entre servicios

| Origen | Destino | Mecanismo | Formato |
|---|---|---|---|
| App Móvil | Champion API | HTTP + JWT | JSON `{ success, data, error }` |
| App Móvil | Azure Blob | HTTP PUT (SAS URL) | Binario audio |
| Champion API | PostgreSQL | Stored Procedures + vistas | SQL |
| Champion API | Azure Queue | SDK Azure | `{ job_id }` JSON |
| Champion API | Azure Blob | SDK Azure | Genera SAS URL |
| Azure Queue | Azure Function | Queue Trigger | `{ job_id }` JSON |
| Azure Function | PostgreSQL | Stored Procedures + Functions | SQL (directo :5432) |
| Azure Function | Azure Blob | SDK Azure | Descarga audio (bytes crudos) |
| Azure Function | Azure AI Speech | HTTP REST multipart | Audio → `transcription_text` |
| Azure Function | Azure OpenAI | SDK openai | Texto → contenido estructurado |

## Decisiones arquitectónicas (ADRs)

| ADR | Decisión | Razón principal |
|---|---|---|
| ADR-001 | Queue + Azure Function para IA async | Evitar timeouts HTTP, escalar independientemente |
| ADR-002 | Azure Function solo usa Stored Procedures | Las reglas del dominio viven en SQL, no en código |
| ADR-003 | Upload directo a Azure Blob via SAS URL | La API nunca recibe binarios — escalabilidad |
| ADR-004 | Envelope `{ success, data, error }` | Contrato predecible, un interceptor HTTP en el cliente |
| ADR-005 | Flag `is_current` en historial de estados | Acceso O(1) al estado actual sin query por timestamp |
| ADR-006 | SPs idempotentes ante redelivery | Azure Queue garantiza at-least-once, no exactly-once |
| ADR-007 | Fast Transcription en lugar de SDK Continuous Recognition | 10–50× más rápido, sin conversión de formato, menos dependencias |

## Roadmap del producto

El roadmap del pipeline STT ahora se planifica dentro del roadmap general del producto (Champion AI → Knowledge Packs → Knowledge Workspace → Herramientas Inteligentes de Aprendizaje). Ver `App/Knowledge/Roadmap/ROADMAP.md` y `App/Knowledge/Roadmap/EPICS.md` para el detalle completo — reemplazan por completo al antiguo `pipeline-roadmap.md`.

```
Etapa actual (implementada):
  transcription → summary → notes → mind_map

EPIC V2 — Intelligent Study (próxima etapa técnica):
  transcription → transcript_cleanup → summary → notes → mind_map → topic_extraction

EPIC V1 — Knowledge Workspace:
  el resultado de este pipeline se consume desde el Workspace, no desde una vista Markdown

EPICs V2.5 → V5:
  enriquecimiento semántico, aprendizaje activo (flashcards/quiz/chat), narración inteligente,
  plataforma de conocimiento (grafo, búsqueda semántica)
```

## Principios de diseño

1. **Separación estricta de responsabilidades** — cada componente tiene una función y no invade la del otro
2. **La lógica de dominio vive en SQL** — los SPs son el contrato, el código es el orquestador
3. **Trazabilidad completa** — cada transición de estado queda en `ai_job_status_history` con actor y timestamp
4. **Defensa en profundidad para idempotencia** — guard a nivel Function + `ON CONFLICT` a nivel SP
5. **La BD protege su propia integridad** — constraints, triggers y el índice único de `is_current`
6. **Diseño preparado para múltiples features** — `ai_job` es genérico; `stt_recording` es específico de STT
7. **Smart retry sin re-costo** — resultados parciales persistidos tras cada paso, retry reanuda desde el fallo

## Vacíos conocidos (a resolver)

- Expiración del JWT y mecanismo de refresh
- Transiciones completas de `upload_status` en `stt_recording`
- Lógica de bloqueo de cuenta (`failed_attempts`, `locked_until` en `sec_user_password`)
- Rate limits de Fast Transcription por región
- Diseño técnico de la narración inteligente (EPIC V4 — Intelligent Audio Learning), ver `App/Knowledge/Roadmap/EPICS.md`

> Gestión de Archivos genérica fue retirada del roadmap activo — ver `App/Knowledge/Bugs/known-issues.md`.
