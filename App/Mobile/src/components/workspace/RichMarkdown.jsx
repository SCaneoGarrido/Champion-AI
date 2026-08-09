/**
 * RichMarkdown — Markdown real + LaTeX real para el contenido generado por
 * IA del Knowledge Workspace.
 *
 * Reemplaza el enfoque anterior (limpiar el Markdown/LaTeX a texto plano con
 * `utils/textFormat.js`) por decisión explícita: se acepta el riesgo de
 * reintroducir un renderizador Markdown/LaTeX en mobile — la misma clase de
 * tecnología del rollback de ISSUE-012 — a cambio de tipografía matemática
 * real. Ver el comentario de cabecera de `MathView.jsx` para el detalle de
 * mitigación (WebView acotado a una fórmula por instancia, nunca al
 * documento completo).
 *
 * Truco de integración: react-native-markdown-display (markdown-it por
 * debajo) no entiende "$...$"/"$$...$$" de forma nativa — en vez de sumar un
 * plugin de markdown-it + la librería katex completa en JS, se preprocesa el
 * texto reemplazando cada expresión matemática por sintaxis de imagen
 * Markdown está (`![block](math://...)`), que markdown-it YA parsea sin
 * plugins. La regla `image` se sobreescribe para interceptar esas URLs
 * "math://" y renderizar `MathView` en vez de una imagen real — no hay
 * colisión posible porque ningún paso del pipeline genera imágenes todavía
 * (ver `ImageCard.jsx`).
 */
import React from 'react';
import Markdown from 'react-native-markdown-display';
import MathView from './MathView';
import markdownStyles from './RichMarkdown.styles';

function encodeMathUrl(tex) {
  // encodeURIComponent no escapa "(" ")" — y esos cierran la sintaxis
  // ![alt](url) de Markdown antes de tiempo si el LaTeX los contiene
  // (ej. "\left(x\right)"), así que se escapan aparte.
  return encodeURIComponent(tex).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function injectMathPlaceholders(raw) {
  if (!raw) return '';
  let text = String(raw);
  // Bloque "$$...$$" primero — si no, el regex de inline vería cada "$$"
  // como dos delimitadores inline vacíos.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    `\n\n![block](math://${encodeMathUrl(tex.trim())})\n\n`
  );
  // Inline "$...$" — no cruza líneas, para no comerse texto de más si un
  // "$" suelto quedó sin cerrar.
  text = text.replace(/\$([^\n$]+?)\$/g, (_, tex) =>
    `![inline](math://${encodeMathUrl(tex.trim())})`
  );
  return text;
}

const rules = {
  image: (node) => {
    const { src, alt } = node.attributes || {};
    if (typeof src === 'string' && src.startsWith('math://')) {
      const latex = decodeURIComponent(src.slice('math://'.length));
      return <MathView key={node.key} latex={latex} block={alt === 'block'} />;
    }
    // Ningún otro flujo genera imágenes reales todavía — no renderizar nada
    // en vez de intentar cargar una URL que no es una imagen real.
    return null;
  },
};

export default function RichMarkdown({ content }) {
  if (!content?.trim()) return null;
  const prepared = injectMathPlaceholders(content);

  return (
    <Markdown style={markdownStyles} rules={rules}>
      {prepared}
    </Markdown>
  );
}
