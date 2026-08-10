# ADR-013: Reescritura del pipeline de renderizado matemático (regla real de markdown-it, no hack de imagen)

tags: #adr #decision #mobile #knowledge-workspace #math

---

## Estado

Adoptado (2026-08-10)

---

## Contexto

El Knowledge Workspace renderiza LaTeX real (`$...$`/`$$...$$`) vía KaTeX dentro de un `WebView`
acotado a una fórmula por instancia (`MathView.jsx` — mitigación ya documentada del rollback de
ISSUE-012, ver [[known-issues]]). La primera implementación integraba esas fórmulas en
`react-native-markdown-display` con un truco: preprocesar el texto con regex, reemplazar cada
expresión matemática por sintaxis de imagen Markdown (`![inline](math://<url-encoded-latex>)`), y
una regla custom `rules.image` interceptaba esas URLs `math://` para renderizar `MathView` en vez
de una imagen real.

Ese truco falló de dos formas distintas, ambas reportadas por el usuario en producción (no
sintéticas):

1. **Fugas de sintaxis interna al usuario**: texto literal `![inline](math://...)` o valores
   URL-encoded (`%28`, `%29`, `%2B`) visibles en pantalla. Causa raíz encontrada: el regex de
   inline (`/\$([^\n$]+?)\$/g`) empareja el primer `$` con el *siguiente* `$` que encuentre sin
   importar la intención — con texto como `"cuesta $100 y el servicio $200"` arma un match
   inválido que rompe la sustitución encadenada.
2. **Ecuaciones superpuestas sobre el texto en vez de reservar su espacio**. Causa raíz distinta y
   más profunda, encontrada leyendo el código fuente de `react-native-markdown-display`
   (`util/cleanupTokens.js:11-13`): la librería decide si un token se renderiza dentro de un
   `<Text>` (fluye inline) o como `<View>` hermano de `paragraph` (bloque, con su propio espacio)
   mirando **una sola propiedad, `token.block`** — y solo la fuerza a `true` para los tipos
   `'image'`/`'hardbreak'`, por nombre hardcodeado. Nuestros tokens vía el truco de imagen sí
   pasaban por ahí (heredaban `block:true` del tipo `image`), pero un intento posterior de
   reemplazar el hack por tokens custom (`math_inline`/`math_block`) los dejaba con
   `token.block: false` (default de markdown-it) — el `WebView`/`View` de `MathView` terminaba
   anidado en un `<Text>`, que React Native trata como un "attachment" de tamaño fijo, no como un
   hijo flex normal de Yoga. Cuando `MathView` cambiaba su alto de forma asíncrona (después del
   round-trip de KaTeX vía `postMessage`), el texto alrededor no se repositionaba.

Ambos bugs comparten la misma causa de fondo: depender de un mecanismo indirecto y frágil
(disfrazar LaTeX de Markdown existente) en vez de integrarse al parser por el punto que markdown-it
expone explícitamente para esto.

Adicionalmente, `MindMapDiagram.jsx` (los nombres de nodo del mapa mental) nunca pasó por este
pipeline — usaba `cleanAIText()` (`utils/textFormat.js`), una utilidad más vieja que solo tiene una
whitelist de ~20 comandos LaTeX y deja el resto como texto roto (`\left(x\right)` → `left(x
right)`). El prompt `mind_map.md` sí instruye al modelo a usar `$...$` en nombres de nodo — el
mismatch entre lo que el prompt permite y lo que el renderer soporta era 100% reproducible, no
intermitente.

---

## Decisión

### 1. Regla real de markdown-it, no preprocesamiento de texto

`src/components/workspace/mathMarkdownRule.js` registra una regla inline
(`md.inline.ruler.push('math', mathRule)`) que reconoce `$...$`/`$$...$$` directamente sobre el
AST del parser, empujando tokens `math_inline`/`math_block` con el LaTeX crudo como `content` —
**sin ningún paso de encode/decode de URL**. Verificado antes de construir sobre esto: `$` (0x24)
ya está en la lista de caracteres terminadores de la regla `text` de markdown-it
(`node_modules/markdown-it/lib/rules_inline/text.js`, comentario propio de la librería: *"reserved
for extentions"*) — es el punto de extensión pensado para esto, no un hack.

Guardia anti-colisión con montos de dinero: si el contenido entre signos `$` tiene 3+ palabras y
ninguna señal matemática (`\`, `^`, `_`, `=`, `+`, `-`, `*`, `/`), se trata como texto literal.
Complementado con una regla en el prompt (`system.md`, sección MATHEMATICAL NOTATION) que instruye
al modelo a no usar `$` para dinero — la corrección real está en la fuente, el heurístico del
cliente es la segunda capa.

### 2. `token.block = true` explícito en ambos tipos de token

Mismo mecanismo que la librería ya usa para `image`/`hardbreak` (`cleanupTokens.js`), replicado a
mano porque no hay forma de que markdown-it lo infiera de un tipo de token custom. Saca el nodo de
la mezcla con `<Text>` vecino — se vuelve `<View>` hermano de `paragraph`, con reflow normal de
Yoga. Consecuencia aceptada y correcta, no un efecto colateral: una ecuación "inline" (`$x$`) pasa
a ocupar su propia línea en vez de fluir literalmente en medio de la oración — es la única forma
de que reserve espacio y nunca se superponga.

### 3. `RichMarkdown.jsx` reutilizado también en `MindMapDiagram.jsx`

En vez de mantener dos sistemas (uno con LaTeX real para Resumen/Notas, otro con `cleanAIText`
para mind_map), `MindMapDiagram.jsx` renderiza `node.name` con el mismo componente `RichMarkdown`,
pasando un `style` override (`{ body: textStyle, paragraph: { margin: 0 } }`) para heredar la
tipografía del chip por profundidad. `RichMarkdown` acepta ahora ese prop `style` opcional
justamente para este caso de uso.

---

## Consecuencias

### Positivas

- Elimina de raíz la clase de bug `math://`/`%28`/`%29`/`![inline]` visible al usuario — no existe
  ninguna URL en el camino, nada que codificar o decodificar mal.
- Elimina el bug real de superposición — confirmado con datos y código de la librería, no una
  hipótesis.
- Un solo sistema de renderizado matemático en todo el Workspace (Resumen, Notas y mind_map) — ya
  no hay un componente que muestre LaTeX real y otro que muestre sintaxis rota.
- `RichMarkdown.jsx` se simplifica: se cae todo el código de `injectMathPlaceholders`/
  `encodeMathUrl`/la regla `image` hackeada.

### Negativas

- Una ecuación "inline" corta (`$x$`) ya no fluye literalmente en medio de una oración — pasa a
  ocupar su propia línea. Es el trade-off necesario del fix, no una regresión no evaluada.
- `MathView.jsx` sigue dependiendo del CDN de jsDelivr para KaTeX (limitación preexistente, no
  reabierta acá) — si el CDN falla, ya no muestra LaTeX crudo (se cambió el fallback de error a un
  aviso corto), pero la ecuación no se renderiza. Bundlear KaTeX localmente queda diferido como
  mejora futura, es un proyecto en sí mismo (requiere empaquetar fuentes woff/woff2).
- La guardia anti-colisión de dinero es un heurístico (3+ palabras sin señal matemática), no una
  detección perfecta — un ejemplo aislado como `$100 dollars$` (dos palabras) todavía podría
  interpretarse como math. Aceptado: la corrección real vive en el prompt, esto es solo defensa en
  profundidad para contenido ya generado.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Parchear el regex existente para no colisionar con montos de dinero | No resuelve la causa raíz del overlap (`token.block`) — solo uno de los dos bugs reportados. |
| Mantener el hack de imagen pero agregar el `token.block=true` sobre el tipo `image` | El hack de encode/decode de URL sigue siendo frágil (fuente confirmada de la fuga `%28`/`math://`) — arreglar solo el overlap habría dejado el otro bug reportado sin resolver. |
| `cleanAIText` mejorado con más comandos LaTeX en la whitelist para `MindMapDiagram` | Sigue sin renderizar tipografía matemática real, y mantiene dos sistemas de renderizado divergentes — contradice el pedido explícito de "mismo sistema en Resumen/Notas/mind_map". |

---

## Referencias

- [[known-issues]] — ISSUE-012, precedente del rollback de Mermaid/WebView que motivó la mitigación de un WebView por fórmula en `MathView.jsx`
- [[ADR-008-knowledge-workspace]] — decisión original de reintroducir renderizado enriquecido en el Workspace
