/**
 * Regla real de markdown-it para LaTeX ("$...$"/"$$...$$") — lógica pura,
 * sin JSX, para poder testearse con Node sin transpilar. El consumo desde
 * React (MathView) vive en `mathMarkdown.jsx`, que reexporta
 * `createMathMarkdownIt` y agrega `mathRenderRules`. Ver el comentario de
 * cabecera de `mathMarkdown.jsx` para el porqué de este diseño (reemplaza el
 * hack anterior de preprocesar texto + disfrazar de imagen Markdown).
 *
 * `token.block = true` es obligatorio acá (ver más abajo) — sin eso,
 * `react-native-markdown-display` mete el token dentro del mismo `<Text>`
 * que el texto vecino (su `util/groupTextTokens.js` agrupa por `token.block`,
 * no por tipo), y un `<View>`/`<WebView>` (MathView) anidado en `<Text>` no
 * se resuelve como un hijo flex normal de Yoga — se congela como un
 * "attachment" de texto de tamaño fijo. Cuando KaTeX resuelve su alto real de
 * forma asíncrona (después del round-trip a la WebView), ese resize no
 * reposiciona el texto alrededor, y la ecuación queda pintada encima del
 * texto en vez de empujarlo. La librería ya resuelve esto para `image`/
 * `hardbreak` marcándolos `block: true` en su propio
 * `util/cleanupTokens.js:11-13` — acá replicamos el mismo mecanismo.
 */
import MarkdownIt from 'markdown-it';

export function looksLikeMath(content) {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  if (words.length >= 3 && !/[\\^_=+\-*/]/.test(trimmed)) {
    return false;
  }
  return true;
}

export function mathRule(state, silent) {
  const src = state.src;
  const pos = state.pos;
  if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;

  const isBlock = src.charCodeAt(pos + 1) === 0x24;
  const marker = isBlock ? '$$' : '$';
  const searchFrom = pos + marker.length;
  const end = src.indexOf(marker, searchFrom);
  if (end === -1) return false;

  const content = src.slice(searchFrom, end);
  if (!content.trim()) return false;
  if (!isBlock && content.includes('\n')) return false;
  if (!looksLikeMath(content)) return false;

  if (!silent) {
    const token = state.push(isBlock ? 'math_block' : 'math_inline', 'math', 0);
    token.content = content.trim();
    // Ver comentario de cabecera del archivo — sin esto, el token termina
    // metido dentro de un <Text> y la ecuación puede superponerse al texto.
    token.block = true;
  }
  state.pos = end + marker.length;
  return true;
}

export function createMathMarkdownIt() {
  const md = new MarkdownIt({ typographer: true });
  md.inline.ruler.push('math', mathRule);
  return md;
}
