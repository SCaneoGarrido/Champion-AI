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
 * El LaTeX se reconoce vía una regla real de markdown-it (`mathMarkdown.jsx`,
 * tokens `math_inline`/`math_block`), no vía preprocesamiento de texto — ver
 * el comentario de cabecera de ese archivo para el porqué del cambio.
 *
 * `style` es opcional: se mergea (shallow, por clave de nivel superior) sobre
 * `RichMarkdown.styles.js` — lo usa `MindMapDiagram.jsx` para que las
 * fórmulas de los nodos hereden la tipografía del chip (color/tamaño por
 * profundidad) en vez de la tipografía por defecto de Resumen/Notas.
 */
import React from 'react';
import Markdown from 'react-native-markdown-display';
import { createMathMarkdownIt, mathRenderRules } from './mathMarkdown';
import markdownStyles from './RichMarkdown.styles';

const mathMarkdownIt = createMathMarkdownIt();

export default function RichMarkdown({ content, style }) {
  if (!content?.trim()) return null;

  const mergedStyle = style ? { ...markdownStyles, ...style } : markdownStyles;

  return (
    <Markdown markdownit={mathMarkdownIt} style={mergedStyle} rules={mathRenderRules}>
      {content}
    </Markdown>
  );
}
