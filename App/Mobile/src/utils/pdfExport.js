import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

  const mindMapHtml = result.mind_map_json?.nodes?.length
    ? `<ul style="list-style:none; padding:0;">${mindMapNodesToHtml(result.mind_map_json.nodes)}</ul>`
    : '<p class="empty">Sin datos.</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px 44px; }
    .brand { font-size: 11px; font-weight: 800; color: #c9920a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    h1 { font-size: 24px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; line-height: 1.2; }
    .date { font-size: 11px; color: #827562; margin-bottom: 40px; }
    hr { border: none; border-top: 1.5px solid rgba(201,146,10,0.2); margin-bottom: 32px; }
    .section { margin-bottom: 36px; }
    .section-label { font-size: 10px; font-weight: 800; color: #c9920a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
    .section-body { font-size: 13px; line-height: 1.75; color: #1a1a1a; white-space: pre-wrap; word-break: break-word; }
    ul { list-style: none; padding: 0; }
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
    <div class="section-body">${escapeHtml(result.transcription_text) || '<span class="empty">Sin datos.</span>'}</div>
  </div>

  <div class="section">
    <div class="section-label">Resumen</div>
    <div class="section-body">${escapeHtml(result.summary_text) || '<span class="empty">Sin datos.</span>'}</div>
  </div>

  <div class="section">
    <div class="section-label">Notas</div>
    <div class="section-body">${escapeHtml(result.notes_text) || '<span class="empty">Sin datos.</span>'}</div>
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
