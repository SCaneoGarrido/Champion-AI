# ADR-014: Convención de versionado del Knowledge Workspace — V1 estable / Beta permanente

tags: #adr #decision #mobile #knowledge-workspace #roadmap

---

## Estado

Adoptado (2026-08-10)

---

## Contexto

`KnowledgeWorkspaceScreen.jsx` pasó por varias rondas de bugfixing real (renderizado matemático,
paginación, overlaps de UI — ver [[ADR-013-math-rendering-pipeline-rewrite]] y el changelog de
esta sesión) mientras corría exclusivamente en una ruta separada
(`KnowledgeWorkspacePreview`/botón "Knowledge Workspace (Beta Version)" en `JobOptionsModal`), sin
reemplazar todavía al viewer de producción real (`KnowledgePackViewer`, que seguía apuntando a
`NoteDetailScreen`, legacy). Este es exactamente el seam que [[ADR-009-mobile-navigation-manager-viewer-seam]]
preparó a propósito: `NotesScreen.jsx` navega por nombre de ruta, nunca importa el componente
concreto, así que reasignar `KnowledgePackViewer` es un cambio de una línea en `App.jsx`.

Con Sprint 1 completo (los 4 issues planificados en [[SPRINT_PLANNING]]) y el Workspace ya
validado en dispositivo real tras las rondas de fixes, correspondía cerrar el Milestone M1
("Workspace único en producción" — ver [[MILESTONES]]) haciendo el flip. Al mismo tiempo, el
equipo está arrancando trabajo de la próxima iteración (narración/TTS, EPIC V4) — que va a
necesitar el mismo patrón de "probar aislado antes de integrar" que ya costó un rollback completo
una vez (ISSUE-012). En vez de crear una ruta temporal nueva cada vez que empieza una iteración
siguiente, se formaliza la convención de tener siempre una sección "Beta" permanente.

---

## Decisión

### 1. `KnowledgePackViewer` (ruta de producción) apunta a `KnowledgeWorkspaceScreen`

`NoteDetailScreen.jsx` se retira del registro de rutas en `App.jsx` (el archivo se mantiene en el
repo por ahora, no se borra — ver Negativas). El botón "Knowledge Workspace" en `JobOptionsModal`
se renombra a **"Knowledge Workspace V1"** — nombre explícito para dejar claro que es la primera
versión estable, con la documentación (cadena de ADRs, changelog) tratándola como tal de acá en
adelante.

### 2. `KnowledgeWorkspacePreview` se renombra a `KnowledgeWorkspaceBeta` — sección permanente, no temporal

La ruta y el handler (`handleViewWorkspaceBeta` en `NotesScreen.jsx`, antes
`handleViewWorkspacePreview`) dejan de describirse como "temporales" — es el punto de entrada
oficial y permanente para la próxima iteración del Workspace (`Vx`). Hoy apunta al mismo componente
que la ruta estable (todavía no hay una V2 que diverja); cuando arranque una feature de la próxima
versión (ej. selector de voz/narración de V4, o Topics de V2), se integra ahí primero, se prueba en
dispositivo, y solo se promueve a `KnowledgePackViewer` cuando esté validada — mismo criterio que
ya se aplicó de facto en esta sesión con el Workspace mismo. La etiqueta visible en el menú
("Knowledge Workspace (Beta Version)") ya usaba este lenguaje — no se le cambió el texto.

### 3. El nombre versionado vive en el punto de entrada, no en el componente

`KnowledgeWorkspaceScreen.jsx` no se renombra ni se le agrega un badge visible de versión en su
propio header — sigue mostrando el branding de la app. El nombre "V1"/"Beta" es una distinción de
**navegación y documentación** (qué ruta usás para llegar, qué dice el menú), no una marca de agua
permanente en la pantalla. Cuando exista una V2 real que diverja de V1, ahí sí corresponde
evaluar si el componente se bifurca en dos archivos o si se maneja con un flag interno — decisión
que queda fuera de alcance de este ADR hasta que ese momento llegue.

---

## Consecuencias

### Positivas

- Cierra formalmente el Milestone M1 según su Definition of Done (Workspace único en producción,
  sin vista Markdown/legacy como entrada principal).
- El patrón "probar en Beta antes de promover a V1" queda disponible de forma permanente para V2 en
  adelante, sin necesitar inventar una ruta temporal nueva cada vez ni repetir la decisión.
- Cero trabajo de migración en `NotesScreen.jsx` más allá de renombrar el handler — el seam de
  ADR-009 funcionó exactamente como se diseñó.

### Negativas

- `NoteDetailScreen.jsx` (y su hoja de estilos) quedan como código muerto en el repo — ningún route
  lo referencia. Se decidió no borrarlo en este cambio (no era parte de lo pedido, y conservarlo es
  reversible); queda anotado acá como candidato a un chore de limpieza futuro.
- Mientras no exista una V2 real, "Beta" y "V1" son el mismo componente — dos entradas de menú que
  hoy llevan al mismo lugar. Aceptado a propósito: el costo de mantener el seam vacío es mínimo
  comparado con el de reconstruirlo cuando haga falta.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Borrar `KnowledgeWorkspacePreview`/el botón Beta al hacer el flip | Pierde el seam justo cuando más se va a necesitar (arranque de TTS/V4) — hay que reconstruirlo desde cero en la próxima iteración. |
| Borrar `NoteDetailScreen.jsx` en este mismo cambio | Fuera del pedido explícito de esta sesión; borrar código no relacionado en un cambio de otra cosa es exactamente el tipo de decisión silenciosa que este proyecto evita (mismo criterio que ADR-012 aplicó con `AudioRecorder.jsx`). |
| Versionar con un flag/prop interno en `KnowledgeWorkspaceScreen` en vez de dos rutas | Sobre-ingeniería hoy — no hay todavía una V2 real que diverja; dos rutas al mismo componente ya resuelve el problema actual sin construir infraestructura para un caso que no existe aún. |

---

## Referencias

- [[ADR-009-mobile-navigation-manager-viewer-seam]] — el seam de navegación por nombre de ruta que hizo este flip trivial
- [[ADR-013-math-rendering-pipeline-rewrite]] — el trabajo de bugfixing que validó el Workspace antes del flip
- [[MILESTONES]] — Definition of Done de M1
- [[known-issues]] — ISSUE-012, la lección de "probar aislado antes de integrar" que motiva mantener la sección Beta
