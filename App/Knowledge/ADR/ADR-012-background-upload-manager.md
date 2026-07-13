# ADR-012: Manager de subida en segundo plano + confirmación con nombre antes de subir

tags: #adr #decision #mobile #upload

---

## Estado

Adoptado (2026-07-13)

---

## Contexto

Dos problemas de UX en el flujo de grabar/subir audio:

1. **El feedback de carga se perdía al navegar.** `useLiveSTTRecorder` guardaba todo el estado de
   subida (`status`, `uploadProgress`, `step`) como estado de componente, ligado al ciclo de vida
   de `LiveSTTRecorder` → `SpeechToTextPanel` → `SpeechToTextScreen`/`SpeechToTextModal`. Al navegar
   a otra pantalla, el componente se desmontaba: la llamada de red (`uploadBlobInChunks` →
   `submitSTTJob`) seguía corriendo en memoria (nada la cancelaba), pero cada `setState` posterior
   actualizaba un componente ya desmontado — la animación y la barra de progreso desaparecían sin
   dejar rastro de que la subida siguiera en curso, y si fallaba, el error se perdía silenciosamente.
2. **No había confirmación obvia + nombre antes de subir.** `RecordingModal`'s botón "Detener y
   enviar" disparaba `stop()`, que encadenaba detener el mic → subir por bloques → `POST
   /SpeechToTextv2` de forma completamente automática. El único campo de nombre existente
   (`LiveSTTRecorder.jsx`, bloque `isAccepted && !nameSaved`) aparecía **después** de que el job ya
   estaba creado y encolado — servía para renombrar, no para confirmar antes de subir.
   `AudioFileUploader.jsx` (pestaña "Subir") tenía ambos problemas: ni confirmación, ni nombre, y
   subía apenas se elegía el archivo — además usaba un pipeline distinto y más viejo
   (`submitRecordingToSpeechPipeline`, PUT único sin bloques) que `LiveSTTRecorder`.

---

## Decisión

### 1. `UploadManagerContext` montado en la raíz de `App.jsx`, no en `MainTabNavigator`

El manager de subidas (`src/context/UploadManagerContext.jsx`) envuelve **todo** el
`NavigationContainer` en `App.jsx`, no solo el árbol de tabs. Motivo: `SpeechToTextScreen` está
registrada como pantalla del stack raíz, hermana de `Main` (ver
[[ADR-009-mobile-navigation-manager-viewer-seam]]), **fuera** del subárbol de `MainTabNavigator`.
Montar el Provider solo ahí habría dejado ese punto de entrada sin acceso a `useUploadManager()` —
el mismo problema que ADR-009 ya documentó para `ThemeProvider` (`SpeechToTextWithTheme`
autoenvolviéndose). `SpeechToTextScreen` no está enlazada desde ninguna UI hoy (verificado — cero
`navigation.navigate('SpeechToText')` en el código), pero se decidió cubrir el caso igual: el costo
de montarlo en la raíz es nulo y evita un bug latente.

El manager mantiene una lista de tareas en memoria (`{ id, name, status, progress, errorMessage }`)
y expone `startUpload`, `retryUpload`, `dismissTask`. Cada tarea guarda sus propios parámetros para
poder reintentarse. Como es un Context de React normal, sobrevive mientras la app esté montada —
sin importar a qué pantalla navegue el usuario — pero **no sobrevive si la app se cierra
completamente** (ver Negativas).

### 2. `useLiveSTTRecorder.stop()` partido en dos fases

`stop()` (una sola función que hacía todo) se dividió en:
- `stopRecording()` — detiene el micrófono, obtiene el archivo local y la duración, y pasa el
  estado a `'confirming'`. No llama a ninguna red todavía.
- `confirmAndUpload(name)` — recién acá se delega a `UploadManagerContext.startUpload(...)`. El
  hook vuelve a `'idle'` inmediatamente después — la subida ya no es su responsabilidad.
- `discardRecording()` — borra el archivo local temporal y descarta, sin subir nada.

`RecordingModal` (la animación de ondas + timer) deja de mostrar progreso de subida — ese progreso
ahora vive exclusivamente en `UploadStatusBar`.

### 3. Un solo componente de confirmación, reutilizado por ambas entradas

`ConfirmUploadModal.jsx` (nuevo) — pide nombre (obligatorio) y muestra la duración, con
`Confirmar y subir` / `Descartar`. Se usa desde `LiveSTTRecorder.jsx` (tras `stopRecording()`) y
desde `AudioFileUploader.jsx` (tras elegir un archivo). En ambos casos el nombre se guarda con
`patchJobName` (mismo endpoint ya usado por `EditJobModal`, ver ADR-010) apenas el job existe en
BD (justo después de `submitSTTJob`, no antes — `POST /init` todavía no crea la fila en `ai_job`).

### 4. `AudioFileUploader` migrado al mismo pipeline que `LiveSTTRecorder`

Antes usaba `submitRecordingToSpeechPipeline` (flujo legado: un solo `PUT`, sin bloques). Ahora usa
`initSTTJob` + `uploadBlobInChunks` + `submitSTTJob` — el mismo pipeline y el mismo
`UploadManagerContext.startUpload(...)` que la grabación en vivo. Un solo pipeline de subida en vez
de dos mantenidos en paralelo.

### 5. `UploadStatusBar` — overlay persistente en la raíz

Se renderiza una sola vez en `App.jsx`, como overlay absoluto por encima de `NavigationContainer`
(no dentro de ninguna pantalla) — visible sin importar el tab activo. Muestra nombre + progreso o
error, con reintentar/descartar.

---

## Consecuencias

### Positivas

- La subida sobrevive a la navegación: iniciar una grabación, confirmarla, e ir a "Mis Apuntes" (o
  cualquier otra pantalla) ya no interrumpe el feedback visual — `UploadStatusBar` sigue mostrando
  progreso real.
- Confirmación + nombre consistentes en ambas entradas (grabar en vivo / subir archivo), antes de
  cualquier llamada de red — nunca se sube nada sin que el usuario lo confirme explícitamente.
- Un solo pipeline de subida (`initSTTJob` + `uploadBlobInChunks` + `submitSTTJob`) en vez de dos
  mantenidos en paralelo con comportamiento ligeramente distinto.
- `retryUpload` reutiliza los mismos parámetros guardados en la tarea — un fallo de red no obliga a
  re-grabar ni volver a elegir el archivo.

### Negativas

- **No es background real de SO.** Si el usuario mata el proceso de la app (o el SO lo mata en
  background prolongado), la subida en curso se pierde — no hay persistencia ni un
  background-fetch/foreground-service nativo. Esto es consistente con la misma limitación conocida
  de [[ADR-011-local-job-completion-notifications]] (todo lo que hace este proyecto en el cliente
  es JS-en-proceso, no un servicio nativo) — resolverlo requeriría la misma infraestructura EAS que
  ya se evaluó y difirió ahí. Lo logrado acá es "sobrevive a la navegación dentro de la app", no
  "sobrevive a que la app se cierre".
- Sin reintento automático — un fallo de red deja la tarea en estado `error` esperando que el
  usuario toque "Reintentar" en `UploadStatusBar`. No hay backoff ni reintento silencioso.
- La SAS URL de subida expira en 3600s (ver ADR-003) — si un `retryUpload` se dispara mucho después
  del fallo original, podría fallar por URL expirada; no se maneja ese caso (pedir una SAS nueva)
  en esta iteración.
- `src/components/AudioRecorder.jsx` (componente sin ningún importador en el código — código muerto
  preexistente, no tocado por este cambio) sigue importando `submitRecordingToSpeechPipeline`.
  Se decidió **no** borrar esa función de `speechApi.js` para no tocar un archivo no relacionado con
  este trabajo — queda documentado acá en vez de borrarse en silencio.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Montar `UploadManagerProvider` solo en `MainTabNavigator` | Deja fuera a `SpeechToTextScreen` (pantalla de stack raíz, fuera del subárbol de tabs) — mismo problema que ADR-009 ya resolvió para `ThemeProvider`. |
| Background fetch / foreground service nativo para sobrevivir al cierre de la app | Requiere EAS + build de desarrollo nativo, la misma infraestructura que ADR-011 ya evaluó y difirió por no existir en el proyecto hoy. Fuera de alcance. |
| Mantener el nombre post-hoc (después de encolar el job) | No cumple "confirmación obvia... para subir el archivo" — el pedido es explícito en que la confirmación debe ocurrir antes de que el audio se suba, no después. |
| Mantener `AudioFileUploader` en su pipeline legado, separado | Dos pipelines de subida con comportamiento distinto (bloques vs. PUT único) es más superficie para mantener sin beneficio — se unificó. |

---

## Referencias

- [[ADR-009-mobile-navigation-manager-viewer-seam]] — mismo patrón de "gotcha" de Provider fuera del árbol de tabs
- [[ADR-010-knowledge-pack-lifecycle-actions]] — `patchJobName`, reutilizado acá para el nombre pre-subida
- [[ADR-011-local-job-completion-notifications]] — misma limitación de "no hay background real de SO" sin EAS
- [[ADR-003-sas-direct-upload]] — SAS URL de 3600s, relevante para el caso no manejado de retry tardío
