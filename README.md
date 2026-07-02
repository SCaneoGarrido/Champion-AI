# Champion AI

<p align="center">
  <img src="./App/Docs/LogoApp/Logo Champion AI.png" alt="Champion AI Icon" width="720"/>
</p>

## Descripción

**Champion AI** es un hub de servicios de Inteligencia Artificial accesible desde una app móvil. Permite procesar contenido (audio, texto) usando IA de Azure de forma simple y sin conocimiento técnico.

La primera feature implementada de extremo a extremo es **Speech-to-Text (STT) live_recording**: el usuario graba audio → la app lo sube a Azure Blob → la API lo encola → una Azure Function transcribe, resume, genera notas y un mapa mental → el cliente hace polling hasta obtener el resultado.

---

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

---

## Pipeline de procesamiento STT

El pipeline ejecuta en la Azure Function de forma completamente asíncrona:

```
Audio (WebM/M4A/MP3/OGG/WAV/FLAC)
        │
        ▼
Azure AI Speech — Fast Transcription
(HTTP POST · procesamiento ~10–50× real-time · sin conversión de formato)
        │
        ▼  [planned: Transcript Cleanup via GPT-5]
        │
        ▼
Resumen ejecutivo (gpt-5-mini)
        │
        ▼
Notas estructuradas — texto + JSON (gpt-5-mini)
        │
        ▼
Mapa mental jerárquico — JSON (gpt-5-mini)
        │
        ▼
Resultado almacenado en PostgreSQL · cliente notificado via polling
```

### Azure AI Speech — Fast Transcription

Reemplaza al Azure Speech SDK Continuous Recognition. Ventajas:

- Procesa el audio completo en una sola llamada HTTP (`POST /speechtotext/transcriptions:transcribe?api-version=2024-11-15`)
- Acepta formatos nativos (WebM, M4A, MP3, OGG, WAV, FLAC, AAC) — sin conversión previa a WAV
- Velocidad: ~10–50× real-time (audio de 14 min → 1–2 min de procesamiento)
- Límites: 200 MB / 4 horas por archivo

### Azure OpenAI — gpt-5-mini

Modelo de razonamiento utilizado para todos los pasos de generación de contenido. Comportamiento importante para el desarrollo:

- No acepta el parámetro `temperature` (usa por defecto 1)
- Requiere `max_completion_tokens` en lugar de `max_tokens`
- Los tokens de razonamiento interno cuentan contra el límite declarado
- Configurado con `max_completion_tokens: 16384` para dar margen al razonamiento

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        App Móvil                            │
│                   React Native / Expo                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Champion API                             │
│                Node.js + Express — :5000                    │
│  Auth · Validación · SAS URL · Jobs · Polling               │
└──────┬────────────────────┬───────────────────┬────────────┘
       │ via SP              │ Publica { job_id } │ Genera SAS URL
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
                   │ Fast Transcription
                   │ + gpt-5-mini    │
                   └─────────────────┘
```

### Principios arquitectónicos

| Principio | Descripción |
|---|---|
| La API orquesta — no procesa | Acepta, valida, encola y responde 202. Nunca ejecuta IA. |
| La Function procesa — no coordina | Consume la queue y ejecuta el pipeline de IA. No llama a la API. |
| Solo Stored Procedures | La Function nunca hace DML directo. Todo estado pasa por SPs. |
| El audio nunca pasa por la API | El cliente sube directamente a Azure Blob via SAS URL. |
| El cliente hace polling | No hay WebSocket. El cliente consulta `/jobs/{id}/status` hasta `completed`. |
| Idempotencia garantizada | `fn_can_process_ai_job` + `ON CONFLICT DO UPDATE` en SPs críticos. |

---

## Estructura del repositorio

```
Champion-AI/
├── CLAUDE.md                        ← Contexto global para Claude Code
├── ARCHITECTURE.md                  ← Arquitectura técnica detallada
├── README.md
└── App/
    ├── API/                         ← Backend Node.js / Express
    │   ├── CLAUDE.md                ← Contexto del componente API
    │   └── src/
    │       ├── routes/              ← Endpoints Express
    │       ├── repositories/        ← Acceso a BD
    │       └── middleware/          ← Auth JWT, validación
    │
    ├── Mobile/                      ← App React Native / Expo
    │   ├── src/
    │   │   ├── screens/             ← Pantallas
    │   │   └── services/            ← Llamadas a la API
    │   └── .env                     ← EXPO_PUBLIC_API_URL
    │
    ├── procesamiento/               ← Azure Function App (Python)
    │   ├── CLAUDE.md                ← Contexto del componente
    │   ├── function_app.py          ← Entry point — registra blueprints
    │   ├── config.py                ← Variables de entorno
    │   ├── requirements.txt         ← azure-functions, openai, requests, psycopg2...
    │   ├── local.settings.json      ← Config local (no commitear)
    │   ├── orchestrators/           ← Orquestador Durable
    │   ├── activities/              ← Activities modulares
    │   ├── trigger/                 ← Queue trigger
    │   ├── shared/                  ← DB, servicios AI, utils
    │   └── prompts/                 ← Prompts de GPT-5-mini
    │
    ├── SQL/                         ← Migrations, Stored Procedures, Functions
    │   ├── Migrations/
    │   ├── Stored Procedures/
    │   └── Functions/
    │
    ├── Knowledge/                   ← Bóveda de conocimiento (Obsidian)
    ├── rules/                       ← Reglas reutilizables por Claude Code
    ├── agents/                      ← Agentes especializados por dominio
    ├── commands/                    ← Prompts reutilizables
    ├── docker/
    │   └── postgres/
    │       └── init.sql             ← Schema completo (versionado)
    └── docker-compose.yml           ← PostgreSQL container
```

---

## Estado actual del proyecto

| Feature | Estado |
|---|---|
| Auth — register + login | Implementado |
| STT — init upload (SAS URL) | Implementado |
| STT — create job + enqueue | Implementado |
| STT — Azure Function pipeline | Implementado |
| STT — GET /jobs/{id}/status | Implementado |
| STT — GET /jobs/{id}/result | Implementado |
| STT — retry de jobs fallidos | Implementado |
| STT — Transcript Cleanup (GPT-5) | Planificado — próximo a implementar |
| STT — Topic Extraction | Roadmap |
| Presentation Layer — Markdown, LaTeX, Mind maps (Mermaid), UI enriquecida | En implementación |
| Push notifications (Expo Push Service) | En implementación |
| Text to Speech (TTS) | Sin documentar |
| Gestión de Archivos | Sin documentar |

---

## Presentation Layer — cómo se ve el resultado

El pipeline de IA no cambia — lo que cambia es cómo se presenta lo que ya genera. `summary_text` y `notes_text` (ya son Markdown en el prompt) se renderizan de verdad en la app (headers, tablas, checklists, LaTeX para contenido matemático), y el mapa mental deja de ser una lista anidada: se convierte de forma determinística (sin IA) a sintaxis Mermaid y se renderiza como diagrama real (SVG), cacheado en el backend tras el primer render. El mecanismo de render (Mermaid + LaTeX) vive 100% en el cliente vía WebView, sin dependencias nuevas en la Azure Function. Detalle en `App/Knowledge/ADR/ADR-008-client-side-rendering.md` y `App/rules/mobile-rendering.md`.

---

## Knowledge Pack — la próxima generación del pipeline

Champion AI está evolucionando el resultado del procesamiento STT hacia un objeto de conocimiento unificado y extensible: el **Knowledge Pack**. Es el marco de diseño bajo el cual crecen todas las capacidades futuras (topics, capítulos, flashcards, quiz, búsqueda semántica, chat) sin romper compatibilidad con lo ya implementado.

Diseño funcional completo en `App/Docs/product/` — ver `App/Docs/product/README.md` como punto de entrada.

> La Presentation Layer (sección anterior) es distinta del Knowledge Pack: renderiza datos que la IA ya generó, no agrega datos nuevos derivados de IA. No pasa por el flujo de revisión de Knowledge Pack.

## Roadmap del pipeline inteligente

Ver `App/Knowledge/Roadmap/pipeline-roadmap.md` y `App/Docs/product/03-intelligent-pipeline-design.md` para el detalle completo.

| Etapa | Estado | Descripción |
|---|---|---|
| Fast Transcription | Implementado | Transcripción via REST API |
| Summary + Notes + Mind Map | Implementado | Generación de contenido estructurado |
| Transcript Cleanup + Segmentos/Offsets | Próxima implementación | Limpieza de artefactos de voz + persistencia de timestamps (habilita reproducción sincronizada) |
| Topic Extraction / Keywords / Named Entities | Roadmap | Enriquecimiento semántico — requiere migrar a modelo de componentes extensibles |
| Chapters / Study Metadata / Flashcards / Quiz | Roadmap | Capa de estudio, basada en Topics |
| Semantic Search (embeddings) | Roadmap avanzado | Requiere extensión `pgvector` |
| AI Chat / búsqueda cross-pack | Visión | Conversar con una grabación pasada, buscar entre todas las grabaciones del usuario |

---

## Cómo levantar el proyecto

### Requisitos previos

| Herramienta | Versión | Verificación |
|---|---|---|
| Node.js | 18+ LTS | `node -v` |
| Python | 3.11+ | `python --version` |
| Docker Desktop | cualquier reciente | UI de Docker |
| Azure Functions Core Tools | v4 | `func --version` |
| Expo Go (opcional) | app en móvil | Para dispositivo físico |

### 1. Base de datos (PostgreSQL via Docker)

```bash
cd App
docker compose up -d
```

- BD disponible en `localhost:5432`
- Usuario: `champion_db_user`
- BD: `champion_db`
- Schema cargado automáticamente desde `App/docker/postgres/init.sql`

| Comando | Efecto |
|---|---|
| `docker compose up -d` | Levanta el contenedor. Preserva datos si el volumen existe. |
| `docker compose down -v` | Detiene y **elimina todos los datos**. El próximo `up` aplica `init.sql` desde cero. |

### 2. Backend API (Node.js)

```bash
cd App/API
npm install
npm start
```

API disponible en `http://localhost:5000`. Configurar variables en `App/.env` (global — `require('dotenv').config()` en `App/API/src/index.js` apunta ahí, no a `App/API/.env`).

### 3. Azure Function (Python)

```bash
cd App/procesamiento
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
func start
```

Requiere `local.settings.json` con las variables de Azure (SPEECH_KEY, SPEECH_REGION, OPENAI_KEY, OPENAI_ENDPOINT, OPENAI_API_VERSION, OPENAI_DEPLOYMENT, AZURE_STORAGE_CONNECTION_STRING, AzureWebJobsStorage, etc.)

### 4. App Móvil (Expo)

```bash
cd App/Mobile
npm install
npx expo start
```

Para dispositivo físico, crear `App/Mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:5000
```

> El móvil y el PC deben estar en la misma red Wi-Fi.

---

## Sincronización de la base de datos

```bash
cd App
bash backup_db.sh
```

Genera un dump completo, actualiza `docker/postgres/init.sql` y conserva los últimos 10 backups en `App/backups/` (en `.gitignore`).

Para que otro integrante aplique la última versión:
```bash
cd App
docker compose down -v && docker compose up -d
```

---

## Equipo

- Nicolás Bustamante
- Sebastián Caneo
