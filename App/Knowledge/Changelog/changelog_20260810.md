# Changelog — 2026-08-10

## Resumen de la sesión

Cierre completo del Milestone M1 (Knowledge Workspace): reproductor de audio integrado, mind map
en horizontal, reescritura de raíz del pipeline de renderizado matemático (tres rondas de bugfixing
real en dispositivo), paginación de Resumen, corrección de overlaps de UI, y flip de
`KnowledgePackViewer` a producción con una convención permanente de sección Beta para las próximas
iteraciones (V2 Topics, V4 narración/TTS). Además, un fix de raíz en la API para la generación de
SAS de descarga/streaming de audio.

---

## API — Descarga y streaming de audio del blob real

**Archivos:** `download.controller.js`, `download_routes.js`, `azure_storage_service.js`, `job.repository.js`

### Bug 1 — SAS generado a nivel de contenedor, no de blob

`generateSingleUseUrl` pasaba `blob_name` (snake_case) a `generateBlobSASQueryParameters`, que
espera `blobName` (camelCase) — la key no reconocida hacía que la SDK cayera al branch de SAS de
**contenedor** (`sr=c`) en vez de blob (`sr=b`), exponiendo lectura a todo el contenedor `audio` en
vez de al archivo puntual. Fix: `blobName: blob_name`.

### Bug 2 — El endpoint confiaba en el nombre visible del Knowledge Pack, no en el path real

`stt_recording.blob_name` es el nombre editable que ve el usuario en "Mis Apuntes" — no el path
real en Azure Storage (`audio/{userId}/{jobId}/{jobId}.{format}`, construido en `/init` y
persistido solo dentro de `blob_url`). El endpoint de descarga tomaba `blob_name` directo del
cliente y lo usaba como si fuera el path real → `BlobNotFound`. Fix: nuevo método
`getBlobUrlForDownload(job_id, user_id)` en `job.repository.js` (ownership-scoped por JWT) +
`getBlobPathFromUrl(blobUrl)` en `azure_storage_service.js` para extraer el path real desde la URL
guardada en BD.

### Nuevo endpoint de streaming, sin lock de un solo uso

`download_file` (descarga) usa `download_locks` — protección de un solo uso, pensada para una
futura acción de "descargar el audio original". El reproductor integrado necesita pedir la URL
repetidas veces (play/pause, reabrir la nota) — se agregó `GET /jobs/:job_id/stream` (`stream_file`
en el controller), que reutiliza la misma resolución de blob pero sin pasar por el lock. Verificado
end-to-end contra Azure real: `/stream` responde 200 dos veces seguidas con el mismo job;
`/download` sigue devolviendo 403 en la segunda llamada.

Expiración del SAS de descarga/streaming: 60s → 5 minutos (protección contra doble click, sin
relación con el SAS de 3600s del flujo de upload).

---

## Mobile — Reproductor de audio integrado

**Archivos nuevos:** `AudioPlayer.jsx`, `AudioPlayer.styles.js`
**Archivos modificados:** `utils/api.js`, `KnowledgeWorkspaceScreen.jsx`

- `getJobStreamUrl(jobId)` en `api.js`, mismo patrón que el resto de funciones del archivo.
- `AudioPlayer.jsx`: play/pause, seek táctil (sin dependencia de slider), estados de loading/error
  con reintento (pide URL nueva si el SAS de 5 min venció). Arranca en estado **idle** con una
  tarjeta de confirmación ("¿Querés escuchar el audio original?") — no carga el audio
  automáticamente al abrir el panel; decisión explícita para dejar preparado el mismo gesto de
  confirmación que va a necesitar narración/TTS (V4).
- El botón "Escuchar narración" de `KnowledgeWorkspaceScreen.jsx` (antes un stub
  `🚧 Narración en desarrollo`) ahora togglea este panel.

---

## Mobile — Mind map en horizontal

**Archivos:** `MindMapScreen.jsx`, `MindMapScreen.styles.js`, `App.jsx`, `app.json`, `package.json`

- Nueva dependencia `expo-screen-orientation` (`npx expo install`, pineada a SDK 54) + config
  plugin declarado en `app.json`.
- `MindMapScreen.jsx`: `useFocusEffect` bloquea a landscape al entrar en foco, revierte a portrait
  al salir. Gate de render (`rotating` state) hasta que `lockAsync` resuelve — evita el frame
  visible en portrait justo antes de rotar.
- `MindMapScreen` dejó de usar `presentation: 'modal'` en su `Stack.Screen` — prueba A/B para el
  bug de "no ocupa todo el espacio disponible" en landscape.

---

## Mobile — Reescritura de raíz del pipeline de renderizado matemático

**Archivos nuevos:** `mathMarkdownRule.js`, `mathMarkdown.jsx`
**Archivos modificados:** `RichMarkdown.jsx`, `MindMapDiagram.jsx`, `MathView.jsx`, `workspaceMapper.js`
**Prompts:** `system.md`, `notes_json.md`
**Ver:** `App/Knowledge/ADR/ADR-013-math-rendering-pipeline-rewrite.md` para el detalle técnico completo.

Tres rondas de bugfixing real en dispositivo, cada una encontrando una causa raíz distinta:

### Ronda 1 — sintaxis interna visible (`![inline](math://...)`, `%28`, `%29`)

El enfoque original preprocesaba texto con regex y disfrazaba LaTeX de sintaxis de imagen Markdown
para que `react-native-markdown-display` la interceptara. Reemplazado por una regla real de
markdown-it (`mathMarkdownRule.js`, tokens `math_inline`/`math_block`, sin encode/decode de URL) —
elimina la clase de bug de raíz. Incluye guardia contra falsos positivos con montos de dinero
(`$100 ... $200`) + regla equivalente en `system.md` para no usar `$` en dinero.

### Ronda 2 — ecuaciones superpuestas sobre el texto

Causa raíz en el código de `react-native-markdown-display` (`util/cleanupTokens.js`): decide
Text-inline vs. View-bloque mirando `token.block`, forzado a `true` solo para tipos `'image'`/
`'hardbreak'` por nombre hardcodeado. Nuestros tokens `math_inline`/`math_block` nunca pasaban por
ahí — quedaban anidados en `<Text>`, y un `View`/`WebView` con altura asíncrona (KaTeX vía
`postMessage`) no reflowaba el texto vecino. Fix: `token.block = true` explícito en `mathRule`,
mismo mecanismo que la librería usa para `image`. Consecuencia aceptada: una ecuación "inline" pasa
a ocupar su propia línea en vez de fluir en medio de la oración — es la única forma de que reserve
espacio sin superponerse.

### Ronda 3 — `[object Object]` en Ejemplos

Confirmado con datos reales de producción (`SELECT jsonb_typeof(e) FROM stt_recording_result,
jsonb_array_elements(notes_json->'examples') e` → 40 string, 27 object): el modelo a veces describe
un ejercicio resuelto como objeto estructurado en vez de string plano, con 10 claves distintas
usadas de forma inconsistente entre jobs. `formatExample()` en `workspaceMapper.js` detecta el
shape y renderiza cada campo presente etiquetado (Problema/Solución/Pasos/etc.) — nunca coacciona
el objeto a string. `notes_json.md` actualizado para fijar el shape esperado a futuro
(`statement`/`solution`/`notes`).

### Consistencia — mismo renderizador en Resumen, Notas y mind_map

`MindMapDiagram.jsx` usaba `cleanAIText()` (whitelist de ~20 comandos LaTeX, el resto se rompía) —
ahora usa el mismo `RichMarkdown` que Resumen/Notas, con un `style` override por profundidad de
chip. `RichMarkdown.jsx` acepta ese prop `style` nuevo.

### Otros ajustes del pipeline

- `MathView.jsx`: fallback de error sin mostrar LaTeX crudo en pantalla; timeout de altura (~4s) si
  el `postMessage` nunca llega; estimación inicial de alto más realista.
- `workspaceMapper.js`: Resumen ahora pagina por los headings H1 reales del prompt de
  `summary.md` (mismo patrón que Notas por concepto) — antes era una sola sección sin paginar.
- `FloatingToolbar.styles.js`: anclado abajo-derecha en vez de centrado en el alto completo de la
  columna de lectura. `ReaderCard.styles.js`: padding de despeje con la aritmética completa (52px
  botón + 16px offset − 24px de `card.padding` = 44px adicionales).

---

## Mobile — Cierre de M1: flip a producción + convención Beta permanente

**Archivos:** `App.jsx`, `NotesScreen.jsx`, `JobOptionsModal.jsx`
**Ver:** `App/Knowledge/ADR/ADR-014-knowledge-workspace-versioning.md`

- `KnowledgePackViewer` (ruta de producción) pasa de `NoteDetailScreen` (legacy, retirado de rutas
  activas, archivo se mantiene en el repo sin borrar) a `KnowledgeWorkspaceScreen`.
- `KnowledgeWorkspacePreview` renombrada a `KnowledgeWorkspaceBeta` — deja de describirse como ruta
  temporal, pasa a ser el punto de entrada permanente para probar la próxima iteración (V2 Topics,
  V4 narración/TTS) antes de promoverla a la ruta estable.
- `JobOptionsModal.jsx`: botón "Knowledge Workspace" renombrado a **"Knowledge Workspace V1"**
  (nombre explícito de primera versión estable); botón "Knowledge Workspace (Beta Version)" sin
  cambios de texto (ya usaba ese lenguaje).

---

## Documentación actualizada

- `CLAUDE.md` raíz: Knowledge Workspace marcado como Implementado.
- `App/Mobile/CLAUDE.md`: dirección de producto, seam de navegación y gotcha de theming actualizados a la superficie real de producción.
- `App/Knowledge/Roadmap/SPRINT_PLANNING.md`: Sprint 1 cerrado (los 4 issues + bonus resueltos), convención Beta documentada.
- `App/Knowledge/Roadmap/BACKLOG.md`: issues de V1 tachados como resueltos.
- `App/Knowledge/Roadmap/MILESTONES.md`: M1 cerrado.
- `App/Knowledge/Roadmap/EPICS.md`: EPIC V1 cerrado, corregida la mención de "Mermaid" (decisión real: árbol nativo).
- `App/Knowledge/Bugs/known-issues.md`: ISSUE-012 cerrado y movido a "Issues resueltos".
- Nuevos ADR-013 (pipeline de math) y ADR-014 (versionado del Workspace).

---

## Mobile — Retiro del debug de Markdown + LaTeX (datos mock)

**Archivos eliminados:** `RichMarkdownPreviewScreen.jsx`, `RichMarkdownPreviewScreen.styles.js`
**Archivos modificados:** `App.jsx`, `NotesScreen.jsx`, `JobOptionsModal.jsx`

Pantalla de debug aislado de `RichMarkdown` con datos 100% mock, usada para probar el pipeline de
math antes de conectarlo a contenido real (cumplió su propósito durante la reescritura del pipeline
de esta misma sesión — ver más arriba). Ya no hace falta: `RichMarkdown` corre en producción real
sobre Resumen/Notas/mind_map. Se retiró la ruta `RichMarkdownPreview`, el botón "Markdown + LaTeX
(Debug, datos mock)" de `JobOptionsModal`, y el handler correspondiente en `NotesScreen.jsx`. La
sección Beta (`KnowledgeWorkspaceBeta`, ver ADR-014) queda como el único punto de entrada de
prueba/preview del Workspace.

---

## Pendiente / trabajo en curso (fuera de esta sesión)

- Backend de TTS (`tts.controller.js`, `text_routes.js`) — arrancado en paralelo por el equipo, no
  tocado en esta sesión. Mapea a EPIC V4; corresponde construir su UI en la sección Beta del
  Workspace antes de promoverla (ver ADR-014).
- `NoteDetailScreen.jsx`/`NoteDetailScreen.styles.js` — código muerto tras el flip, candidato a
  limpieza en un chore futuro, no borrado en esta sesión.
