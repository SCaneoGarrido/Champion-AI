import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import MarkdownIt from 'markdown-it';
import multimdTable from 'markdown-it-multimd-table';
import taskLists from 'markdown-it-task-lists';
import katexPlugin from 'markdown-it-katex';
import { KATEX_CSS } from '../assets/katexEmbedded';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Mismo motor y mismos plugins que MarkdownRenderer.jsx (App/rules/mobile-rendering.md, R-RENDER-04)
// Acá sí se deja pasar el HTML crudo del checkbox de markdown-it-task-lists: en un PDF (a
// diferencia de React Native) es HTML válido y renderiza como checkbox real.
// markdown-it-katex sí usa acá su renderer HTML (a diferencia de MarkdownRenderer.jsx):
// expo-print renderiza el HTML final directo, sin necesidad de WebView/postMessage.
const markdownItInstance = new MarkdownIt({ typographer: true, html: false })
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true, multibody: true })
  .use(taskLists, { enabled: true, label: false })
  .use(katexPlugin);

function renderMarkdown(text) {
  if (!text) return '';
  return markdownItInstance.render(text);
}

function mindMapNodesToHtml(nodes = [], depth = 0) {
  if (!nodes?.length) return '';
  const isRoot = depth === 0;
  const color = isRoot ? '#1a1a1a' : '#504534';
  const weight = isRoot ? '700' : '500';
  const bullet = isRoot ? '◆' : depth === 1 ? '▸' : '–';

  return nodes.map(node => `
    <li style="margin: ${isRoot ? 8 : 4}px 0; padding-left: ${depth * 18}px; color: ${color}; font-weight: ${weight}; font-size: ${isRoot ? 13 : 12}px;">
      <span style="color: #c9920a; margin-right: 6px;">${bullet}</span>${escapeHtml(node.name)}
      ${node.children?.length ? `<ul style="list-style:none; padding:0;">${mindMapNodesToHtml(node.children, depth + 1)}</ul>` : ''}
    </li>
  `).join('');
}

function buildHtml(jobName, result) {
  const date = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Presentation Layer: si ya hay un SVG cacheado (renderizado por el cliente), se embebe
  // directo — expo-print soporta SVG inline sin problema. Si no, cae al renderer de lista
  // (mismo fallback que el cliente — ver App/rules/mobile-rendering.md R-RENDER-05/08).
  const mindMapHtml = result.mind_map_svg
    ? `<div class="mindmap-svg">${result.mind_map_svg}</div>`
    : result.mind_map_json?.nodes?.length
      ? `<ul style="list-style:none; padding:0;">${mindMapNodesToHtml(result.mind_map_json.nodes)}</ul>`
      : '<p class="empty">Sin datos.</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${KATEX_CSS}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px 44px; }
    .brand { font-size: 11px; font-weight: 800; color: #c9920a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    h1 { font-size: 24px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; line-height: 1.2; }
    .date { font-size: 11px; color: #827562; margin-bottom: 40px; }
    hr { border: none; border-top: 1.5px solid rgba(201,146,10,0.2); margin-bottom: 32px; }
    .section { margin-bottom: 36px; }
    .section-label { font-size: 10px; font-weight: 800; color: #c9920a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
    .section-body { font-size: 13px; line-height: 1.75; color: #1a1a1a; word-break: break-word; }
    .section-body.plain { white-space: pre-wrap; }
    .section-body h1, .section-body h2, .section-body h3, .section-body h4, .section-body h5, .section-body h6 {
      color: #1a1a1a; margin: 18px 0 8px; line-height: 1.3;
    }
    .section-body h1 { font-size: 20px; } .section-body h2 { font-size: 17px; }
    .section-body h3 { font-size: 15px; } .section-body h4, .section-body h5, .section-body h6 { font-size: 13px; }
    .section-body p { margin: 8px 0; }
    .section-body ul, .section-body ol { padding-left: 22px; margin: 8px 0; }
    .section-body li { margin: 4px 0; }
    .section-body blockquote { border-left: 3px solid #c9920a; background: #f6f3f2; margin: 10px 0; padding: 6px 12px; color: #504534; }
    .section-body code { font-family: Courier, monospace; background: #f6f3f2; border: 1px solid #ccc; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
    .section-body pre { font-family: Courier, monospace; background: #f6f3f2; border: 1px solid #ccc; border-radius: 6px; padding: 10px; overflow-x: auto; }
    .section-body pre code { border: none; padding: 0; }
    .section-body table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    .section-body th, .section-body td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
    .section-body th { background: #f6f3f2; font-weight: 800; }
    .section-body strong { font-weight: 800; }
    .section-body a { color: #c9920a; }
    ul { list-style: none; padding: 0; }
    .mindmap-svg svg { max-width: 100%; height: auto; }
    .empty { font-size: 13px; color: #827562; }
    .footer { margin-top: 52px; font-size: 10px; color: #827562; text-align: center; letter-spacing: 1.5px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="brand">Champion AI</div>
  <h1>${escapeHtml(jobName)}</h1>
  <div class="date">${date}</div>
  <hr/>

  <div class="section">
    <div class="section-label">Transcripción</div>
    <div class="section-body plain">${escapeHtml(result.transcription_text) || '<span class="empty">Sin datos.</span>'}</div>
  </div>

  <div class="section">
    <div class="section-label">Resumen</div>
    <div class="section-body">${renderMarkdown(result.summary_text) || '<span class="empty">Sin datos.</span>'}</div>
  </div>

  <div class="section">
    <div class="section-label">Notas</div>
    <div class="section-body">${renderMarkdown(result.notes_text) || '<span class="empty">Sin datos.</span>'}</div>
  </div>

  <div class="section">
    <div class="section-label">Mapa Mental</div>
    ${mindMapHtml}
  </div>

  <div class="footer">Champion AI &copy; ${new Date().getFullYear()}</div>
</body>
</html>`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Genera un PDF con el resultado completo del job y abre el diálogo de compartir.
 * @param {string} jobName  Nombre del apunte (blob_name o job_id truncado)
 * @param {object} result   Objeto devuelto por GET /jobs/:id/result
 */
export async function exportJobToPDF(jobName, result) {
  const html = buildHtml(jobName, result);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartir archivos no está disponible en este dispositivo.');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Guardar ${jobName}`,
    UTI: 'com.adobe.pdf',
  });
}
