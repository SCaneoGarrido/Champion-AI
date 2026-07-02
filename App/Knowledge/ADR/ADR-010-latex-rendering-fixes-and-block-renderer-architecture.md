# ADR-010: Corrección del renderer LaTeX y arquitectura de bloques de contenido (Markdown / LaTeX / Mermaid)

tags: #adr #decision #mobile #presentation-layer #latex #mermaid #bugfix

---

## Estado

En implementación (2026-07)

---

## Contexto

Tras implementar Markdown, LaTeX y Mermaid (mind maps) en la Presentation Layer (ver [[ADR-008-client-side-rendering]]), la validación en dispositivo real mostró tres problemas concretos:

1. Ecuaciones LaTeX que se superponen con el contenido siguiente.
2. Expresiones matemáticas que igual aparecen como texto plano (no todas las expresiones se están envolviendo en `$...$`/`$$...$$`).
3. Mala experiencia en celular — fórmulas que solo se leen bien en pantallas grandes.

Se pidió además dejar la arquitectura preparada para que Mermaid pueda aparecer como bloque embebido dentro de cualquier documento Markdown (no solo en el campo dedicado `mind_map_mermaid_code`), sin implementarlo todavía.

**Restricción explícita de esta ronda:** no se toca el pipeline de IA ni se agregan etapas nuevas de IA. El único cambio de prompt permitido es reforzar la instrucción de formato matemático ya existente (mismo tipo de cambio ya aprobado en ADR-008/R-RENDER-07, no una excepción nueva).

---

## Diagnóstico — causa raíz de la superposición (Problema 1)

Se rastreó `App/Mobile/src/components/LatexView.jsx` línea por línea. Dos bugs independientes, ambos necesarios para el arreglo completo:

### Bug 1 — el `<WebView>` no tenía dimensiones propias

El `<WebView>` solo tenía `backgroundColor`/`opacity` en su `style` — sin `width`/`height` explícitos. El `<View>` contenedor define `alignItems: 'center'` (modo bloque) o `'flex-start'` (modo inline), lo que **anula** el `alignItems: 'stretch'` que React Native aplica por defecto. Sin stretch y sin tamaño propio, el WebView no tiene ninguna referencia de tamaño confiable — un `WebView` no reporta tamaño intrínseco de contenido hacia el layout de RN como sí lo hace `Text`.

### Bug 2 — la medición corría antes de que las fuentes de KaTeX terminaran de cargar

`reportSize()` se ejecuta **una sola vez, de forma síncrona**, inmediatamente después de insertar el HTML de KaTeX en la página — antes de esperar a que las fuentes `@font-face` (embebidas como data URI en `katexEmbedded.js`) terminen de decodificarse. Las fuentes web, incluso embebidas, cargan de forma asíncrona en el motor del WebView. Si `getBoundingClientRect()` corre antes de que la fuente esté lista, mide usando la fuente de fallback del sistema — casi siempre de métricas distintas (más chica) que la fuente real de KaTeX.

Esa medición incorrecta queda fijada para siempre en el tamaño del contenedor de RN. Cuando la fuente real termina de cargar unos milisegundos después, el WebView **sí** re-renderiza a su tamaño correcto — pero el contenedor de RN nunca se entera, porque nunca se volvió a medir. El contenido real, ahora más grande que su caja, se dibuja por encima de lo que sigue en la lista (el `overflow` por defecto de una `View` es `visible`, no `hidden`). Esto es exactamente la superposición reportada.

---

## Decisión

### 1. Medición robusta y auto-correctiva (arregla Problema 1)

Reemplazar la medición de una sola vez por tres señales combinadas dentro del WebView:
- Reporte inmediato (best-effort, evita parpadeo en el caso común donde la fuente ya está lista).
- `document.fonts.ready.then(reportSize)` — re-mide específicamente cuando termina de cargar la fuente, que es la causa raíz identificada.
- `ResizeObserver` sobre el nodo `#math-root` — red de seguridad genérica que captura *cualquier* cambio de layout futuro, no solo el de fuentes.

Y en el lado de React Native: el `<WebView>` recibe `width: '100%', height: '100%'` explícitos dentro de un contenedor cuyo tamaño sí viene del estado medido — elimina la ambigüedad de cross-axis sizing del Bug 1.

### 2. Scroll horizontal solo cuando la ecuación excede el ancho disponible (Problema 3)

`LatexView` mide su propio contenedor padre vía `onLayout` (ancho real disponible en pantalla, no una constante global). Si el ancho medido de la ecuación (`size.width`) excede ese ancho disponible, se envuelve en un `ScrollView horizontal` con `scrollEnabled` activado y el contenedor visible se limita al ancho disponible; si no lo excede, el `ScrollView` sigue presente pero inerte (sin scroll posible, sin ningún indicador visual) — es decir, es seguro dejarlo siempre montado, el comportamiento "se activa solo cuando hace falta" es una consecuencia natural de cuándo hay contenido para scrollear, no una rama de código separada.

**Por qué no reducir el font-size en vez de scrollear:** encoger una ecuación compleja (matriz, integral con límites) hasta que quepa en una pantalla de teléfono la vuelve ilegible — contradice el objetivo de "representación matemática amigable". Scroll horizontal preserva la legibilidad a costa de un gesto adicional, que es la solución estándar de KaTeX/MathJax para este problema en web también.

### 3. Tipografía y espaciado para lectura en celular

- Aumento moderado del `font-size` base dentro del documento HTML de KaTeX (mejora legibilidad en pantallas de alta densidad sin romper el layout).
- Margen vertical explícito alrededor de las ecuaciones en modo bloque (`displayMode`), para que nunca queden pegadas al texto siguiente — antes no tenían ningún margen propio.

### 4. Expresiones que siguen en texto plano (Problema 2)

Dos frentes, uno concreto y uno propuesto/acotado (ver restricción de alcance más abajo):

**a) Prompt reforzado (concreto, implementado esta ronda).** La instrucción `MATH NOTATION` en `summary.md`/`notes.md` era genérica ("si hay expresiones matemáticas, usá LaTeX"). Se refuerza con categorías explícitas (fracciones, exponentes, raíces, integrales, sumatorias, matrices, letras griegas, sub/superíndices) y una prohibición explícita de notación pseudo-matemática en texto plano (`x^2`, `a/b` sueltos). Sigue siendo una instrucción de formato de salida, no de contenido/razonamiento — mismo tipo de cambio ya autorizado, no una excepción nueva a R-RENDER-07.

**b) Normalización determinística de `transcription_text` (nuevo, acotado).** `transcription_text` es salida literal de Fast Transcription — nunca pasa por GPT, por lo tanto nunca puede tener LaTeX aunque se mejore cualquier prompt. Es la fuente más probable de "matemática en texto plano" que ningún prompt puede arreglar.

Se agrega `App/Mobile/src/utils/normalizeMathText.js`: una función determinística (sin IA, sin red) que detecta un conjunto **deliberadamente acotado** de patrones inequívocos (por ahora: exponentes simples tipo `x^2`, `x²`) y los envuelve en `$...$`. `transcription_text` pasa por esta función y luego se renderiza con `MarkdownRenderer` (antes iba a un `<Text>` plano sin pasar por ningún parser).

**Por qué acotado a propósito:** un normalizador agresivo (ej. interpretar cualquier `a/b` como fracción) genera falsos positivos serios sobre texto hablado normal — "a/b testing", fechas "12/25", abreviaturas. Se prioriza cero falsos positivos sobre cobertura completa. Está diseñado para crecer con patrones adicionales de forma incremental y revisable, no para resolver el problema de una sola vez.

**Riesgo aceptado:** convertir `transcription_text` a `MarkdownRenderer` significa que caracteres sueltos como `_` o `*` en el habla transcripta (poco frecuentes pero posibles) podrían interpretarse como marcado de énfasis en vez de texto literal. Se acepta como trade-off menor frente al beneficio de renderizar matemática simple correctamente.

### 5. Arquitectura preparada para bloques Markdown / LaTeX / Mermaid (sin implementar Mermaid embebido)

Modelo mental: `MarkdownRenderer` es el **shell** — parsea el documento completo y despacha cada tipo de token a un renderer especializado vía el prop `rules` de `react-native-markdown-display`. Hoy ya existen dos despachos reales:

| Tipo de bloque | Token markdown-it | Estado |
|---|---|---|
| Markdown estándar | headings, listas, tablas, etc. | Implementado (reglas por defecto de la librería) |
| LaTeX | `math_inline` / `math_block` (plugin `markdown-it-katex`) | Implementado → `LatexView.jsx` |
| Mermaid embebido | `fence` con `info === 'mermaid'` (` ```mermaid ` en el texto) | **Preparado, no implementado** |

Se agrega en `MarkdownRenderer.jsx` una regla `fence` que detecta específicamente `node.info === 'mermaid'` y, por ahora, delega explícitamente a la regla `fence` por defecto de la librería (mismo resultado visual que hoy — bloque de código plano) — es un punto de extensión nombrado y comentado, no una implementación. Cuando se decida implementarlo, ese único punto se reemplaza por una versión reusable del `MermaidRenderer.jsx` ya existente (hoy atado al campo fijo `mind_map_mermaid_code`), generalizado para aceptar cualquier código Mermaid del documento en vez de una prop fija.

**Por qué no implementarlo ahora:** `MermaidRenderer.jsx` actual asume un único diagrama con caché server-side dedicado (`mind_map_svg`, endpoint `PATCH .../mindmap-svg`). Un mermaid-en-markdown genérico necesitaría resolver caché por *bloque* dentro de un documento arbitrario (¿qué job_id/índice de bloque identifica cada diagrama?), lo cual es una decisión de datos que no está pedida esta ronda y que rompería el alcance ("no implementar todavía Mermaid").

---

## Reglas nuevas derivadas (agregadas a `App/rules/mobile-rendering.md`)

- Todo renderer basado en WebView debe medir su contenido con `ResizeObserver` + `document.fonts.ready`, nunca con una sola llamada síncrona a `getBoundingClientRect()` — la causa raíz de este bug se repite en cualquier renderer futuro que mida contenido con fuentes web custom.
- Todo `<WebView>` usado como motor de cálculo de tamaño debe recibir `width`/`height` explícitos iguales al contenedor medido — nunca depender de sizing implícito por `alignItems`/`stretch`.

---

## Alcance explícitamente fuera de esta ronda

- Mermaid embebido en Markdown (solo arquitectura preparada, ver punto 5).
- Normalización agresiva/completa de texto matemático hablado (solo el subconjunto conservador descrito en el punto 4b).
- Medición de ancho disponible real por composición de layout completa (se usa `onLayout` del contenedor inmediato de `LatexView`, una aproximación razonable — no un sistema de medición de layout de toda la pantalla).

---

## Referencias

- [[ADR-008-client-side-rendering]] — decisión original de renderizado cliente vía WebView
- `App/rules/mobile-rendering.md` — reglas R-RENDER-01 a 08 (existentes) + nuevas de esta ADR
- `App/Mobile/src/components/LatexView.jsx`, `MarkdownRenderer.jsx`
- `App/Mobile/src/utils/normalizeMathText.js` (nuevo)
- `App/procesamiento/prompts/summary.md`, `notes.md` — sección MATH NOTATION reforzada
