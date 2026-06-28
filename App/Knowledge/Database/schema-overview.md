# Database — Schema Overview

tags: #database #schema #postgresql

---

## Motor de base de datos

- **PostgreSQL 17.10**
- Contenedor Docker, puerto `5432`
- Usuario: `champion_db_user`
- Base de datos: `champion_db`
- Extensión: `pgcrypto` (para `gen_random_uuid()`)

---

## Diagrama relacional

```mermaid
erDiagram
    sec_user {
        uuid user_id PK
        varchar email UK
        varchar username
        varchar first_name
        varchar last_name
        varchar display_name
        boolean is_active
        varchar phone
        varchar location
        varchar occupation
        varchar avatar_url
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    sec_user_password {
        uuid user_password_id PK
        uuid user_id FK
        text password_hash
        varchar password_algorithm
        integer failed_attempts
        timestamptz locked_until
        boolean is_active
    }

    ai_job {
        varchar job_id PK
        uuid requested_by FK
        varchar service_code
        varchar feature_code
        varchar flow
        varchar status
        varchar current_step
        text polling_url
        jsonb request_payload
        jsonb metadata
        timestamptz requested_at
        timestamptz started_at
        timestamptz completed_at
        timestamptz failed_at
    }

    ai_job_status_history {
        uuid id_history PK
        varchar job_id FK
        varchar status
        varchar step_name
        text message
        varchar error_code
        text error_message
        boolean retryable
        boolean is_current
        varchar created_by_type
        uuid created_by FK
    }

    stt_recording {
        uuid recording_id PK
        varchar job_id FK UK
        uuid user_id FK
        varchar language_locale
        varchar audio_format
        integer sample_rate
        numeric duration_seconds
        text blob_name
        text blob_url
        varchar upload_status
        bigint size_bytes
    }

    stt_recording_result {
        uuid result_id PK
        uuid recording_id FK UK
        varchar job_id FK
        text transcription_text
        text summary_text
        text notes_text
        jsonb notes_json
        jsonb mind_map_json
        jsonb raw_result_json
        timestamptz generated_at
    }

    sec_user ||--o{ sec_user_password : "tiene"
    sec_user ||--o{ ai_job : "solicita"
    ai_job ||--o{ ai_job_status_history : "tiene historial"
    ai_job ||--o| stt_recording : "tiene recording"
    stt_recording ||--o| stt_recording_result : "tiene resultado"
```

---

## Grupos de tablas

### Seguridad (`sec_*`)
Gestiona usuarios y autenticación.

| Tabla | Propósito |
|---|---|
| `sec_user` | Identidad del usuario |
| `sec_user_password` | Credenciales con historial |

### Jobs (`ai_job*`)
Orquestación del procesamiento asíncrono.

| Tabla | Propósito |
|---|---|
| `ai_job` | Job principal con estado actual |
| `ai_job_status_history` | Historial completo de transiciones |

### STT (`stt_*`)
Datos específicos de la feature Speech to Text.

| Tabla | Propósito |
|---|---|
| `stt_recording` | Metadata del audio subido |
| `stt_recording_result` | Resultados del procesamiento AI |

---

## Principios del modelo de datos

### 1. Separación de estado actual vs historial
`ai_job` mantiene el estado actual para lecturas rápidas. `ai_job_status_history` mantiene el historial completo. El flag `is_current` conecta ambas tablas de forma eficiente. Ver [[ADR-005-is-current-pattern]].

### 2. Todas las mutaciones via Stored Procedures
No existe DML ad-hoc en el código de la Azure Function. Los SPs son el contrato del dominio. Ver [[ADR-002-stored-procedures-only]].

### 3. Idempotencia por diseño
Los SPs críticos usan `ON CONFLICT DO UPDATE`. Esto protege ante el redelivery de Azure Queue. Ver [[ADR-006-idempotent-stored-procedures]].

### 4. Relaciones en cascada
`ai_job` → `ai_job_status_history` (CASCADE DELETE)
`ai_job` → `stt_recording` (CASCADE DELETE)
`stt_recording` → `stt_recording_result` (CASCADE DELETE)

### 5. Triggers de `updated_at`
Todas las tablas tienen trigger `trg_*_updated_at` que llama `set_updated_at()` automáticamente.

---

## Vistas del sistema

| Vista | Propósito |
|---|---|
| `vw_ai_job_current_status` | Estado actual del job para polling |
| `vw_stt_recording_result` | Resultado completo del job STT |

Ver [[views]].

---

## Objetos SQL del sistema

| Tipo | Cantidad | Detalle |
|---|---|---|
| Tablas | 6 | Ver [[tables]] |
| Vistas | 2 | Ver [[views]] |
| Stored Procedures | 3 | Ver [[stored-procedures]] |
| Functions | 4 | Ver [[functions]] |
| Triggers | 5 | uno por tabla (updated_at) + sync_ai_job_from_history |
| Índices | 18 | Ver [[tables]] |
| Extensiones | 1 | `pgcrypto` |

---

## Referencias cruzadas

- [[tables]] — Definición completa de cada tabla
- [[views]] — Definición y propósito de las vistas
- [[stored-procedures]] — SPs del dominio
- [[functions]] — Functions y triggers
- [[job-states]] — Máquina de estados de los jobs
