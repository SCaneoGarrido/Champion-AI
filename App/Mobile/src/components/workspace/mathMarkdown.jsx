/**
 * mathMarkdown — capa de renderizado React sobre la regla de markdown-it
 * definida en `mathMarkdownRule.js` (lógica pura, separada para poder
 * testearse con Node sin JSX). Compartida por todo lo que renderiza
 * contenido generado por IA (RichMarkdown.jsx → Resumen/Notas,
 * MindMapDiagram.jsx → nombres de nodo).
 *
 * Reemplaza el enfoque anterior (preprocesar el texto con regex y disfrazar
 * cada fórmula de `![inline](math://<url-encoded-latex>)` para que
 * react-native-markdown-display la intercepte vía su regla `image`) por una
 * regla inline real registrada en el propio parser. Motivo: ese hack
 * generaba, ante ciertos inputs, texto literal `![inline](math://...)` o
 * `%28`/`%29` visible al usuario cuando el encode/decode o el tokenizado de
 * markdown-it fallaba. `$` (0x24) ya está reservado como carácter terminador
 * de la regla `text` de markdown-it (ver `node_modules/markdown-it/lib/
 * rules_inline/text.js`, comentario propio de la librería: "reserved for
 * extentions") — está pensado para enganchar acá, no es un truco.
 *
 * `react-native-markdown-display` no limita los tipos de token a una lista
 * conocida (`AstRenderer.getRenderFunction` busca en `rules[type]` sin
 * whitelist), así que un token `math_inline`/`math_block` custom se renderiza
 * igual que cualquier tipo nativo, vía `mathRenderRules`.
 */
import React from 'react';
import MathView from './MathView';

export { createMathMarkdownIt } from './mathMarkdownRule';

export const mathRenderRules = {
  math_inline: (node) => (
    <MathView key={node.key} latex={node.content} block={false} />
  ),
  math_block: (node) => (
    <MathView key={node.key} latex={node.content} block />
  ),
};
