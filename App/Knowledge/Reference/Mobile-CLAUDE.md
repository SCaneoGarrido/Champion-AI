> Espejo verbatim de `App/Mobile/CLAUDE.md`. Sincronizado automáticamente por la skill
> `sync-knowledge-vault` — no editar a mano, editar la fuente y re-ejecutar la skill.

---

# Champion AI — App Móvil (React Native / Expo)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

## Dirección de producto (Roadmap)

La interfaz principal **ya no es una vista Markdown / pantallas separadas de resultado** — es el
**Knowledge Workspace**: una superficie única donde el usuario consume audio, resumen, notas y
mapa mental integrados (EPIC V1, cerrado 2026-08-10 — ver `App/Knowledge/Roadmap/EPICS.md` y
`App/Knowledge/ADR/ADR-014-knowledge-workspace-versioning.md`).

`src/screens/KnowledgeWorkspaceScreen.jsx` es la superficie de producción real ("Knowledge
Workspace V1"), servida por la ruta `KnowledgePackViewer`. Un intento previo de superficie de
presentación (Markdown/LaTeX/Mermaid) se había implementado y revertido por completo por bugs
visuales en mobile — el Workspace se construyó con ese aprendizaje incorporado (componentes
encapsulados y probados antes de integrarse), y de hecho encontró bugs reales de renderizado en el
camino que se corrigieron sin necesitar otro rollback (ver
`App/Knowledge/ADR/ADR-013-math-rendering-pipeline-rewrite.md`). Ver `App/Knowledge/Bugs/known-issues.md`.

Existe además una sección **Beta** permanente (ruta `KnowledgeWorkspaceBeta`, mismo componente por
ahora) — punto de entrada oficial para probar la próxima iteración (V2 Topics, V4 narración/TTS...)
antes de promoverla a la ruta estable. Ver ADR-014.

## Responsabilidad de este componente

La app móvil es la interfaz de usuario del sistema. Su única responsabilidad es:

1. Capturar o seleccionar audio del dispositivo
2. Coordinar el flujo de subida y procesamiento con la API
3. Mostrar el resultado al usuario

**No contiene lógica de negocio. No conoce Azure. No conoce PostgreSQL. No ejecuta IA.**

## Lo que la app sí conoce

- Los endpoints de la Champion API (HTTP + JWT)
- El protocolo de subida directa a Azure Blob via SAS URL
- El patrón de polling para consultar el estado de un job
- El contrato de respuesta `{ success, data, error }`

## Lo que la app no conoce ni debe conocer

- Azure Queue Storage (nunca publica mensajes)
- Azure Functions (no sabe que existen)
- PostgreSQL (no tiene acceso directo a la BD)
- Los modelos de IA que se usan internamente
- El estado interno del pipeline de procesamiento (solo ve: queued/processing/completed/failed)

## Arquitectura del componente

**Framework:** React Native con Expo

El estado de la aplicación debe reflejar el estado del servidor (los jobs son la fuente de verdad en PostgreSQL). No existe estado local de procesamiento independiente del servidor.

## Flujo completo que la app orquesta

```
1. Register / Login → obtener access_token (JWT)

2. POST /API/v1/AIServices/Speechv2/init { format }
   → recibe { job_id, upload_url, expires_in }

3. PUT {upload_url} con headers:
   x-ms-blob-type: BlockBlob
   Content-Type: audio/{formato}
   → sube el audio DIRECTAMENTE a Azure Blob (no pasa por la API)

4. POST /API/v1/AIServices/Speechv2/SpeechToTextv2 {
     req_info: { job_id, service, feature, flow, language_info },
     audio_info: { format, sample_rate, duration_seconds, blob_url }
   }
   → recibe 202 { job_id, polling_url }

5. Polling: GET /API/v1/AIServices/Speechv2/jobs/{job_id}/status
   → repetir hasta status = "completed" o "failed"

6. GET /API/v1/AIServices/Speechv2/jobs/{job_id}/result
   → recibe { transcription, summary, notes, mind_map }
```

## Consumo de la API

### Autenticación

Todos los endpoints protegidos requieren:
```
Authorization: Bearer {access_token}
```

El token se obtiene en `POST /API/v1/AUTH/login` (devuelve `access_token` + `refresh_token`). La app **no debe enviar `user_id`** en ningún payload: el backend lo extrae del JWT.

### Refresh de token — `src/utils/authFetch.js`

Interceptor HTTP único: ante un `401`/`TOKEN_EXPIRED`, llama `POST /API/v1/AUTH/refresh` con el
`refresh_token` guardado en sesión (`session.js`), obtiene un `access_token` nuevo y **reintenta la
petición original de forma transparente** — el resto de la app no ve el 401. Si el refresh también
falla (refresh token vencido), recién ahí limpia la sesión y redirige a login. Usa un mutex
(`_refreshPromise`) para que, si varias requests fallan en simultáneo, todas compartan un único
refresh en curso en vez de disparar uno por request.

### Manejo de respuestas

Todas las respuestas siguen el envelope estándar:
```json
{ "success": true|false, "data": <objeto|null>, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." }|null }
```

La app tiene un interceptor HTTP único (`authFetch.js`) para manejar errores por `error.code`:

| Código | Acción real |
|---|---|
| `TOKEN_EXPIRED` | Refresh transparente + reintento (ver arriba); redirect a login solo si el refresh también falla |
| `UNAUTHORIZED` | Mostrar error de credenciales |
| `QUEUE_SEND_FAILED` | Ofrecer opción de reintento |
| `NOT_FOUND` | Mostrar que el job no existe |

### Validaciones que hace la API (no duplicar en el cliente)

| Campo | Restricción |
|---|---|
| `audio.format` | `webm \| mp4 \| m4a \| mp3 \| wav \| ogg` |
| `sample_rate` | `8000 \| 16000 \| 44100 \| 48000` |
| `duration_seconds` | Entre 1 y 10800 (3 horas) |
| `blob_url` | Presente y no expirada |

## Estrategia de polling

```
1. Esperar N segundos antes del primer poll
2. GET /jobs/{job_id}/status
3. Si "processing" → esperar y repetir
4. Si "completed" → ir a paso 5
5. Si "failed"    → mostrar error_code al usuario
6. GET /jobs/{job_id}/result → mostrar resultados
```

El intervalo de polling no está documentado en la arquitectura. No existe WebSocket ni push notification en el sistema actual.

## Upload directo a Azure Blob

La app hace `PUT` directamente a la `upload_url` recibida en el paso `/init`.

```
PUT {upload_url}
Headers:
  x-ms-blob-type: BlockBlob
  Content-Type: audio/{formato}
Body: [binario del audio]
```

La URL expira en **3600 segundos**. Si expira antes de que el usuario suba el audio, el flujo debe reiniciarse desde `/init`.

La API no valida que el audio exista en Blob antes de crear el job — la app debe garantizar que el upload fue exitoso (respuesta 201 de Azure Blob) antes de llamar a `SpeechToTextv2`.

## Reglas de UI

- La complejidad técnica (queues, procesamiento, IA) queda completamente oculta al usuario
- El usuario ve tres pasos: cargar contenido → procesar → obtener resultado
- El estado de procesamiento se muestra como: `queued` (en cola) / `processing` (procesando) / `completed` (listo) / `failed` (error)
- El `current_step` puede usarse para mostrar progreso más granular (transcripción → resumen → notas → mapa mental)

## Navegación interna: manager ("Mis Apuntes") ↔ viewer

"Mis Apuntes" (`src/screens/NotesScreen.jsx`) es el **administrador de Knowledge Packs**: lista,
estado, y — vía `JobOptionsModal` — las acciones de administración: `Knowledge Workspace` (abre el
viewer), `Editar` (renombrar + reprocesar un step con instrucciones propias) y `Eliminar` (soft
delete). Para un job fallido, el menú muestra `Reintentar` + `Eliminar`. No es dueño de la pantalla
que muestra el resultado — la relación entre ambos está desacoplada vía navegación, no vía
composición de componentes. Ver
`App/Knowledge/ADR/ADR-009-mobile-navigation-manager-viewer-seam.md` para el razonamiento de la
navegación y `App/Knowledge/ADR/ADR-010-knowledge-pack-lifecycle-actions.md` para Editar/Eliminar.

- La ruta `KnowledgePackViewer` está registrada en el `Stack.Navigator` raíz (`App.jsx`), como
  hermana de `Main` y `SpeechToText` — no anidada dentro del tab `Notes`.
- `NotesScreen.jsx` **nunca** debe importar ni acoplarse a la implementación concreta del viewer.
  Solo navega: `navigation.navigate('KnowledgePackViewer', { jobId, blobName })`.
- Contrato de parámetros: `jobId` (obligatorio, clave opaca) + `blobName` (opcional, solo
  decorativo — el viewer nunca debe ramificar lógica sobre su presencia). El viewer es dueño de su
  propio fetch de datos vía `getJobResult(jobId)`.
- La ruta `KnowledgePackViewer` apunta a `src/screens/KnowledgeWorkspaceScreen.jsx` desde el cierre
  de M1 (2026-08-10 — ver ADR-014). El swap desde `NoteDetailScreen.jsx` (legacy, se mantiene en el
  repo sin ninguna ruta activa, candidato a limpieza futura) fue exactamente el cambio de una línea
  que este seam preveía — `NotesScreen.jsx` no se tocó.
- **Gotcha de theming:** las pantallas del stack raíz viven fuera del `<ThemeProvider>` que
  `MainTabNavigator` envuelve alrededor de los tabs. `KnowledgeWorkspaceScreen` no usa `useTheme()`
  (hex hardcodeado), así que no necesita envoltura propia — si algún componente del Workspace
  empieza a usar `useTheme()`, debe auto-envolverse en su propio `<ThemeProvider>` en `App.jsx`
  (mismo patrón que `SpeechToTextWithTheme`), o fallará en tiempo de ejecución.

## Acciones de administración de un Knowledge Pack (Editar / Eliminar)

Componentes en `src/components/`, todos orquestados por `NotesScreen.jsx` (nunca se importan entre
sí — mismo patrón atomizado que `JobOptionsModal`):

- **`ConfirmDialog.jsx`** — diálogo de confirmación genérico y reutilizable (`title`, `message`,
  `confirmLabel`, `destructive`, `loading`, `onConfirm`, `onCancel`). Usado hoy para confirmar
  `Eliminar`; reutilizable para cualquier acción destructiva futura.
- **`EditJobModal.jsx`** — abierto por `Editar`. Contiene el campo de renombrado (llama
  `patchJobName` directo) y la lista de steps reprocesables (`Resumen` / `Notas` / `Mapa Mental`).
  Tocar un step cierra este modal y dispara `onPickStep(step)`.
- **`ReprocessStepModal.jsx`** — abierto tras elegir un step. Textarea opcional de instrucciones
  propias + confirmación → llama `reprocessJobStep(jobId, step, customInstructions)`. Al enviarse,
  el job vuelve a `queued` — el usuario lo ve reflejado en el badge de estado de la lista tras el
  siguiente `load()`.
- `Eliminar` es soft delete (`deleteJob(jobId)`) — el job desaparece de la lista tras refrescar; no
  hay acción de "restaurar" en la UI (ver ADR-010).

`Descargar PDF` ya no está en `JobOptionsModal` — el viewer (`KnowledgeWorkspaceScreen`) tiene su
propio botón de PDF en el header; `pdfExport.js` no se duplica.

## Notificaciones de job terminado

`src/hooks/useJobCompletionNotifier.js`, montado una sola vez en `MainTabNavigator.jsx` (recibe
`navigation` como prop de su `Stack.Screen` padre — no importa `navigationRef` desde `App.jsx`,
evita el import circular que `authFetch.js` ya evita con su patrón de handler registrado). Hace
polling de `getRecentJobs` cada 15s mientras la app está en primer plano y dispara una notificación
local (`expo-notifications`, sin push del servidor) la primera vez que detecta que un job propio
pasó de `queued`/`processing` a `completed`/`failed` — cualquier tipo de solicitud (grabación
nueva, retry, reprocesamiento de un step), mismo mecanismo. Ver
`App/Knowledge/ADR/ADR-011-local-job-completion-notifications.md`: no funciona con la app cerrada
(eso requeriría push real, explícitamente diferido — no hay EAS ni credenciales Apple/Firebase en
el proyecto hoy).

Cada transición detectada también se registra en `NotificationsContext`
(`src/context/NotificationsContext.jsx` — `useNotifications()`, mismo patrón estricto que
`useTheme()`, lanza si se usa fuera de `NotificationsProvider`). `AppTopBar.jsx` muestra un badge
rojo "!" superpuesto al avatar cuando hay notificaciones no vistas; tocarlo abre
`NotificationsPanel.jsx` (lista de recientes, navega a "Mis Apuntes" al tocar un item) y marca todo
como visto. El avatar en sí sigue navegando a Profile sin cambios — el badge es un touchable
separado. `MainTabNavigator` necesitó reestructurarse (`TabsWithJobNotifier` como componente
interno) porque un componente no puede consumir un contexto que él mismo declara — el hook que
llama `useNotifications()` debe renderizarse como hijo de `NotificationsProvider`, no en el mismo
nivel.

`NotesScreen` además hace un refresco silencioso (sin spinner) cada 8s mientras tiene foco —
antes solo refrescaba al reenfocar la pantalla, así que el estado/step de un job en curso no se
actualizaba si el usuario se quedaba mirando la lista.

## Subida de audio en segundo plano (grabar en vivo / subir archivo)

`src/context/UploadManagerContext.jsx` — `useUploadManager()`, montado en la **raíz de `App.jsx`**
(envuelve todo `NavigationContainer`, no solo `MainTabNavigator` — necesario porque
`SpeechToTextScreen` es una pantalla del stack raíz, fuera del árbol de tabs; ver
`App/Knowledge/ADR/ADR-012-background-upload-manager.md`). Owns una lista de tareas de subida en
memoria; la subida (`uploadBlobInChunks` + `submitSTTJob`) corre ahí, no en el componente de la
pantalla — sobrevive a que el usuario navegue a otra sección. `UploadStatusBar.jsx`, también
montado una sola vez en `App.jsx` como overlay sobre `NavigationContainer`, muestra el progreso sin
importar el tab activo.

`useLiveSTTRecorder.js`: `stop()` (que antes hacía todo: detener mic + subir + enviar) se partió en
`stopRecording()` (solo detiene el mic) y `confirmAndUpload(name)` / `discardRecording()`. Entre
ambas se muestra `ConfirmUploadModal.jsx` — pide nombre obligatorio antes de cualquier llamada de
red, no después. El mismo modal lo usa `AudioFileUploader.jsx` (pestaña "Subir"), que además se
migró del pipeline legado (`submitRecordingToSpeechPipeline`, un solo PUT) al mismo pipeline que
`LiveSTTRecorder` (`initSTTJob` + `uploadBlobInChunks` + `submitSTTJob`) — un solo pipeline de
subida para ambas entradas.

**Límite conocido** (igual que las notificaciones locales, ADR-011): esto sobrevive a la
navegación dentro de la app, no a que el proceso se cierre — no hay background fetch nativo ni
persistencia entre reinicios. Requeriría la misma infraestructura EAS ya diferida.

## Restricciones de desarrollo

- No agregar lógica de negocio en la app — si hay duda, va a la API
- No hardcodear `user_id` — siempre viene del JWT via la API
- No almacenar resultados de procesamiento localmente como fuente de verdad — siempre consultar la API
- No llamar directamente a Azure ni a PostgreSQL
- No asumir que el job existe después de un `202 Accepted` — el job puede fallar antes de llegar a la queue
