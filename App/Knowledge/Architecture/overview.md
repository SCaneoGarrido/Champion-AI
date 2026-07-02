# Arquitectura del Sistema

tags: #architecture #overview

---

## Diagrama general

```mermaid
graph TD
    MOBILE["📱 App Móvil\nReact Native / Expo"]
    API["🔧 Champion API\nNode.js / Express\nlocalhost:5000"]
    PG["🗄️ PostgreSQL\nlocalhost:5432"]
    QUEUE["📨 Azure Queue\nchampionaiqueue"]
    FUNC["⚡ Azure Function\nPython / Durable Functions"]
    BLOB["☁️ Azure Blob Storage\naudio/{user}/{job}/"]
    AI["🤖 Azure AI\nFast Transcription + gpt-5-mini"]

    MOBILE -- "HTTP + JWT" --> API
    API -- "UPSERT/SELECT via SP" --> PG
    API -- "Publica mensaje {job_id}" --> QUEUE
    API -- "Genera SAS URL" --> BLOB
    MOBILE -- "PUT audio (directo)" --> BLOB
    QUEUE -- "Trigger" --> FUNC
    FUNC -- "Descarga audio (bytes crudos)" --> BLOB
    FUNC -- "Transcribe + LLM" --> AI
    FUNC -- "Solo Stored Procedures" --> PG
    API -- "Polling vía vistas" --> PG
```

---

## Principio arquitectónico central

> El procesamiento de IA es **asíncrono y desacoplado**. La API no procesa: coordina. Azure Function no coordina: procesa.

Este principio se manifiesta en:

1. La API acepta el job y responde `202 Accepted` inmediatamente
2. El trabajo real ocurre en Azure Function, disparada por la cola
3. El cliente hace polling para conocer el resultado

---

## Componentes y responsabilidades

### App Móvil — React Native (Expo)

Responsable de:
- Grabar o seleccionar audio
- Solicitar y obtener la SAS URL para subida
- Subir el audio directamente a Azure Blob
- Crear el job de procesamiento en la API
- Hacer polling hasta obtener el resultado
- Mostrar transcripción, resumen, notas y mapa mental

**No procesa IA. No sabe de queues.**

Ver [[backend-api]] para los contratos HTTP que consume.

---

### Backend API — Node.js / Express

Puerto: `5000` (`PORT` en `App/.env` — global, no `App/API/.env`)

Responsable de:
- Autenticación y autorización (JWT)
- Validación de payloads entrantes
- Generación de SAS URLs (acceso temporal a Azure Blob)
- Creación de jobs via Stored Procedures
- Publicación de mensajes en Azure Queue
- Exposición de endpoints de polling (estado y resultado)
- Endpoint de retry de jobs fallidos

**No ejecuta procesamiento de IA. No hace DML directo en BD.**

Ver [[backend-api]] para el detalle completo.

---

### Azure Function — Python / Durable Functions

Trigger: `championaiqueue`

Responsable de:
- Consumir mensajes desde la queue
- Obtener contexto del job desde PostgreSQL
- Descargar el audio desde Azure Blob (formato original — sin conversión)
- Ejecutar transcripción via **Azure AI Speech Fast Transcription** (REST API)
- Ejecutar generación de resumen, notas y mapa mental via **Azure OpenAI (gpt-5-mini)**
- Guardar resultados parciales tras cada paso exitoso (smart retry)
- Guardar resultado final en PostgreSQL via Stored Procedures
- Actualizar estado del job en cada paso

**Regla absoluta: solo puede llamar Stored Procedures. Nunca DML directo.**

Ver [[azure-function]] y [[ADR-002-stored-procedures-only]].

---

### PostgreSQL 17.10

Contenedor Docker, puerto `5432`. Usuario: `champion_db_user`. BD: `champion_db`.

Responsable de:
- Persistir todos los datos del sistema
- Exponer lógica de dominio via Stored Procedures
- Proveer vistas para consultas eficientes de la API
- Garantizar integridad referencial
- Mantener historial completo de estados de cada job

Ver [[schema-overview]] para el modelo de datos.

---

### Azure Queue Storage

Queue: `championaiqueue`

El nombre de la queue define el **bounded context** del servicio STT.

Mensaje publicado:
```json
{ "job_id": "job_550e8400-..." }
```

Garantía: **at-least-once delivery**. Por eso los Stored Procedures son idempotentes.
Ver [[ADR-006-idempotent-stored-procedures]].

---

### Azure Blob Storage

Estructura de paths:
```
audio/
  {user_uuid}/
    {job_id}/
      {job_id}.{formato}
```

Formatos soportados: `webm`, `mp4`, `m4a`, `mp3`, `wav`, `ogg`, `flac`, `aac`

El cliente sube **directamente** via SAS URL. La API nunca recibe el binario.
Ver [[ADR-003-sas-direct-upload]].

---

### Azure AI Services

| Servicio | Tecnología | Uso |
|---|---|---|
| Azure AI Speech | Fast Transcription REST API | Transcripción de audio a texto en el paso `transcription` |
| Azure OpenAI | gpt-5-mini (reasoning model) | Generación de resumen, notas y mapa mental |

**Fast Transcription:** procesa el audio completo en una sola llamada HTTP. Acepta formatos nativos sin conversión. Velocidad ~10–50× real-time.

**gpt-5-mini:** modelo de razonamiento. No acepta `temperature`. Requiere `max_completion_tokens` con margen amplio (16384) para los tokens de razonamiento interno.

Detalles completos en [[azure-services]].

---

## Restricciones arquitectónicas

| Restricción | Impacto |
|---|---|
| Azure Function solo usa SPs | Cambios de dominio solo en SQL, no en código de Function |
| API no recibe binarios de audio | Escalabilidad: el storage no pasa por la API |
| Queue garantiza at-least-once | Los SPs deben ser idempotentes |
| JWT requerido en todos los endpoints (excepto register/login) | No hay endpoints públicos de procesamiento |
| Fast Transcription — sin conversión de formato | El audio se envía en su formato original |

---

## Flujo de datos de alto nivel

Ver [[upload-audio]] y [[stt-processing]] para los flujos detallados paso a paso.

```
register → login → init upload → PUT audio → create job
→ [queue] → function trigger → AI processing → save result
→ [polling] → get result
```
