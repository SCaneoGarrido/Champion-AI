# Champion AI — App Móvil (React Native / Expo)

Contexto de componente. Ver `CLAUDE.md` en la raíz del proyecto para principios globales.

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

**Dependencias de la Presentation Layer:** `react-native-webview`, `react-native-svg`, `react-native-markdown-display`, `markdown-it` + `markdown-it-multimd-table` + `markdown-it-task-lists` + `markdown-it-katex`, `katex` (el cálculo LaTeX→HTML corre en JS puro, sin WebView), `mermaid` (solo su bundle `dist/mermaid.min.js`, embebido — corre dentro del WebView, no en el JS thread de RN), `expo-notifications`. Todas verificadas compatibles con Expo Go (sin requerir dev client) — ver riesgos en el plan de implementación si esto cambia.

**Assets generados (no editar a mano):** `src/assets/katexEmbedded.js` (~360 KB, CSS+fuentes woff2 en base64) y `src/assets/mermaidEmbedded.js` (~3.5 MB, bundle IIFE completo de mermaid.js) — regenerables con `scripts/generate-katex-css.js` y `scripts/generate-mermaid-js.js` cuando se actualicen esas dependencias. El tamaño de `mermaidEmbedded.js` es significativamente mayor a lo estimado originalmente en ADR-008 porque el bundle de mermaid incluye todos los tipos de diagrama (solo se usa `mindmap`) — ver riesgo correspondiente en el ADR.

## Flujo completo que la app orquesta

```
1. Register / Login → obtener access_token (JWT)

2. POST /AIServices/Speechv2/init { format }
   → recibe { job_id, upload_url, expires_in }

3. PUT {upload_url} con headers:
   x-ms-blob-type: BlockBlob
   Content-Type: audio/{formato}
   → sube el audio DIRECTAMENTE a Azure Blob (no pasa por la API)

4. POST /AIServices/Speechv2/SpeechToTextv2 {
     req_info: { job_id, service, feature, flow, language_info },
     audio_info: { format, sample_rate, duration_seconds, blob_url }
   }
   → recibe 202 { job_id, polling_url }

5. Polling: GET /AIServices/Speechv2/jobs/{job_id}/status
   → repetir hasta status = "completed" o "failed"

6. GET /AIServices/Speechv2/jobs/{job_id}/result
   → recibe { transcription, summary, notes, mind_map }
```

## Consumo de la API

### Autenticación

Todos los endpoints protegidos requieren:
```
Authorization: Bearer {access_token}
```

El token se obtiene en `POST /API/AUTH/login`. La app **no debe enviar `user_id`** en ningún payload: el backend lo extrae del JWT.

### Manejo de respuestas

Todas las respuestas siguen el envelope estándar:
```json
{ "success": true|false, "data": <objeto|null>, "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." }|null }
```

La app puede tener un interceptor HTTP único para manejar errores por `error.code`:

| Código | Acción sugerida |
|---|---|
| `TOKEN_EXPIRED` | Redirect a login |
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

`NotesScreen.jsx` hace polling activo (cada 5s) mientras hay jobs `queued`/`processing` y la pantalla está en foco (`useFocusEffect` + `setInterval`), y se detiene automáticamente cuando no hay jobs en vuelo o la pantalla pierde el foco. `useAppForegroundRefresh` complementa esto: al volver del background (`AppState`), fuerza un refresh de jobs sin importar en qué pantalla esté el usuario. No existe WebSocket. Push notifications (Expo Push Service) complementan el polling avisando cuando un job termina/falla, pero el polling sigue siendo la fuente de verdad del estado — ver `App/Mobile/src/utils/pushNotifications.js`.

## Presentation Layer — renderizado de resultados

El resultado de un job (`summary_text`, `notes_text`, `mind_map_json`/`mind_map_mermaid_code`/`mind_map_svg`) ya no se muestra como texto plano. Componentes nuevos en `App/Mobile/src/components/`:

| Componente | Responsabilidad |
|---|---|
| `MarkdownRenderer.jsx` | Envuelve `react-native-markdown-display` (con plugins `markdown-it-multimd-table` para tablas y `markdown-it-task-lists` para checklists) con los estilos del tema (`useTheme()`). Usado para `summary_text`/`notes_text`, y para `transcription_text` tras pasar por `normalizeMathText()` (ver abajo) — ya no es `<Text>` plano. Tiene una regla `fence` que detecta ` ```mermaid ` (`node.info === 'mermaid'`) como punto de extensión preparado — hoy delega al renderer de código por defecto, sin implementar el diagrama (ver [[ADR-010-latex-rendering-fixes-and-block-renderer-architecture]]). |
| `LatexView.jsx` | `katex.renderToString()` no necesita DOM — corre directo en el JS thread de RN, produce HTML+CSS. El WebView solo se usa para *mostrar* ese HTML ya calculado (layout CSS real de fracciones/raíces/matrices, imposible con flexbox/Text). El CSS de KaTeX con las fuentes woff2 embebidas como data URI vive en `src/assets/katexEmbedded.js` (generado por `scripts/generate-katex-css.js`, no se edita a mano) — HTML 100% autocontenido, offline. `MarkdownRenderer` delega a este componente los tokens `math_inline`/`math_block` (`markdown-it-katex`) en vez de intentar renderizar HTML arbitrario, que RN no soporta. |
| `MermaidRenderer.jsx` | Si el job ya tiene `mind_map_svg` cacheado, renderiza directo con `SvgXml` (`react-native-svg`), sin WebView. Si no, monta un WebView **invisible** (a diferencia de KaTeX, mermaid.js sí necesita un DOM real para calcular layout — no se puede precomputar en el JS thread) que corre `mermaid.render()` una sola vez, recibe el SVG por `postMessage`, lo muestra con `SvgXml` y lo sube vía `PATCH /AIServices/Speechv2/jobs/{job_id}/mindmap-svg` para cachearlo. Si `mermaid.render()` falla o el job es anterior a esta capa (sin `mind_map_mermaid_code`), cae a `MindMapListView.jsx` (el renderer de lista original, extraído a componente propio) — nunca debe quedar la pantalla en blanco. |

**Regla:** el WebView es el único mecanismo de renderizado compartido para Mermaid y LaTeX — no se agregan librerías nativas adicionales por capacidad. Nunca se persiste una imagen como fuente de verdad: el SVG cacheado es siempre una proyección de un código (Mermaid) o texto (Markdown/LaTeX) que sigue siendo la fuente real. Ver `App/rules/mobile-rendering.md`.

**`utils/normalizeMathText.js`:** `transcription_text` es salida literal de Fast Transcription — nunca pasa por GPT, así que ningún cambio de prompt puede agregarle LaTeX. Esta función detecta, de forma determinística y deliberadamente acotada (para minimizar falsos positivos sobre habla transcripta normal), un conjunto pequeño de patrones matemáticos inequívocos (ej. exponentes simples `x^2`) y los envuelve en `$...$` antes de pasar el texto por `MarkdownRenderer`. Ver [[ADR-010-latex-rendering-fixes-and-block-renderer-architecture]] para el diseño completo y por qué se mantiene acotado a propósito.

`pdfExport.js` reutiliza el mismo motor `markdown-it` (con los mismos plugins) para construir el HTML del PDF — no hay dos implementaciones de Markdown divergentes entre pantalla y PDF. El math en PDF usa `markdown-it-katex` directo (HTML+CSS estático, sin WebView, ya que `expo-print` renderiza HTML server-side-in-client).

## Push notifications

`App/Mobile/src/utils/pushNotifications.js` — `registerForPushNotificationsAsync()` pide permisos y obtiene el Expo push token via `expo-notifications`, y lo registra en `POST /AIServices/Devices/register` tras el login. El toggle "Notificaciones" de `SettingsScreen.jsx` controla si el dispositivo se registra/da de baja. Broker: Expo Push Service (no Firebase/APNs directos, no Azure Notification Hub) — ver `App/Knowledge/ADR/ADR-009-expo-push-service.md`.

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

## Restricciones de desarrollo

- No agregar lógica de negocio en la app — si hay duda, va a la API
- No hardcodear `user_id` — siempre viene del JWT via la API
- No almacenar resultados de procesamiento localmente como fuente de verdad — siempre consultar la API
- No llamar directamente a Azure ni a PostgreSQL
- No asumir que el job existe después de un `202 Accepted` — el job puede fallar antes de llegar a la queue
