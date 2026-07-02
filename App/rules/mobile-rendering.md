# Reglas — Presentation Layer / Renderizado Mobile

Reglas para el renderizado de resultados de IA (Markdown, LaTeX, Mermaid) en la app móvil. Ver `App/Knowledge/ADR/ADR-008-client-side-rendering.md` para el contexto completo de estas decisiones.

## R-RENDER-01: El usuario nunca ve sintaxis sin procesar

Ningún campo de resultado (`summary_text`, `notes_text`, expresiones LaTeX, código Mermaid) se muestra jamás como texto plano con sus caracteres de marcado visibles (`#`, `**`, `$...$`, `mindmap\n  root((...))`, etc.). Si un renderer falla, se cae a un fallback visual (ver R-RENDER-05) — nunca al texto crudo.

**Violación:** un `<Text>{markdown_o_latex_o_mermaid_crudo}</Text>` sin pasar por un renderer.

## R-RENDER-02: WebView es el único mecanismo compartido para Mermaid y LaTeX

No se agrega una librería nativa distinta por cada capacidad de renderizado que RN no soporta nativamente. `react-native-webview`, con los assets de mermaid.js/KaTeX embebidos localmente (sin red), es el mecanismo único para ambas.

**Violación:** agregar un binding nativo adicional (ej. para LaTeX) cuando el WebView ya cubre el caso.

## R-RENDER-03: Nunca una imagen es la fuente de verdad

El SVG de un mapa mental (`mind_map_svg`) es siempre una proyección cacheada de un código (`mind_map_mermaid_code`), que a su vez es una proyección determinística de datos generados por IA (`mind_map_json`). La fuente de verdad es siempre texto/código, nunca la imagen — el SVG debe poder regenerarse en cualquier momento a partir del código Mermaid.

**Violación:** cualquier flujo donde se pierda o descarte el código Mermaid/LaTeX y solo quede la imagen renderizada.

## R-RENDER-04: Un solo motor de Markdown para pantalla y PDF

`react-native-markdown-display` (pantalla) y la conversión a HTML para `pdfExport.js` deben usar el mismo motor subyacente (`markdown-it`) con los mismos plugins (tablas, checklists). No se mantienen dos implementaciones de parseo Markdown divergentes.

**Violación:** agregar un segundo parser de Markdown (regex ad-hoc, otra librería) para cualquiera de los dos flujos.

## R-RENDER-05: Todo renderer de contenido generado por IA necesita un fallback

Mermaid es sintaxis relativamente nueva/menos madura; el contenido generado por el modelo es texto arbitrario que puede romper el parseo (caracteres especiales en nombres de nodo, etc.). Todo renderer de este tipo (`MermaidRenderer.jsx`) debe:
1. Sanitizar la entrada antes de pasarla al motor de render (ej. envolver nombres de nodo en comillas).
2. Si el render falla igual, caer a una representación degradada pero funcional (ej. el renderer de lista anterior para mapas mentales) — nunca a una pantalla en blanco o un crash.

**Violación:** un renderer sin try/catch alrededor del parseo, o sin una vista alternativa cuando el parseo falla.

## R-RENDER-06: El SVG se cachea server-side tras el primer render, no se regenera en cada vista

Una vez que el cliente renderiza un mapa mental por primera vez, sube el SVG resultante al backend (`PATCH .../mindmap-svg`). Vistas subsecuentes (mismo o distinto dispositivo) deben usar el SVG cacheado — el WebView solo se monta cuando no hay SVG cacheado o cuando se sabe explícitamente que hay que regenerar.

**Violación:** montar el WebView y volver a renderizar Mermaid en cada apertura de un mapa mental que ya tiene `mind_map_svg`.

## R-RENDER-07: Ningún cambio de prompt fuera del explícitamente autorizado

La única excepción de toda la Presentation Layer a "no modificar prompts de IA" es la sección de formato de notación matemática agregada a `summary.md`/`notes.md` (instrucción de formato de salida, no de contenido/razonamiento). Ningún otro prompt (`mind_map.md`, `notes_json.md`, `system.md`) se modifica por trabajo de renderizado — las nuevas capacidades de presentación se construyen sobre los datos que esos prompts ya producen.

**Violación:** modificar `mind_map.md` para que emita Mermaid directamente, o cualquier otro cambio de prompt motivado por necesidades de renderizado en vez de formato matemático.

## R-RENDER-08: Los jobs sin datos de Presentation Layer deben degradarse, no romperse

Jobs completados antes de esta capa no tienen `mind_map_mermaid_code`/`mind_map_svg`. Ningún componente debe asumir que estos campos existen — siempre verificar presencia antes de usarlos y caer al fallback correspondiente (R-RENDER-05). No hay backfill retroactivo planificado.

**Violación:** un componente que crashea o queda en blanco al recibir un resultado sin estos campos.

## R-RENDER-09: Medir contenido de WebView con ResizeObserver + fonts.ready, nunca con una sola medición síncrona

Ver [[ADR-010-latex-rendering-fixes-and-block-renderer-architecture]] — causa raíz del bug de superposición de ecuaciones LaTeX. Las fuentes web (incluso embebidas como data URI) cargan de forma asíncrona; medir con `getBoundingClientRect()` antes de que la fuente termine de cargar produce un tamaño incorrecto que queda fijado para siempre en el layout de React Native, mientras el contenido real (ya con la fuente correcta) se dibuja por encima de lo que sigue.

Todo renderer basado en WebView que mida su propio contenido debe combinar: reporte inmediato (best-effort) + `document.fonts.ready.then(reportSize)` + `ResizeObserver` sobre el nodo medido. El `<WebView>` en el lado de React Native debe recibir `width`/`height` explícitos iguales al contenedor medido — nunca depender de sizing implícito por `alignItems`/`stretch`.

**Violación:** un renderer WebView que mide tamaño con una sola llamada síncrona a `getBoundingClientRect()`, o un `<WebView>` sin `width`/`height` explícitos.

## R-RENDER-10: Contenido más ancho que la pantalla se scrollea, nunca se encoge hasta ser ilegible

Si una ecuación (u otro contenido matemático/diagrama) excede el ancho disponible medido del contenedor, se envuelve en un `ScrollView horizontal` en vez de reducir su tamaño de fuente para que quepa. Reducir el tamaño de una ecuación compleja (matriz, integral con límites) hasta que quepa en pantalla la vuelve ilegible — contradice el objetivo de una representación matemática amigable.

**Violación:** lógica que ajusta `fontSize`/escala de una ecuación en función del ancho de pantalla en vez de habilitar scroll.
