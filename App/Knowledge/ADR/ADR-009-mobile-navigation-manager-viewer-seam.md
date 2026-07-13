# ADR-009: Seam de navegación manager/viewer en Mobile — "Mis Apuntes" como administrador de Knowledge Packs

tags: #adr #decision #mobile #navigation #workspace

---

## Estado

Adoptado (2026-07-13)

---

## Contexto

"Mis Apuntes" (`App/Mobile/src/screens/NotesScreen.jsx`) es la pantalla que administra Knowledge
Packs: lista, muestra estado, permite reintentar jobs fallidos, descargar PDF y ver el resultado.
Hasta esta decisión, "ver el resultado" estaba implementado como acoplamiento directo: `NotesScreen`
importaba `NoteDetailScreen` y lo renderizaba inline como un `<Modal>` de React Native controlado
por estado local (`showDetail` / `selectedJob`), pasándole el objeto `job` completo como prop.

Ese acoplamiento es un problema concreto por lo que viene después: **EPIC V1 — Knowledge Workspace**
(ver [[EPICS]] y [[ADR-008-knowledge-workspace]]) reemplazará `NoteDetailScreen` por una nueva
pantalla (reproductor de audio + secciones integradas + mapa mental Mermaid). Un intento anterior de
superficie de presentación (Markdown/LaTeX/Mermaid) se implementó de punta a punta y se revirtió por
completo el 2026-07-11 por bugs visuales persistentes en mobile (ver [[known-issues]] ISSUE-012) — la
lección incorporada en ADR-008 es que el próximo intento debe ser un componente aislado y
reemplazable, no algo entretejido con la pantalla administradora.

Sin desacoplar esta relación ahora, construir el Workspace más adelante habría requerido volver a
modificar `NotesScreen.jsx` — exactamente lo que este ADR busca evitar.

---

## Decisión

Se adopta un seam de navegación de tres partes entre el manager (`NotesScreen`) y el viewer (hoy
`NoteDetailScreen`, mañana el Knowledge Workspace):

1. **Nombre de ruta estable, desacoplado de la implementación actual.** Se registra la ruta
   `KnowledgePackViewer` — no `NoteDetail` ni ningún nombre atado al componente vigente.
   `NotesScreen` solo conoce ese nombre de ruta, nunca el componente que hay detrás.

2. **Patrón "root-stack, swap the leaf"**, no un Stack Navigator anidado dentro del tab `Notes`. La
   ruta `KnowledgePackViewer` se registra en el `Stack.Navigator` raíz (`App/Mobile/App.jsx`), como
   hermana de `Main` y de `SpeechToText` — reutilizando el precedente ya existente en este código
   (`SpeechToText` se navega igual, desde dentro de un tab, y está registrado a nivel raíz, no
   anidado). `NotesScreen` navega con
   `navigation.navigate('KnowledgePackViewer', { jobId, blobName })`; React Navigation resuelve esa
   navegación subiendo hasta el stack raíz sin que el tab navigator necesite saber nada al respecto.

3. **Contrato de parámetros mínimo.** Solo `jobId` es obligatorio (clave opaca). `blobName` es
   opcional y puramente decorativo — un adelanto visual mientras el viewer hace su propio fetch. El
   viewer nunca debe ramificar lógica según la presencia de `blobName`; su única fuente de verdad es
   `getJobResult(jobId)`, que además de todo el resultado también devuelve `blob_name`. El viewer es
   dueño al 100% de su propio fetch de datos — el manager no le entrega datos, le entrega una
   identidad.

Cuando el Knowledge Workspace (EPIC V1) esté listo, el único cambio necesario es reasignar el
`component={...}` de la ruta `KnowledgePackViewer` en `App.jsx` (y, si el nuevo componente usa
`useTheme()`, envolverlo en su propio `<ThemeProvider>` — ver Consecuencias). `NotesScreen.jsx` no
se vuelve a tocar.

---

## Consecuencias

### Positivas

- La subtarea de diseño de navegación del Workspace en EPIC V1 (ver [[EPICS]] — "Diseño de la
  estructura de navegación del Workspace en `App/Mobile`") queda resuelta de antemano.
- `NotesScreen.jsx` queda congelado respecto a este cambio futuro: administra Knowledge Packs sin
  conocer ni importar el viewer concreto.
- No se introduce un segundo patrón de anidamiento de navegadores en el código — se reutiliza el
  precedente de `SpeechToText`.
- El componente que responda a la ruta `KnowledgePackViewer` puede, en versiones futuras (V2-V5:
  Topics, Search, Flashcards, Chat), convertirse él mismo en un navegador anidado (Tab/Stack) sin que
  la forma de invocarlo desde `NotesScreen` cambie — el mismo patrón que ya usa `Main`
  (`component={MainTabNavigator}`).
- `JobOptionsModal` (hoja de acciones Ver/Descargar/Reintentar) no se ve afectado — sigue siendo UI
  de administración local a `NotesScreen`, no parte del viewer.

### Negativas

- Las pantallas del stack raíz viven fuera del `<ThemeProvider>` que `MainTabNavigator` envuelve
  alrededor de los tabs. `NoteDetailScreen` hoy no usa `useTheme()`, así que no necesita
  auto-envolverse — pero si el futuro Knowledge Workspace sí lo usa, deberá replicar el patrón
  `SpeechToTextWithTheme` en `App.jsx` (envolverse en su propio `<ThemeProvider>`) o fallará con
  "useTheme debe usarse dentro de ThemeProvider". Documentado también en
  `App/Mobile/CLAUDE.md`.
- Los parámetros de navegación no están tipados — el contrato `{ jobId, blobName? }` se sostiene por
  convención y revisión de código, no por el compilador.
- La descarga de PDF desde `JobOptionsModal` (`handleDownload` en `NotesScreen`) sigue siendo un
  segundo consumidor independiente de `getJobResult`, no unificado con el viewer. Se deja así
  deliberadamente — unificarlo está fuera del alcance de este cambio.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Stack Navigator anidado dentro del tab `Notes` (NotesList + Viewer como pantallas hermanas de un stack propio del tab) | La barra de tabs personalizada (`AnimatedTabBar.jsx`) renderiza incondicionalmente todas las rutas de `state.routes` sin lógica de tipo `getFocusedRouteNameFromRoute` para ocultarse en una sub-ruta. Anidar habría requerido construir esa lógica solo para reproducir el comportamiento actual (pantalla completa sin tab bar), sin beneficio adicional, y habría sumado un segundo patrón de anidamiento inconsistente con el precedente de `SpeechToText`. |
| Pasar el objeto `job` completo como parámetro de navegación | Acopla el contrato del viewer a la forma exacta de los items de la lista de `NotesScreen`. Cualquier cambio futuro en esa forma (o en el viewer que la consume) rompería la independencia que este ADR busca garantizar. |

---

## Referencias

- [[ADR-008-knowledge-workspace]] — decisión de producto que este ADR prepara a nivel de navegación
- [[EPICS]] — EPIC V1, subtarea de diseño de navegación del Workspace
- [[known-issues]] — ISSUE-012, riesgo de regresión visual que motiva construir el viewer como pieza
  aislada y reemplazable
- [[PROJECT_VISION]] — visión de producto (Knowledge Packs → Knowledge Workspace)
