# Flujo: Polling de Estado y Resultado

tags: #flow #polling #status #result

---

## Estado de implementación

> Ambos endpoints están **implementados y en producción**. Ver [[backend-api]] para el endpoint
> surface completo verificado contra el código real.

---

## Descripción

Después de crear el job (ver [[upload-audio]]), el cliente no recibe el resultado de inmediato. El procesamiento es async. El cliente debe consultar periódicamente hasta que el job llegue a `completed` o `failed`.

---

## Endpoint 1: Consultar estado del job

```http
GET /AIServices/Speechv2/jobs/{job_id}/status
Authorization: Bearer {access_token}
```

El backend consulta la vista `vw_ai_job_current_status`.

### Respuestas posibles

**Processing — 200 OK:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "status": "processing",
    "current_step": "summary"
  },
  "error": null
}
```

**Completed — 200 OK:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "status": "completed"
  },
  "error": null
}
```

**Failed — 200 OK:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "status": "failed",
    "error_code": "STT_ENGINE_UNAVAILABLE"
  },
  "error": null
}
```

**Errores del endpoint:**

| Status | Código | Motivo |
|---|---|---|
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 404 | `NOT_FOUND` | `job_id` no encontrado |
| 500 | `INTERNAL_ERROR` | Error interno |

---

## Endpoint 2: Obtener resultado final

Solo debe llamarse cuando `status = completed`.

```http
GET /AIServices/Speechv2/jobs/{job_id}/result
Authorization: Bearer {access_token}
```

El backend consulta la vista `vw_stt_recording_result`.

### Respuesta exitosa — 200 OK

La vista `vw_stt_recording_result` expone los campos de resultado al mismo nivel que la metadata del
recording y del job — no anidados bajo una clave `result` (ver [[views]] para la lista completa de
columnas):

```json
{
  "success": true,
  "data": {
    "job_id": "job_550e8400-...",
    "job_status": "completed",
    "current_step": "mind_map",
    "transcription_text": "...",
    "summary_text": "...",
    "notes_text": "...",
    "notes_json": { "title": "...", "concepts": [] },
    "mind_map_json": { "title": "...", "nodes": [] },
    "generated_at": "2026-08-10T12:00:00.000Z"
  },
  "error": null
}
```

**Errores del endpoint:**

| Status | Código | Motivo |
|---|---|---|
| 401 | `INVALID_TOKEN` | JWT ausente |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 404 | `NOT_FOUND` | `job_id` no encontrado o sin resultado |
| 500 | `INTERNAL_ERROR` | Error interno |

---

## Estrategia de polling recomendada

El cliente debería:

```
1. Esperar N segundos antes del primer poll
2. Consultar GET /status
3. Si status = "processing" → esperar y volver a 2
4. Si status = "completed" → ir a 5
5. Si status = "failed"    → mostrar error al usuario
6. Consultar GET /result
```

> El intervalo de polling no está documentado. No existe webhook ni push notification en el sistema actual.

---

## Vistas que usa

| Endpoint | Vista |
|---|---|
| `/status` | `vw_ai_job_current_status` |
| `/result` | `vw_stt_recording_result` |

Ver [[views]] para el detalle de cada vista.

---

## Diagrama

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as Champion API
    participant PG as PostgreSQL

    loop Hasta completed o failed
        C->>API: GET /jobs/{job_id}/status
        API->>PG: SELECT vw_ai_job_current_status
        PG-->>API: { status, current_step }
        API->>C: 200 { status: "processing", step: "summary" }
        Note over C: Espera intervalo de polling
    end

    C->>API: GET /jobs/{job_id}/result
    API->>PG: SELECT vw_stt_recording_result
    PG-->>API: { transcription, summary, notes, mind_map }
    API->>C: 200 { result completo }
```

---

## Referencias cruzadas

- [[upload-audio]] — Flujo previo (crea el job)
- [[stt-processing]] — Lo que ocurre mientras el cliente hace polling
- [[views]] — `vw_ai_job_current_status`, `vw_stt_recording_result`
- [[job-states]] — Estados posibles que devuelve el endpoint
- [[speech-to-text]] — Feature completa
- [[known-issues]] — Pendientes de implementación
