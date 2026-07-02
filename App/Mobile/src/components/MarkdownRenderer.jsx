/**
 * Renderiza Markdown (summary_text / notes_text) con componentes nativos.
 * El usuario nunca debe ver sintaxis Markdown sin procesar — ver App/rules/mobile-rendering.md (R-RENDER-01).
 */
import React, { useMemo } from 'react';
import { Text } from 'react-native';
import Markdown, { renderRules as defaultRenderRules } from 'react-native-markdown-display';
import MarkdownIt from 'markdown-it';
import multimdTable from 'markdown-it-multimd-table';
import taskLists from 'markdown-it-task-lists';
import katexPlugin from 'markdown-it-katex';
import { useTheme } from '../context/ThemeContext';
import { createMarkdownStyles } from './MarkdownRenderer.styles';
import LatexView from './LatexView';

// Instancia única — markdown-it no depende del tema, se reutiliza entre renders.
// markdown-it-katex registra los tokens math_inline/math_block (contenido = LaTeX crudo);
// su propio renderer HTML no se usa acá (react-native-markdown-display no llama a
// md.renderer.render(), solo consume el stream de tokens) — el HTML sí se usa en pdfExport.js.
const markdownItInstance = new MarkdownIt({ typographer: true })
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true, multibody: true })
  .use(taskLists, { enabled: true, label: false })
  .use(katexPlugin);

function isChecklistItem(node) {
  const cls = node?.attributes?.class;
  return typeof cls === 'string' && cls.includes('task-list-item');
}

function checklistGlyph(node) {
  const html = node?.content || '';
  if (!html.includes('task-list-item-checkbox')) return undefined; // no es nuestro token
  return html.includes('checked=') ? '☑ ' : '☐ ';
}

/**
 * markdown-it-task-lists emite un token html_inline crudo (RN no renderiza HTML arbitrario).
 * Lo interceptamos: si es el checkbox de una checklist, mostramos un glifo nativo;
 * cualquier otro HTML inesperado no se muestra (fallback seguro, nunca texto crudo).
 */
function renderHtmlInline(node, children, parent, styles) {
  const glyph = checklistGlyph(node);
  if (glyph === undefined) return null;
  return (
    <Text key={node.key} style={styles.taskCheckbox}>
      {glyph}
    </Text>
  );
}

/**
 * list_item por defecto siempre antepone una viñeta/número. Para items de checklist
 * (detectados por la clase que agrega markdown-it-task-lists) omitimos la viñeta —
 * el checkbox ya lo agrega renderHtmlInline como el primer child. Para el resto,
 * delegamos a la regla original de la librería (bullet/número).
 */
function renderListItem(node, children, parent, styles, inheritedStyles) {
  if (isChecklistItem(node)) {
    return (
      <Text key={node.key} style={styles.list_item}>
        {children}
      </Text>
    );
  }
  return defaultRenderRules.list_item(node, children, parent, styles, inheritedStyles);
}

function renderMathInline(node) {
  return <LatexView key={node.key} latex={node.content} displayMode={false} />;
}

function renderMathBlock(node) {
  return <LatexView key={node.key} latex={node.content} displayMode />;
}

/**
 * Punto de extensión preparado para Mermaid embebido dentro de un documento Markdown
 * (```mermaid ... ``` en summary_text/notes_text), distinto del mapa mental dedicado
 * (MermaidRenderer.jsx, atado a mind_map_mermaid_code). NO implementado todavía —
 * ver ADR-010 en el Knowledge Vault para por qué y qué falta (resolver caché por
 * bloque dentro de un documento arbitrario antes de generalizar MermaidRenderer).
 * Hoy delega al renderer de código por defecto — mismo resultado visual que un
 * bloque ```mermaid sin esta regla.
 */
function renderFence(node, children, parent, styles, inheritedStyles) {
  if (node?.sourceInfo?.trim() === 'mermaid') {
    // TODO(mermaid-in-markdown): reemplazar por un MermaidRenderer generalizado.
  }
  return defaultRenderRules.fence(node, children, parent, styles, inheritedStyles);
}

const customRules = {
  html_inline: renderHtmlInline,
  html_block: renderHtmlInline,
  list_item: renderListItem,
  math_inline: renderMathInline,
  math_block: renderMathBlock,
  fence: renderFence,
};

export default function MarkdownRenderer({ content }) {
  const { colors, darkMode } = useTheme();
  const styles = useMemo(() => createMarkdownStyles(colors, darkMode), [colors, darkMode]);

  if (!content) return null;

  return (
    <Markdown style={styles} rules={customRules} markdownit={markdownItInstance}>
      {content}
    </Markdown>
  );
}
