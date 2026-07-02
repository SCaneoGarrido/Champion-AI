/**
 * Normaliza patrones matemáticos simples e inequívocos en texto plano hacia LaTeX,
 * envolviéndolos en $...$. Deliberadamente acotado — prioriza cero falsos positivos
 * sobre cobertura completa. Ver App/Knowledge/ADR/ADR-010-latex-rendering-fixes-and-block-renderer-architecture.md.
 *
 * Pensado para `transcription_text`: es salida literal de Fast Transcription, nunca
 * pasa por GPT, por lo tanto ningún cambio de prompt puede agregarle LaTeX — es la
 * única forma de que matemática simple en la transcripción se vea bien.
 *
 * Nota honesta de alcance: Fast Transcription transcribe PALABRAS, no símbolos — un
 * hablante diciendo "x al cuadrado" se transcribe como esas palabras, nunca como "x^2".
 * Este normalizador cubre el caso en que sí aparecen símbolos literales (contenido
 * técnico dictado con notación, texto mixto, superíndices unicode ya presentes) — no
 * intenta interpretar frases habladas ambiguas ("x sobre y", "raíz de x"), que tienen
 * alto riesgo de falso positivo sobre lenguaje natural normal. Está pensado para
 * crecer con patrones adicionales de forma incremental y revisable, no para resolver
 * el problema de una sola vez.
 *
 * Asume que el texto de entrada NO tiene delimitadores $...$ existentes (cierto para
 * transcription_text) — no está pensado para aplicarse sobre texto ya generado por GPT.
 */

// Exponente ASCII simple: base alfanumérica corta + ^ + exponente corto (o entre llaves).
// Ej: "x^2", "e^x", "10^{23}".
const CARET_EXPONENT_RE = /(?<!\$)\b([A-Za-z]|\d+)\^(\{[A-Za-z0-9+\-]{1,6}\}|[A-Za-z0-9])(?![A-Za-z0-9])/g;

// Dígitos superíndice unicode (⁰¹²³⁴⁵⁶⁷⁸⁹) pegados a una base alfanumérica — ej "x²", "10³".
// Ya son legibles como texto plano, pero convertirlos a LaTeX real da estilo visual
// consistente con el resto del contenido matemático del documento.
const SUPERSCRIPT_DIGITS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
// (?<!\$) evita re-matchear dentro de un $...$ que la propia normalización ya insertó
// (o texto que ya viniera envuelto en LaTeX) — sin esto, dos pasadas sobre la misma
// base ("x²" → "$x^{2}$") produce doble-wrapping ("$$x^{2}$$").
const SUPERSCRIPT_RE = /(?<!\$)([A-Za-z0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;

export function normalizeMathText(text) {
  if (!text) return text;

  let result = text.replace(SUPERSCRIPT_RE, (match, base, digits) => {
    const exponent = digits.split('').map(d => SUPERSCRIPT_DIGITS[d]).join('');
    return `$${base}^{${exponent}}$`;
  });

  result = result.replace(CARET_EXPONENT_RE, (match, base, exp) => {
    const exponent = exp.startsWith('{') ? exp : `{${exp}}`;
    return `$${base}^${exponent}$`;
  });

  return result;
}
