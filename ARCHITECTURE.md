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
│   :5432     │    │ champion-ai-stt │   │  Storage         │
│  champion_db│    │ -live-recording │   │  audio/{u}/{j}/  │
└─────────────┘    └────────┬────────┘   └────────┬─────────┘
       ▲                    │ Trigger               │ PUT directo
       │ Solo SPs           ▼                       │ (cliente)
       │           ┌─────────────────┐              │
       └───────────│  Azure Function  │◄─────────────┘
                   │  Queue Trigger  │  Descarga audio
                   │                 │
                   │  ┌───────────┐  │
                   │  │ Azure AI  │  │
                   │  │ Speech +  │  │
                   │  │ OpenAI    │  │
                   │  └───────────┘  │
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
- Publicación de `{ job_id }` en la queue `champion-ai-stt-live-recording`
- Exposición de endpoints de polling (`/jobs/{id}/status`, `/jobs/{id}/result`)
- Centralización de toda la lógica de negocio del sistema

**Qué no hace:**
- No ejecuta IA
- No recibe binarios de audio
- No hace DML directo en tablas de dominio (usa Stored Procedures)
- No es intermediario del procesamiento de la Azure Function

**Acceso a BD:** vía Stored Procedures y vistas (`vw_ai_job_current_status`, `vw_stt_recording_result`)

---

### Azure Function — Queue Trigger

**Trigger:** queue `champion-ai-stt-live-recording`, mensaje `{ "job_id": "..." }`

**Qué hace (en orden):**
1. `fn_can_process_ai_job` — guard de idempotencia
2. `fn_get_stt_live_recording_job_context` — obtiene contexto completo del job
3. `sp_update_ai_job_status_v1` → `processing / transcription`
4. Descarga audio de Azure Blob
5. Azure Speech → `transcription_text`
6. `sp_update_ai_job_status_v1` → `processing / summary`
7. Azure OpenAI → `summary_text`
8. `sp_update_ai_job_status_v1` → `processing / notes`
9. Azure OpenAI → `notes_text` + `notes_json`
10. `sp_update_ai_job_status_v1` → `processing / mind_map`
11. Azure OpenAI → `mind_map_json`
12. `sp_complete_stt_live_recording_job_v1` → guarda resultado + `completed`

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

**Functions SQL:**

| Function | Ejecutado por | Propósito |
|---|---|---|
| `fn_can_process_ai_job` | Azure Function | Guard de idempotencia |
| `fn_get_stt_live_recording_job_context` | Azure Function | Contexto completo del job |
| `set_updated_at()` | Trigger (5 tablas) | Actualiza `updated_at` automáticamente |
| `sync_ai_job_from_history()` | Trigger en `ai_job_status_history` | Sincroniza `ai_job` |

---

### Azure Queue Storage

**Queue:** `champion-ai-stt-live-recording`

**Mensaje:** `{ "job_id": "job_{uuid}" }` — deliberadamente mínimo

**Garantía:** at-least-once delivery → todos los SPs son idempotentes

**Error al publicar:** la API ejecuta `sp_update_ai_job_status_v1(status='failed', error_code='QUEUE_SEND_FAILED')`

---

### Azure Blob Storage

**Path:** `audio/{user_uuid}/{job_id}/{job_id}.{formato}`

**Formatos:** `webm`, `mp4`, `m4a`, `mp3`, `wav`, `ogg`

**SAS URL:** expira en 3600s, permite solo `PUT` sobre el blob específico

**Headers requeridos al subir:** `x-ms-blob-type: BlockBlob`, `Content-Type: audio/{formato}`

---

### Azure AI

| Servicio | Paso | Output |
|---|---|---|
| Azure Speech | `transcription` | `transcription_text` |
| Azure OpenAI | `summary` | `summary_text` |
| Azure OpenAI | `notes` | `notes_text`, `notes_json` |
| Azure OpenAI | `mind_map` | `mind_map_json` |

Solo la Azure Function llama estos servicios. La API nunca interactúa con Azure AI.

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
   → Azure Speech → processing/summary → Azure OpenAI → processing/notes
   → Azure OpenAI → processing/mind_map → Azure OpenAI → completed

7. GET /AIServices/Speechv2/jobs/{id}/status → 200 { status: "processing"|"completed"|"failed" }
   (repetir hasta completed o failed)

8. GET /AIServices/Speechv2/jobs/{id}/result → 200 { transcription, summary, notes, mind_map }
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
```

Estados terminales: `completed`, `failed`.
`fn_can_process_ai_job` rechaza reprocesamiento de estados terminales.

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
| Azure Function | Azure Blob | SDK Azure | Descarga audio |
| Azure Function | Azure Speech | SDK Azure | Audio → texto |
| Azure Function | Azure OpenAI | SDK Azure | Texto → contenido estructurado |

## Decisiones arquitectónicas (ADRs)

| ADR | Decisión | Razón principal |
|---|---|---|
| ADR-001 | Queue + Azure Function para IA async | Evitar timeouts HTTP, escalar independientemente |
| ADR-002 | Azure Function solo usa Stored Procedures | Las reglas del dominio viven en SQL, no en código |
| ADR-003 | Upload directo a Azure Blob via SAS URL | La API nunca recibe binarios — escalabilidad |
| ADR-004 | Envelope `{ success, data, error }` | Contrato predecible, un interceptor HTTP en el cliente |
| ADR-005 | Flag `is_current` en historial de estados | Acceso O(1) al estado actual sin query por timestamp |
| ADR-006 | SPs idempotentes ante redelivery | Azure Queue garantiza at-least-once, no exactly-once |

## Principios de diseño

1. **Separación estricta de responsabilidades** — cada componente tiene una función y no invade la del otro
2. **La lógica de dominio vive en SQL** — los SPs son el contrato, el código es el orquestador
3. **Trazabilidad completa** — cada transición de estado queda en `ai_job_status_history` con actor y timestamp
4. **Defensa en profundidad para idempotencia** — guard a nivel Function + `ON CONFLICT` a nivel SP
5. **La BD protege su propia integridad** — constraints, triggers y el índice único de `is_current`
6. **Diseño preparado para múltiples features** — `ai_job` es genérico; `stt_recording` es específico de STT

## Vacíos conocidos (a resolver)

- Lenguaje real de la Azure Function (contradicción Java vs Python en el README)
- Modelos de Azure OpenAI, prompts y configuración de Azure Speech
- Expiración del JWT y mecanismo de refresh
- Estructura interna de `notes_json` y `mind_map_json`
- Transiciones completas de `upload_status` en `stt_recording`
- Lógica de bloqueo de cuenta (`failed_attempts`, `locked_until` en `sec_user_password`)
