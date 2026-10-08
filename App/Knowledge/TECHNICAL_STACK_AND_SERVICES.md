# Technical Stack and Services — Champion AI

tags: #technical #stack #services #database #endpoints #rag-index

> Ficha técnica detallada. Complementa a [[00_PROJECT_OVERVIEW]] (visión global) con el detalle de
> librerías, patrones de diseño, modelo de datos, integraciones externas y flujos de procesamiento
> de audio.

---

## 1. Backend — Node.js / Express (`App/API`)

### 1.1 Datos generales

| Propiedad | Valor |
|---|---|
| Runtime | Node.js, módulos CommonJS (`"type": "commonjs"`) |
| Framework HTTP | Express `^5.2.1` |
| Puerto | `5051` (configurable via `.env`) |
| Entry point | `src/index.js` |

### 1.2 Librerías clave (`package.json`)

| Librería | Versión | Uso |
|---|---|---|
| `express` | `^5.2.1` | Framework HTTP y ruteo |
| `express-rate-limit` | `^8.5.2` | Rate limiting de endpoints |
| `jsonwebtoken` | `^9.0.3` | Emisión y verificación de JWT |
| `bcrypt` | `^6.0.0` | Hash de contraseñas |
| `pg` | `^8.17.1` | Driver PostgreSQL (queries y llamadas a Stored Procedures) |
| `prisma` | `^7.2.0` (devDependency) | ORM presente en dependencias — sin evidencia de uso activo en el flujo STT, que opera vía SPs con `pg` directo |
| `@azure/storage-blob` | `^12.29.1` | Generación de SAS URL y acceso a Azure Blob Storage |
| `@azure/storage-queue` | `^12.28.1` | Publicación de mensajes en Azure Queue Storage |
| `@azure/identity` | `^4.13.0` | Autenticación contra servicios Azure |
| `@azure/cosmos` | `^4.9.2` | Cliente Cosmos DB (`cosmosdb_service.js` — uso fuera del flujo STT documentado) |
| `microsoft-cognitiveservices-speech-sdk` | `^1.47.0` | SDK legado de Azure Speech (reemplazado por Fast Transcription REST API en el pipeline actual de la Function) |
| `@azure-rest/ai-vision-image-analysis` | `^1.0.0-beta.3` | Azure AI Vision — feature de visión (`vision.controller.js`, fuera del alcance de STT) |
| `multer` | `^2.0.2` | Manejo de multipart/form-data |
| `axios` / `node-fetch` | `^1.13.2` / `^3.3.2` | Clientes HTTP salientes |
| `cors` | `^2.8.5` | Política CORS |
| `morgan` | `^1.10.1` | Logging de requests HTTP |
| `winston` | `^3.19.0` | Logging estructurado de aplicación |
| `uuid` | `^13.0.0` | Generación de IDs (`job_{uuid}`) |
| `mongodb` / `mongoose` | `^7.0.0` / `^9.1.2` | Presentes en dependencias — sin evidencia de uso en el dominio STT (PostgreSQL es la fuente de verdad del pipeline) |
| `dotenv` | `^17.2.3` | Carga de variables de entorno |

### 1.3 Estructura de carpetas (`src/`)

| Carpeta | Contenido |
|---|---|
| `controllers/` | `auth.controller.js`, `speech.controller.js`, `user.controller.js`, `vision.controller.js`, `health.controller.js` |
| `routes/` | `auth_routes.js`, `speech_routes.js`, `user_routes.js`, `vision_routes.js`, `transversal_routes.js` |
| `middleware/` | `jwtMiddleware.js`, `validateSTTRequest.js`, `validateUserMatch.js`, `validateAudio.js`, `multerMiddleware.js` |
| `services/` | `auth_service.js`, `azure_storage_service.js`, `speech_services.js`, `database_service.js`, `cosmosdb_service.js`, `vision_services.js`, `health_service.js` |
| `repositories/` | `job.repository.js`, `user.repository.js` — capa de acceso a datos (llamadas a SPs/vistas) |
| `models/` | `base_job_model.js`, `queue_msg_model.js`, `trace_model.js` |
| `helpers/` | `auth_helpers.js`, `speech_helpers.js`, `vision_helpers.js` |
| `utils/` | `response.helper.js` (envelope estándar), `constants.js`, `logger.js`, `file_manager.js`, `getLocalIP.js`, `util.js` |

### 1.4 Patrones de diseño aplicados

- **Capas separadas por responsabilidad**: `routes` (definición de endpoints) → `middleware`
  (validación/autenticación) → `controllers` (orquestación del request) → `services` (lógica de
  integración externa) → `repositories` (acceso a datos vía Stored Procedures/vistas).
- **Middleware chain para validación**: `jwtMiddleware` → `validateUserMatch` →
  `validateSTTRequest` / `validateAudio` antes de llegar al controller — la validación nunca vive
  dentro del controller.
- **Response envelope centralizado**: `utils/response.helper.js` es el único punto que construye
  `{ success, data, error }`, evitando respuestas inconsistentes entre controllers.
- **Repository pattern**: `job.repository.js` encapsula las llamadas SQL (SPs y vistas) — los
  controllers nunca ejecutan SQL directamente.
- **Fail-fast en el encolado**: si `azure_storage_service` (queue) falla al publicar, el controller
  marca el job como `failed` vía `sp_update_ai_job_status_v1` antes de responder al cliente.

---

## 2. App Móvil — React Native / Expo (`App/Mobile`)

### 2.1 Datos generales

| Propiedad | Valor |
|---|---|
| Framework | React Native `0.81.5` |
| Toolchain | Expo `~54.0.0` |
| React | `19.1.0` |
| Entry point | `index.js` → `App.jsx` |

### 2.2 Librerías clave (`package.json`)

| Librería | Versión | Uso |
|---|---|---|
| `@react-navigation/native` + `native-stack` + `bottom-tabs` | `^7.x` | Navegación (stack raíz + tabs principales) |
| `expo-av` | `~16.0.8` | Grabación y reproducción de audio — incluye el reproductor integrado del Knowledge Workspace (`AudioPlayer.jsx`) |
| `expo-file-system` | `~19.0.21` | Manejo de archivos locales antes del upload |
| `expo-document-picker` / `expo-image-picker` | `~14.0.8` / `~17.0.10` | Selección de archivos existentes |
| `expo-notifications` | `~0.32.17` | Notificaciones locales del SO (job completado) |
| `expo-print` / `expo-sharing` | `~15.0.8` / `~14.0.8` | Exportación y compartición de PDF |
| `expo-linear-gradient` | `~15.0.8` | UI — gradientes de tema |
| `expo-screen-orientation` | `~9.0.9` | Rotación forzada a landscape del mind map (`MindMapScreen.jsx`) — config plugin declarado en `app.json` |
| `react-native-markdown-display` | `^7.0.2` | Renderizado Markdown del Knowledge Workspace (`RichMarkdown.jsx`), extendido con una regla custom de markdown-it para LaTeX (`mathMarkdownRule.js`) |
| `react-native-webview` | `13.15.0` | Único uso: `MathView.jsx` — renderiza una fórmula LaTeX por instancia vía KaTeX (CDN), nunca el documento completo. Ver [[ADR-013-math-rendering-pipeline-rewrite]] |
| `@react-native-async-storage/async-storage` | `2.2.0` | Persistencia local (token de sesión, preferencias) |
| `react-native-reanimated` | `~4.1.1` | Animaciones (tab bar animado) |
| `react-native-safe-area-context` / `react-native-screens` | `~5.6.0` / `~4.16.0` | Soporte nativo de navegación |

### 2.3 Estructura de carpetas (`src/`)

| Carpeta | Contenido relevante |
|---|---|
| `screens/` | `LoginScreen`, `SignUpScreen`, `DashboardScreen`, `NotesScreen` (manager de Knowledge Packs), `KnowledgeWorkspaceScreen` (viewer de producción, ruta `KnowledgePackViewer`/`KnowledgeWorkspaceBeta` — ver [[ADR-014-knowledge-workspace-versioning]]), `MindMapScreen` (bloques del Workspace, fuerza landscape), `SpeechToTextScreen`, `ProfileScreen`, `SettingsScreen`, `ServicesScreen`. `NoteDetailScreen` sigue en el repo pero **sin ninguna ruta activa** desde el cierre de M1 — código muerto, candidato a limpieza futura |
| `components/` | `LiveSTTRecorder`, `AudioFileUploader`, `AudioRecorder`, `JobOptionsModal`, `EditJobModal`, `ReprocessStepModal`, `ConfirmDialog`, `ConfirmUploadModal`, `UploadStatusBar`, `NotificationsPanel`, `AppTopBar` |
| `components/workspace/` | `AudioPlayer` (reproductor integrado, confirmación antes de cargar), `FloatingToolbar` (FAB del reader), `ReaderCard` (paginación por sección), `RichMarkdown` + `mathMarkdown`/`mathMarkdownRule` (pipeline Markdown+LaTeX propio), `MathView` (WebView aislado por fórmula, KaTeX), `MindMapDiagram` (árbol nativo, reutiliza `RichMarkdown`), `AIQuoteCard`, `ImageCard` |
| `context/` | `ThemeContext.jsx`, `NotificationsContext.jsx`, `UploadManagerContext.jsx` |
| `hooks/` | `useLiveSTTRecorder.js`, `useJobCompletionNotifier.js`, `useThemedStyles.js`, `useThemedScreenStyles.js`, `useTopBarStyle.js`, `useToast.js` |
| `navigation/` | `MainTabNavigator.jsx` |
| `utils/` | `api.js` (incluye `getJobStreamUrl`), `authFetch.js`, `speechApi.js`, `session.js`, `pdfExport.js`, `validation.js`, `workspaceMapper.js` (mapea `notes_json`/`mind_map_json` a las secciones del Workspace, incluye `formatExample()` para `examples[]` con shape mixto string/objeto) |
| `theme/` | `appTheme.js`, `screenThemeMerges.js` |

### 2.4 Patrones de diseño aplicados

- **Contextos como fuente única de estado transversal**: `ThemeProvider`, `NotificationsProvider` y
  `UploadManagerProvider` envuelven la navegación en `App.jsx`; los componentes consumen vía hooks
  (`useTheme()`, `useNotifications()`, `useUploadManager()`) que lanzan error si se usan fuera de
  su provider — mismo contrato estricto en los tres.
- **Separación manager/viewer desacoplada por navegación, no por composición**: `NotesScreen.jsx`
  (administra la lista de Knowledge Packs) nunca importa la implementación del viewer
  (`KnowledgeWorkspaceScreen.jsx` desde el cierre de M1, antes `NoteDetailScreen.jsx`) — solo navega
  con `navigation.navigate('KnowledgePackViewer', { jobId, blobName })`. Ver
  `App/Knowledge/ADR/ADR-009-mobile-navigation-manager-viewer-seam.md` y
  `App/Knowledge/ADR/ADR-014-knowledge-workspace-versioning.md`.
- **Pipeline de renderizado Markdown+LaTeX propio, no una dependencia externa de LaTeX**: en vez de
  un preprocesador regex, `mathMarkdownRule.js` registra una regla real de `markdown-it` (tokens
  `math_inline`/`math_block`, con `token.block = true` explícito — el mismo mecanismo que la
  librería usa internamente para `image`/`hardbreak` — para que la fórmula reserve su propio espacio
  de layout en vez de quedar mezclada dentro de un `<Text>`). Ver
  `App/Knowledge/ADR/ADR-013-math-rendering-pipeline-rewrite.md`.
- **Subida de audio desacoplada del componente de pantalla**: la lógica de upload
  (`uploadBlobInChunks` + `submitSTTJob`) vive en `UploadManagerContext`, no en la pantalla, para
  sobrevivir a la navegación del usuario. Ver
  `App/Knowledge/ADR/ADR-012-background-upload-manager.md`.
- **Polling generalizado, no solo por pantalla**: `useJobCompletionNotifier` hace polling cada 15s
  en segundo plano (mientras la app está en primer plano) para disparar notificaciones locales,
  independiente del polling específico de una pantalla de detalle.
- **Componentes atomizados y reutilizables**: `ConfirmDialog.jsx` es genérico y se reutiliza para
  cualquier acción destructiva (hoy: eliminar Knowledge Pack).
- **Interceptor único de errores HTTP**: `authFetch.js` centraliza el manejo de `error.code` del
  envelope estándar (p. ej. `TOKEN_EXPIRED` → redirect a login).

### 2.5 Lo que la app explícitamente NO conoce

- Azure Queue Storage, Azure Functions, PostgreSQL — no tiene acceso directo a ninguno.
- El estado interno del pipeline de IA — solo ve `queued / processing / completed / failed` y,
  opcionalmente, `current_step`.

---

## 3. Procesamiento serverless — Azure Function / Python (`App/procesamiento`)

### 3.1 Datos generales

| Propiedad | Valor |
|---|---|
| Lenguaje | Python |
| Modelo de ejecución | Azure Durable Functions — patrón Orchestrator + Activities |
| Trigger | Azure Queue Storage — cola `championaiqueue` |
| Entry point | `function_app.py` (registra todos los blueprints) |

### 3.2 Librerías clave (`requirements.txt`)

| Librería | Versión | Uso |
|---|---|---|
| `azure-functions` | `1.24.0` | Runtime de Azure Functions |
| `azure-functions-durable` | `1.5.0` | Orquestador Durable (Orchestrator + Activities) |
| `azure-storage-blob` | `12.30.0` | Descarga de audio desde Azure Blob |
| `azure-cognitiveservices-speech` | `1.50.0` | SDK de Azure Speech (histórico; el pipeline actual usa la REST API de Fast Transcription) |
| `azure-core` | `1.41.0` | Base común de SDKs de Azure |
| `openai` | `2.44.0` | Cliente de Azure OpenAI (`gpt-5-mini`) |
| `psycopg2-binary` | `2.9.12` | Driver PostgreSQL — conexión directa desde la Function |
| `requests` | `2.34.2` | Llamadas HTTP a Fast Transcription REST API |
| `pydantic` | `2.13.4` | Validación de estructuras de datos |
| `httpx` / `aiohttp` | `0.28.1` / `3.14.1` | Clientes HTTP (sync/async) |

### 3.3 Estructura de carpetas

| Carpeta | Contenido |
|---|---|
| `orchestrators/` | `stt_live_recording.py` — orquestador Durable, solo flujo, sin I/O directo |
| `activities/` | `context_activity.py`, `transcription_activity.py`, `ai_activity.py`, `completion_activity.py` — una activity por dominio funcional |
| `trigger/` | `queue_trigger.py` — arranca `stt_live_recording` desde el mensaje de la cola |
| `shared/database/` | `db_client.py` (pool de conexiones PostgreSQL), `job_repository.py` (wrappers de SPs/functions) |
| `shared/services/` | `blob_service.py`, `speech_service.py` (Fast Transcription), `openai_service.py` (gpt-5-mini) |
| `shared/utils/` | `constants.py` (`JobStatus`, `ProcessingStep`, `ErrorCode`, `ACTOR_TYPE`) |
| `prompts/` | `system.md`, `summary.md`, `notes.md`, `notes_json.md`, `mind_map.md` — prompts versionados como archivos Markdown |

### 3.4 Patrones de diseño aplicados

- **Orchestrator + Activities (Durable Functions)**: el orquestador solo define la secuencia de
  pasos; cada activity es una función pura con su propio I/O (BD, Blob, Azure AI), permitiendo
  reintentos independientes por paso.
- **Smart retry vía persistencia incremental**: cada activity exitosa persiste su resultado parcial
  con `sp_save_stt_partial_result_v1` (COALESCE upsert). Un retry solo reprocesa desde el paso que
  falló, sin repetir llamadas ya exitosas a Azure Speech / Azure OpenAI.
- **Doble guardia de idempotencia**: `fn_can_process_ai_job` descarta silenciosamente jobs ya
  `completed`/`failed` (primera línea); los SPs con `ON CONFLICT DO UPDATE` son la segunda línea
  ante redelivery de Azure Queue.
- **Prompts como archivos versionables**: los prompts de `gpt-5-mini` viven en `prompts/*.md`
  separados del código, permitiendo iterarlos sin tocar la lógica de las activities.
- **Reprocesamiento parcial reutiliza el mismo mecanismo de smart retry**: al reencolar
  `{ job_id }` para reprocesar un solo step (`summary`, `notes` o `mind_map`), el orquestador relee
  `stt_recording_result`, sirve desde caché los campos ya presentes y regenera solo el campo que
  quedó en `NULL` — no requiere un tipo de mensaje de cola distinto.

### 3.5 Pipeline de procesamiento (secuencia de activities)

```
queue_trigger.py
  → check_and_get_context(job_id)          [fn_can_process_ai_job + fn_get_stt_live_recording_job_context]
  → set_job_status(processing/transcription)
  → transcribe_audio(...)                  [blob_service + speech_service — Fast Transcription REST API]
  → set_job_status(processing/summary)
  → generate_summary_activity(...)         [openai_service — gpt-5-mini]
  → set_job_status(processing/notes)
  → generate_notes_activity(...)           [openai_service — gpt-5-mini]
  → set_job_status(processing/mind_map)
  → generate_mind_map_activity(...)        [openai_service — gpt-5-mini]
  → complete_job_activity(...)             [sp_complete_stt_live_recording_job_v1, retry x3 / 5s]
```

Cualquier error en un paso → `sp_update_ai_job_status_v1(status='failed', error_code=...)`, sin
relanzar la excepción (el mensaje de cola no se reintenta a nivel de Azure Queue).

**Próximo paso planificado (EPIC V2 — Intelligent Study):** `transcript_cleanup` (GPT-5) entre
`transcription` y `summary`, para limpiar artefactos de voz antes de generar contenido.

---

## 4. Base de datos — PostgreSQL 17.10

### 4.1 Configuración

| Propiedad | Valor |
|---|---|
| Motor | PostgreSQL `17-alpine` (imagen Docker) |
| Base de datos | `champion_db` |
| Usuario | `champion_db_user` |
| Puerto interno del contenedor | `5432` |
| Extensión | `pgcrypto` (para `gen_random_uuid()`) |
| Orquestación | `docker-compose.yml` en la raíz de `App/`, init SQL en `App/docker/postgres/init.sql` |

### 4.2 Modelo de entidades principales

| Tabla | Propósito |
|---|---|
| `sec_user` | Identidad del usuario (email único case-insensitive, perfil) |
| `sec_user_password` | Credenciales con historial — solo una password `is_active = true` por usuario |
| `ai_job` | Job de procesamiento — estado actual (`queued\|processing\|completed\|failed`) |
| `ai_job_status_history` | Historial inmutable de transiciones — un único `is_current = TRUE` por job |
| `stt_recording` | Metadata del audio subido (formato, sample rate, duración, blob) |
| `stt_recording_result` | Resultado consolidado del pipeline de IA (transcripción, resumen, notas, mapa mental) |

Relaciones: `sec_user 1—N ai_job`, `ai_job 1—N ai_job_status_history`, `ai_job 1—1 stt_recording`,
`stt_recording 1—1 stt_recording_result` (todas en cascada — `CASCADE DELETE`).

### 4.3 Vistas de lectura

| Vista | Consumida por | Propósito |
|---|---|---|
| `vw_ai_job_current_status` | `GET /jobs/{id}/status` | Estado actual del job + último registro de historial |
| `vw_stt_recording_result` | `GET /jobs/{id}/result` | Resultado completo del job STT (con `LEFT JOIN` a resultado, aún si está en `processing`) |

### 4.4 Stored Procedures y Functions

| Objeto | Tipo | Ejecutado por | Propósito |
|---|---|---|---|
| `sp_create_stt_live_recording_job_v1` | SP | Backend API | Crea atómicamente `ai_job` + `ai_job_status_history` + `stt_recording` (idempotente) |
| `sp_update_ai_job_status_v1` | SP | Backend API (fallo de queue) / Azure Function | Registra transición de estado/paso en historial y actualiza `ai_job` |
| `sp_complete_stt_live_recording_job_v1` | SP | Azure Function | Guarda el resultado final en `stt_recording_result` y marca `completed` |
| `sp_soft_delete_stt_job_v1` | SP | Backend API | Soft delete de un Knowledge Pack (`ai_job.is_deleted = TRUE`) |
| `sp_request_stt_step_reprocess_v1` | SP | Backend API | Anula un campo de `stt_recording_result` y reencola el job para reprocesar solo ese step |
| `fn_can_process_ai_job` | Function | Azure Function | Guard de idempotencia — rechaza jobs ya `completed`/`failed` |
| `fn_get_stt_live_recording_job_context` | Function | Azure Function | Obtiene todo el contexto del job en una sola consulta (incluye `pending_reprocess_step`) |
| `set_updated_at()` | Trigger function | — | Actualiza `updated_at` automáticamente en cada tabla |
| `sync_ai_job_from_history()` | Trigger function | — | Sincroniza `ai_job` cuando se inserta historial con `is_current = true` (red de seguridad) |

Todas las mutaciones sobre tablas de dominio pasan exclusivamente por estos objetos — **cero DML
directo** desde la Azure Function; la API solo hace DML directo en `sec_user` / `sec_user_password`
para el flujo de auth (no hay SP de registro documentado).

### 4.5 Máquina de estados de un job

```
queued → processing/transcription → processing/summary → processing/notes → processing/mind_map → completed
queued → failed                (QUEUE_SEND_FAILED, si el backend no logra publicar en la cola)
processing/{step} → failed     (error en cualquier paso de IA)
```

`completed` y `failed` son estados terminales — `fn_can_process_ai_job` los rechaza para
reprocesamiento normal (excepto vía el flujo explícito de `reprocess`, que reabre un job
`completed` a `queued` solo para el step solicitado).

---

## 5. Integraciones externas

### 5.1 Azure Blob Storage

- Estructura de paths: `audio/{user_uuid}/{job_id}/{job_id}.{formato}`.
- SAS URL generada por `POST /AIServices/Speechv2/init`, expira en `3600` segundos, permite
  únicamente `PUT` sobre el blob específico.
- Formatos soportados: `webm | mp4 | m4a | mp3 | wav | ogg` (validados también por
  `chk_stt_recording_audio_format` en BD).
- El cliente sube directo; la API nunca recibe el binario.

### 5.2 Azure Queue Storage

- Cola: `championaiqueue` — define el bounded context del servicio STT.
- Mensaje: `{ "job_id": "job_..." }` — deliberadamente mínimo.
- Garantía: at-least-once delivery → todos los SPs y functions del dominio son idempotentes.

### 5.3 Azure AI Speech — Fast Transcription REST API

| Propiedad | Valor |
|---|---|
| Endpoint | `POST https://{SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15` |
| Autenticación | Header `Ocp-Apim-Subscription-Key: {SPEECH_KEY}` |
| Formatos nativos soportados | WebM, MP3, M4A, MP4, OGG, WAV, FLAC, AAC (sin conversión previa) |
| Límites | 200 MB por archivo / 4 horas de audio máximo |
| Request | `multipart/form-data` — parte `audio` (bytes) + parte `definition` (JSON con `locales`, `profanityFilterMode`, `channels`) |
| Response | JSON con `combinedPhrases[0].text` (transcripción completa) y `phrases` (segmentos con offset/confidence) |
| Velocidad | ~10–50× real-time |
| Timeout configurado | 600 s |

### 5.4 Azure OpenAI — `gpt-5-mini`

- Modelo de razonamiento: **no acepta `temperature`** (solo el valor por defecto).
- Parámetro correcto de límite de tokens: `max_completion_tokens` (no `max_tokens`) — los tokens de
  razonamiento interno cuentan contra ese presupuesto.
- Configuración actual: `max_completion_tokens: 16384`.
- Usado en tres pasos del pipeline: `summary`, `notes` (texto + `notes_json`), `mind_map`
  (`mind_map_json`, árbol con profundidad máxima 4).
- `custom_instructions` opcional: solo se agrega al `user_message` cuando el job viene de un
  reprocesamiento parcial (`POST /jobs/{id}/reprocess`); no modifica los archivos de prompt base.

### 5.5 JWT (autenticación)

- Emitido en `POST /API/AUTH/login`, requerido en todo endpoint salvo `/register` y `/login`.
- El middleware extrae `user_id` del token — nunca se acepta un `user_id` enviado por el cliente en
  el payload.

---

## 6. Endpoints principales de la API

> Endpoint surface completo verificado contra `App/API/src/routes/*.js` en esta auditoría — incluye
> varios endpoints que no estaban documentados en ninguna fuente previa del proyecto (`/refresh`,
> `/API/USER/*`, `/download`, `/stream`, `/health`, `/version`). Detalle completo (bodies, errores)
> en [[backend-api]].

### 6.1 Autenticación (`/API/AUTH`)

| Método | Ruta | Auth | Código éxito |
|---|---|---|---|
| POST | `/register` | No | 201 |
| POST | `/login` | No | 200 — devuelve `access_token` + `refresh_token` |
| POST | `/refresh` | No (requiere `refresh_token` en body) | 200 |

### 6.2 STT — Speech to Text (`/AIServices/Speechv2`)

| Método | Ruta | Auth | Código éxito | Propósito |
|---|---|---|---|---|
| GET | `/getAvailableLenguages` | JWT | 200 | Locales soportados por Fast Transcription |
| GET | `/getVoicesByLang?lang=` | JWT | 200 | Voces disponibles por idioma (insumo de EPIC V4/TTS) |
| POST | `/init` | JWT | 201 | Genera SAS URL de subida directa a Blob |
| POST | `/SpeechToTextv2` | JWT | 202 | Crea el job (SP) y lo publica en la queue |
| GET | `/jobs` | JWT | 200 | Lista jobs recientes del usuario (`?limit=`, tope 50) |
| GET | `/jobs/stats` | JWT | 200 | Estadísticas agregadas de jobs del usuario |
| GET | `/jobs/{job_id}/status` | JWT | 200 | Polling de estado — consulta `vw_ai_job_current_status` |
| GET | `/jobs/{job_id}/result` | JWT | 200 | Resultado completo — consulta `vw_stt_recording_result` |
| GET | `/jobs/{job_id}/download` | JWT | 200 | SAS de un solo uso para descargar el audio original (`download_locks`) |
| GET | `/jobs/{job_id}/stream` | JWT | 200 | SAS reutilizable (5 min) para el reproductor integrado, sin lock |
| POST | `/jobs/{job_id}/retry` | JWT | 202 | Reintenta un job fallido |
| PATCH | `/jobs/{job_id}/name` | JWT | 200 | Renombra el Knowledge Pack (`stt_recording.blob_name`, campo descriptivo — DML directo, sin SP) |
| DELETE | `/jobs/{job_id}` | JWT | 200 | Soft delete (`sp_soft_delete_stt_job_v1`) — no borra filas ni el audio en Blob |
| POST | `/jobs/{job_id}/reprocess` | JWT | 202 | Reprocesa un step (`summary\|notes\|mind_map`) con instrucciones propias opcionales |

### 6.3 Usuario (`/API/USER`)

| Método | Ruta | Auth | Código éxito | Propósito |
|---|---|---|---|---|
| GET | `/me` | JWT | 200 | Perfil del usuario autenticado |
| PUT | `/me` | JWT | 200 | Edita perfil (valida unicidad de email si cambia) |
| POST | `/avatar/init` | JWT | 201 | SAS URL de subida directa a Blob para el avatar |

### 6.4 Transversal

| Método | Ruta | Auth | Código éxito | Propósito |
|---|---|---|---|---|
| GET | `/health` | No | 200/503 | Chequea Postgres, Azure Queue, Azure Blob |
| GET | `/version` | No | 200 | Metadata estática de la API |

### 6.5 Contrato de respuesta invariante

```json
{
  "success": true,
  "data": { "...": "..." },
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": { "code": "SCREAMING_SNAKE_CASE", "message": "Descripción legible" }
}
```

Catálogo completo de códigos de error en `App/Knowledge/Operations/error-codes.md`.

---

## 7. Flujo de procesamiento de audio (end-to-end)

```
1. App móvil: POST /API/AUTH/login → obtiene JWT
2. App móvil: POST /AIServices/Speechv2/init { format }
   → { job_id, upload_url (SAS), expires_in: 3600 }
3. App móvil: PUT {upload_url} — audio directo a Azure Blob
   Headers: x-ms-blob-type: BlockBlob, Content-Type: audio/{formato}
4. App móvil: POST /AIServices/Speechv2/SpeechToTextv2 { req_info, audio_info }
   → API valida (formato, sample rate, duración, blob_url)
   → API llama sp_create_stt_live_recording_job_v1 → job en estado queued
   → API publica { job_id } en championaiqueue
   → 202 Accepted { job_id, polling_url }
5. Azure Function (trigger de queue):
   a. fn_can_process_ai_job → guard de idempotencia
   b. fn_get_stt_live_recording_job_context → obtiene blob_url, formato, locale
   c. transcribe_audio → Fast Transcription REST API → transcription_text
   d. generate_summary_activity → gpt-5-mini → summary_text
   e. generate_notes_activity → gpt-5-mini → notes_text + notes_json
   f. generate_mind_map_activity → gpt-5-mini → mind_map_json
   g. sp_complete_stt_live_recording_job_v1 → guarda todo, status = completed
      (cada paso exitoso también persiste vía sp_save_stt_partial_result_v1 — smart retry)
6. App móvil: polling GET /jobs/{job_id}/status hasta completed | failed
7. App móvil: GET /jobs/{job_id}/result → muestra transcripción, resumen, notas, mapa mental
```

Validaciones aplicadas por la API antes de crear el job:

| Campo | Restricción |
|---|---|
| `audio.format` | `webm \| mp4 \| m4a \| mp3 \| wav \| ogg` |
| `sample_rate` | `8000 \| 16000 \| 44100 \| 48000` |
| `duration_seconds` | Entre 1 y 10800 (3 horas) |
| `blob_url` | Presente y no expirada |
| `user_id` | Debe coincidir con el del JWT |

Ver `App/Knowledge/Flows/upload-audio.md`, `stt-processing.md` y `polling.md` para el detalle
narrativo paso a paso.

---

## 8. Referencias cruzadas

- [[00_PROJECT_OVERVIEW]] — visión global del producto y arquitectura resumida
- `App/Knowledge/Architecture/` — diagramas y responsabilidades por componente
- `App/Knowledge/Database/` — esquema, vistas, SPs y functions en detalle narrativo
- `App/Knowledge/ADR/` — decisiones de arquitectura (ADR-001 a ADR-012)
- `App/API/CLAUDE.md`, `App/Mobile/CLAUDE.md`, `App/procesamiento/CLAUDE.md` — reglas por componente
