# Champion AI — Bóveda de Conocimiento

> Fuente de conocimiento derivada del proyecto. No modifica el código original.
> Generada el: 2026-06-28

---

## Qué es este vault

Esta bóveda representa el conocimiento del proyecto Champion AI en formato Obsidian.
Está diseñada para ser consumida por Claude Code, MCP Obsidian, y cualquier asistente de IA que trabaje sobre el proyecto.

**No es documentación duplicada**: es conocimiento inferido, sintetizado y enlazado.

---

## Mapa del conocimiento

```mermaid
graph TD
    VISION["📱 Visión\nProduct/vision"]
    ARCH["🏗️ Arquitectura\nArchitecture/overview"]
    API["🔧 Backend API\nArchitecture/backend-api"]
    FUNC["⚡ Azure Function\nArchitecture/azure-function"]
    AZURE["☁️ Azure Services\nArchitecture/azure-services"]
    STT["🎤 Speech to Text\nFeatures/speech-to-text"]
    TTS["🔊 Text to Speech\nFeatures/text-to-speech"]
    SUM["📋 Summaries\nFeatures/summaries"]
    NOTES["📝 Notes\nFeatures/notes"]
    MIND["🗺️ Mind Maps\nFeatures/mind-maps"]
    SCHEMA["🗄️ Schema\nDatabase/schema-overview"]
    STATES["🔄 Job States\nDatabase/job-states"]
    OPS["⚙️ Operations\nOperations/local-setup"]

    VISION --> ARCH
    ARCH --> API
    ARCH --> FUNC
    ARCH --> AZURE
    API --> STT
    API --> TTS
    FUNC --> STT
    STT --> SUM
    STT --> NOTES
    STT --> MIND
    API --> SCHEMA
    FUNC --> SCHEMA
    SCHEMA --> STATES
    OPS --> ARCH
```

---

## Índice por carpeta

### [[vision|Product]] — Visión del producto
- [[vision]] — Visión, usuarios, objetivos, equipo

### Architecture — Sistema y componentes
- [[overview]] — Diagrama general del sistema
- [[backend-api]] — API Node.js / Express
- [[azure-function]] — Azure Function (Queue Trigger)
- [[azure-services]] — Azure Blob, Queue, AI

### Features — Funcionalidades
- [[speech-to-text]] — STT live_recording (implementada)
- [[text-to-speech]] — TTS (pendiente de documentación)
- [[summaries]] — Generación de resúmenes
- [[notes]] — Notas estructuradas
- [[mind-maps]] — Mapas mentales

### Flows — Flujos del sistema
- [[registration]] — Registro de usuario
- [[login]] — Autenticación JWT
- [[upload-audio]] — Init upload + SAS + subida directa
- [[stt-processing]] — Procesamiento async en Azure Function
- [[polling]] — Consulta de estado y resultado

### Database — Base de datos
- [[schema-overview]] — Diagrama relacional y principios
- [[tables]] — Definición de cada tabla
- [[views]] — Vistas del sistema
- [[stored-procedures]] — Stored Procedures y su lógica
- [[functions]] — Funciones y triggers
- [[job-states]] — Máquina de estados de un Job

### ADR — Decisiones arquitectónicas
- [[ADR-001-queue-based-processing]] — Por qué usar Azure Queue + Function
- [[ADR-002-stored-procedures-only]] — Por qué la Function solo llama SPs
- [[ADR-003-sas-direct-upload]] — Por qué el upload va directo a Azure Blob
- [[ADR-004-response-envelope]] — Contrato `{ success, data, error }`
- [[ADR-005-is-current-pattern]] — Flag `is_current` en historial de estados
- [[ADR-006-idempotent-stored-procedures]] — Idempotencia ante redelivery de queue

### Bugs — Problemas conocidos
- [[known-issues]] — Vacíos, contradicciones y pendientes

### Operations — Operaciones
- [[local-setup]] — Setup local completo
- [[database-management]] — Backup y sincronización de BD
- [[error-codes]] — Catálogo de errores HTTP

### Roadmap — Futuro
- [[pending-features]] — Features no implementadas

---

## Estado del proyecto

| Componente | Estado |
|---|---|
| Auth (register + login) | Implementado |
| STT live_recording (init + create job) | Implementado |
| STT polling `/jobs/{id}/status` | **Pendiente** |
| STT resultado `/jobs/{id}/result` | **Pendiente** |
| Text to Speech | Sin documentar |
| File Management | Sin documentar |

---

## Fuentes de este vault

```
Champion-AI/README.md
Champion-AI/App/Docs/arquitectura/STT_Feature_Grabación en vivo.md
Champion-AI/App/SQL/Stored Procedures/
Champion-AI/App/SQL/Functions/
Champion-AI/App/SQL/Migrations/
Champion-AI/App/docker/postgres/init.sql
```
