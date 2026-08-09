/**
 * textFormat.js
 *
 * Limpia el texto que devuelve el pipeline de IA (gpt-5-mini) antes de
 * mostrarlo en el Knowledge Workspace. Los prompts de
 * `App/procesamiento/prompts/` no garantizan texto plano — el modelo suele
 * devolver sintaxis Markdown ("# Executive Summary", "**énfasis**", listas
 * con "- ") y expresiones matemáticas en LaTeX ("\frac{a}{b}", "x^2",
 * "\times"), que se veían literalmente en pantalla (símbolos crudos) porque
 * el Workspace renderiza todo con <Text> plano.
 *
 * A propósito NO se reintroduce un renderizador de Markdown/LaTeX (WebView,
 * KaTeX, etc.) — es la misma clase de riesgo que causó el rollback completo
 * de la Presentation Layer (ver App/Knowledge/Bugs/known-issues.md,
 * ISSUE-012) y el mismo criterio ya aplicado en MindMapDiagram. En vez de
 * renderizar el marcado, se lo traduce a texto plano legible: símbolos
 * Unicode para operadores/letras griegas comunes, superíndices/subíndices
 * Unicode para exponentes simples, fracciones como "a/b", y los marcadores
 * de Markdown se eliminan conservando la estructura de párrafos.
 *
 * Función pura, sin dependencias de React Native — fácil de ajustar o
 * testear en aislamiento si aparecen casos nuevos.
 */

const SUPERSCRIPTS = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ' };
const SUBSCRIPTS   = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋' };

const LATEX_SYMBOLS = [
  [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\div\b/g, '÷'], [/\\pm\b/g, '±'],
  [/\\leq\b/g, '≤'], [/\\geq\b/g, '≥'], [/\\neq\b/g, '≠'], [/\\approx\b/g, '≈'],
  [/\\infty\b/g, '∞'], [/\\rightarrow\b|\\to\b/g, '→'], [/\\leftarrow\b/g, '←'],
  [/\\partial\b/g, '∂'], [/\\sum\b/g, 'Σ'], [/\\prod\b/g, '∏'], [/\\int\b/g, '∫'],
  [/\\sqrt\{([^{}]*)\}/g, '√($1)'],
  [/\\pi\b/g, 'π'], [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'],
  [/\\delta\b/g, 'δ'], [/\\theta\b/g, 'θ'], [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'],
  [/\\sigma\b/g, 'σ'], [/\\omega\b/g, 'ω'], [/\\Omega\b/g, 'Ω'], [/\\Delta\b/g, 'Δ'],
];

function toScriptChars(map, raw) {
  return String(raw).split('').map(ch => map[ch] ?? ch).join('');
}

function convertScripts(text) {
  // Exponentes/subíndices: ^{ab}, ^2, ^10, ^-34, _{i}, _1 → Unicode cuando el
  // set de caracteres lo permite, si no deja "^(...)" / "_(...)" legible.
  // Antes solo capturaba UN carácter sin llaves (\w) — "x^10" salía "x¹0"
  // (rota). Ahora "-?\w+" toma la corrida completa (dígitos + signo).
  text = text.replace(/\^\{([^{}]+)\}|\^(-?\w+)/g, (_, braced, unbraced) => {
    const raw = braced ?? unbraced;
    const canMap = [...raw].every(ch => ch in SUPERSCRIPTS);
    return canMap ? toScriptChars(SUPERSCRIPTS, raw) : `^(${raw})`;
  });
  // Solo la forma con llaves para subíndices: "_" sin llaves es indistinguible
  // de un identificador snake_case ("mi_variable") — "x_1" y "mi_variable"
  // tienen la misma forma local (letra + "_" + letra/dígito). Con LaTeX ya
  // prohibido en los prompts (ver system.md), la forma sin llaves debería
  // ser rara de todos modos.
  text = text.replace(/_\{([^{}]+)\}/g, (_, braced) => {
    const canMap = [...braced].every(ch => ch in SUBSCRIPTS);
    return canMap ? toScriptChars(SUBSCRIPTS, braced) : `_(${braced})`;
  });
  return text;
}

function stripMarkdown(text) {
  return text
    // Encabezados "# Título" / "## Título" → línea propia, sin el marcador,
    // con separación de párrafo antes y después para que no se pegue al
    // texto siguiente.
    .replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, '\n$1\n')
    // Reglas horizontales ("---", "___", "***" en su propia línea)
    .replace(/^\s{0,3}([-*_]){3,}\s*$/gm, '')
    // Negrita / énfasis — conserva el texto, descarta los marcadores.
    // Ojo: no se toca "_" suelto (solo dentro de **/__ ya cubiertos arriba) —
    // términos con snake_case ("mi_variable") no deben perder los guiones bajos.
    // El "*" de énfasis exige contenido pegado al delimitador (sin espacio),
    // igual que CommonMark — evita comerse multiplicaciones en texto plano
    // como "3 * 4 * 5" (el "*" ahí queda separado por espacios).
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*|\s)(.+?)(?<!\s|\*)\*(?!\*)/g, '$1')
    // Código inline "`texto`"
    .replace(/`([^`]+)`/g, '$1')
    // Viñetas "- "/"* "/"+ " al inicio de línea → viñeta uniforme
    .replace(/^\s{0,3}[-*+]\s+/gm, '• ');
}

function stripLatex(text) {
  // Fracciones simples \frac{a}{b} → (a/b) — no soporta fracciones anidadas,
  // suficiente para el nivel de complejidad que produce el pipeline actual.
  text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1/$2)');

  LATEX_SYMBOLS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  text = convertScripts(text);

  return text
    // Delimitadores de modo matemático: \[ \] \( \) $$ $
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
    .replace(/\$\$?/g, '')
    // \text{...} → contenido sin el wrapper
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    // Cualquier comando LaTeX residual no mapeado arriba: "\comando" → "comando"
    .replace(/\\([a-zA-Z]+)/g, '$1')
    // Llaves sueltas que hayan quedado sin pareja reconocida
    .replace(/[{}]/g, '');
}

/**
 * Limpia un texto generado por IA para mostrarlo como texto plano legible.
 * Seguro de llamar con undefined/null/'' — devuelve '' en esos casos.
 */
export function cleanAIText(raw) {
  if (!raw) return '';
  let text = String(raw);

  text = stripMarkdown(text);
  text = stripLatex(text);

  // Colapsa 3+ saltos de línea a como máximo 2 (separador de párrafo) y
  // recorta espacios sueltos que dejan los reemplazos de arriba.
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
