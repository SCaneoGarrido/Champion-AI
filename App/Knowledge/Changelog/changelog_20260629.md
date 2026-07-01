# Changelog — 2026-06-29

## Resumen de la sesión

Implementación completa del pipeline STT live_recording de extremo a extremo.
Se construyeron los 6 bloques planificados: infraestructura base, capa de BD, servicios de IA,
pipeline orquestado con Durable Functions, endpoints de resultado en la API y documentación.

---

## Azure Function — Infraestructura base

**Archivos:** `config.py`, `requirements.txt`, `shared/utils/__init__.py`, `shared/utils/constants.py`

- `config.py` centraliza todas las variables de entorno (PostgreSQL, Azure Blob, Azure Speech, Azure OpenAI)
- `requirements.txt` contiene las dependencias exactas sin `pydub` (no se usa — el audio se convierte via `ffmpeg` subprocess)
- `validate_job_payload` valida que el mensaje de la queue sea `{ "job_id": "..." }`
- `constants.py` define `JobStatus`, `ProcessingStep`, `ErrorCode`, `ACTOR_TYPE`

---

## Azure Function — Capa de base de datos

**Archivos:** `shared/database/db_client.py`, `shared/database/job_repository.py`

- `db_client.py`: pool de conexiones psycopg2 (`ThreadedConnectionPool`), `query_function` y `call_procedure`
- `job_repository.py`: wrappers para los 4 contratos SQL del pipeline:
  - `can_process_job` → `fn_can_process_ai_job`
  - `get_stt_job_context` → `fn_get_stt_live_recording_job_context`
  - `update_job_status` → `sp_update_ai_job_status_v1`
  - `complete_stt_job` → `sp_complete_stt_live_recording_job_v1`

---

## Azure Function — Servicios de IA

**Archivos:** `shared/services/`

- `blob_service.py`: descarga audio fuente desde el contenedor `audio`; funciones auxiliares de WAV temporal en `tmp`
- `audio_service.py`: conversión a WAV 16kHz mono 16-bit PCM via `ffmpeg` en pipe (sin disco)
- `speech_service.py`: transcripción continua Azure Speech via `PullAudioInputStream` (bytes en memoria, sin disco)
- `openai_service.py`: 4 generaciones via Azure OpenAI — resumen, notas Markdown, notas JSON, mapa mental
- `prompts/`: 5 prompts — `system.md`, `summary.md`, `notes.md`, `notes_json.md`, `mind_map.md`

---

## Azure Function — Pipeline Durable Functions (orquestador + activities)

**Archivos:** `orchestrators/stt_live_recording.py`, `activities/`, `trigger/queue_trigger.py`, `function_app.py`

### Decisiones de diseño

- Patrón **Orchestrator + Activities** de Azure Durable Functions
- El orquestador `stt_live_recording` solo define el flujo — sin I/O
- Activities separadas en archivos por dominio funcional (ver R-AZURE-13)
- Cada archivo de activity tiene su propio `df.Blueprint()`
- `function_app.py` registra todos los blueprints

### Activities implementadas

| Activity | Archivo | Responsabilidad |
|---|---|---|
| `check_and_get_context` | `context_activity.py` | Guard de idempotencia + contexto del job |
| `set_job_status` | `context_activity.py` | Actualiza estado en BD (absorbe errores silenciosamente) |
| `transcribe_audio` | `transcription_activity.py` | Blob → ffmpeg → Azure Speech |
| `generate_summary_activity` | `ai_activity.py` | Resumen ejecutivo Markdown |
| `generate_notes_activity` | `ai_activity.py` | Notas en Markdown + JSON |
| `generate_mind_map_activity` | `ai_activity.py` | Mapa mental JSON |
| `complete_job_activity` | `completion_activity.py` | Persiste resultado (retry x3) |

### Correcciones aplicadas

- `check_and_get_context` extrae solo los 3 campos necesarios (`blob_url`, `audio_format`, `language_locale`) y los convierte a `str` explícitamente — evita que tipos `UUID`/`datetime` de psycopg2 rompan la serialización JSON de Durable Functions
- Eliminado `upload_tmp_wav` / `delete_tmp_wav` del pipeline de transcripción — `transcribe_wav_bytes` usa bytes en memoria via `PullAudioInputStream`, el blob tmp era overhead innecesario
- `queue_trigger.py` usa `"stt_live_recording"` como nombre del orquestador (coincide con el nombre de la función Python)

---

## API — Endpoints de resultado

**Archivos:** `App/API/src/repositories/job.repository.js`, `speech.controller.js`, `speech_routes.js`

### GET /AIServices/Speechv2/jobs/:job_id/status

Ya estaba implementado. Consulta `vw_ai_job_current_status WHERE job_id=$1 AND requested_by=$2`.

### GET /AIServices/Speechv2/jobs/:job_id/result (nuevo)

Consulta `vw_stt_recording_result WHERE job_id=$1 AND user_id=$2`.

**Respuestas:**
- `404 JOB_NOT_FOUND` — el job no existe o no pertenece al usuario
- `409 RESULT_NOT_READY` — el job existe pero `result_id` es NULL (aún en procesamiento)
- `200` — resultado completo con `transcription_text`, `summary_text`, `notes_text`, `notes_json`, `mind_map_json`

---

## Reglas agregadas

**Archivo:** `App/rules/azure.md`

| Regla | Contenido |
|---|---|
| R-AZURE-12 | El pipeline de IA usa Durable Functions — Orchestrator + Activities |
| R-AZURE-13 | Cada activity vive en su propio archivo bajo `activities/` (un archivo por dominio) |
| R-AZURE-14 | `function_app.py` es el único punto de registro de blueprints |
| R-AZURE-15 | Los valores entre orquestador y activities deben ser JSON-safe (str, int, float, bool, list, dict, None) |

---

## Documentación actualizada

- `CLAUDE.md` raíz: estructura de `procesamiento/` expandida, estado de features actualizado
- `App/procesamiento/CLAUDE.md`: lenguaje y modelo de ejecución, estructura de archivos, flujo con Durable Functions

---

## Mobile — Visualización y descarga de resultados STT

**Archivos creados:** `src/components/JobOptionsModal.jsx`, `src/screens/NoteDetailScreen.jsx`, `src/screens/NoteDetailScreen.styles.js`, `src/utils/pdfExport.js`

**Archivos modificados:** `src/screens/NotesScreen.jsx`, `src/utils/api.js`, `package.json`

**Dependencias nuevas:** `expo-print ~15.0.8`, `expo-sharing ~14.0.8`

### Flujo implementado

Desde la sección **Apuntes**, al tocar una fila con estado `completed`:

1. Aparece `JobOptionsModal` — bottom sheet con dos opciones
2. **Visualizar apunte** → abre `NoteDetailScreen` (Modal full-screen `pageSheet`)
   - 4 secciones colapsables: Transcripción, Resumen, Notas, Mapa Mental
   - Botón PDF en el header
   - Estado de carga, error con reintentar, manejo de `409 RESULT_NOT_READY`
3. **Descargar PDF** → llama `getJobResult` + `exportJobToPDF` directamente desde el modal de opciones

### API móvil — nuevo endpoint

`getJobResult(jobId)` en `api.js` → `GET /AIServices/Speechv2/jobs/{jobId}/result`

### PDF export (`pdfExport.js`)

- Genera HTML con las 4 secciones del resultado + mapa mental como árbol anidado
- `expo-print` convierte HTML a PDF en el dispositivo
- `expo-sharing` abre el diálogo nativo del SO para guardar/compartir

### Indicador visual en tabla

Las filas `completed` en `NotesScreen` muestran un chevron dorado (`›`) en lugar del ícono de info, indicando que son tapeables.

---

## Azure Function — Correcciones de binding (Durable Functions)

**Archivos:** `activities/context_activity.py`, `activities/transcription_activity.py`, `activities/completion_activity.py`

### Problema 1 — `input_name="data"` reservado

`data` es una propiedad interna del binding `activityTrigger` de la extensión Durable (.NET). Usarlo como `input_name` causaba error de indexing al arrancar el host:
`Can't bind parameter 'data' to type 'System.String'`.

**Fix:** renombrar a nombres descriptivos del dominio:
- `set_job_status` → `input_name="status_payload"`
- `transcribe_audio` → `input_name="audio_payload"`
- `complete_job_activity` → `input_name="completion_payload"`

### Problema 2 — Deserialización automática del SDK

El SDK Durable deserializa el JSON automáticamente antes de invocar la activity. El parámetro llega como `dict`, no como `str`. Agregar `json.loads()` causaba `TypeError: not dict`.

**Fix:** anotar los parámetros como `dict` y acceder directamente sin `json.loads()`.

---

## Azure Function — Reemplazo de ffmpeg por PyAV

**Archivos:** `shared/services/audio_service.py`, `requirements.txt`

### Problema

`audio_service.py` usaba `subprocess.run(["ffmpeg", ...])` para convertir M4A → WAV en memoria.
En entornos serverless (Azure Functions) ffmpeg no está instalado en el PATH — el proceso fallaba con `FileNotFoundError`.

### Solución descartada — binario bundleado

Incluir el binario ffmpeg en el repositorio requiere dos binarios distintos (Windows para dev local, Linux x64 para Azure), gestión de permisos ejecutables y overhead de ~80 MB en el paquete de deployment.

### Solución implementada — PyAV

`av` (PyAV) son bindings Python de FFmpeg que incluyen las librerías FFmpeg compiladas dentro del wheel. No requiere instalación de sistema, funciona igual en Windows (dev) y Linux (Azure).

**Pipeline de conversión:**
```
BytesIO(audio_bytes) → av.open (M4A/MP4) → AudioResampler (s16, mono, 16kHz) → pcm_s16le encoder → BytesIO(wav_bytes)
```

- Sin archivos temporales en disco
- Sin subprocess, sin PATH, sin permisos
- Manejo de errores via `av.AVError`
- Validación de salida: WAV válido ≥ 44 bytes (tamaño mínimo de header)
