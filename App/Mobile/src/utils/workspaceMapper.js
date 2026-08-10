/**
 * workspaceMapper.js
 *
 * Traduce el resultado plano de GET /jobs/{id}/result (vw_stt_recording_result)
 * al modelo Document/DocumentSection/Paragraph que consume el Knowledge Workspace
 * (ver App/tasks/knowledge_workspace_mockup_description.md).
 *
 * No conoce React Native ni hace fetch — función pura, fácil de testear en aislamiento.
 *
 * interface Paragraph { type: 'text'|'quote'|'image', content?, quote?, author?, image?, caption? }
 * interface DocumentSection { id, number, title, paragraphs: Paragraph[], rich?: boolean }
 * interface WorkspaceDocument { key, label, sections: DocumentSection[] }
 *
 * `rich: true` en una sección le dice a ReaderCard que renderice sus párrafos
 * `text` con `RichMarkdown` (Markdown + LaTeX real vía WebView/KaTeX — ver
 * `components/workspace/RichMarkdown.jsx`) en vez de <Text> plano.
 *
 * summary_text/notes_json vienen de gpt-5-mini con los prompts de
 * `App/procesamiento/prompts/` — piden explícitamente Markdown para
 * estructura y LaTeX ("$...$"/"$$...$$") para matemáticas, así que ese texto
 * NO se sanitiza acá, se pasa crudo (`rich: true`).
 *
 * transcription_text es la salida directa de Fast Transcription (Azure AI
 * Speech) — nunca pasa por esos prompts, nunca tiene Markdown/LaTeX real, y
 * no vale la pena el costo de un renderizador ahí (`rich: false` /
 * ausente — sigue usando <Text> plano con drop cap).
 */

function textParagraph(content) {
  return { type: 'text', content: String(content ?? '').trim() };
}

function splitIntoParagraphs(text) {
  if (!text) return [];
  return String(text)
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(textParagraph);
}

// ── Resumen ──────────────────────────────────────────────────────────────────
// summary_text viene con encabezados H1 reales ("# Executive Summary",
// "# Main Topics", "# Key Insights", "# Decisions", "# Final Conclusion" —
// ver procesamiento/prompts/summary.md) y ecuaciones LaTeX. Se parte por esos
// límites de "# " en una sección por heading — mismo patrón que
// buildConceptSection para Notas — así Resumen también pagina en vez de ser
// un único scroll largo. El heading en sí no se duplica dentro del cuerpo:
// se usa como `section.title` (ReaderCard ya lo muestra aparte), solo el
// resto del texto de esa sección va a `paragraphs`.

function splitResumenSections(summaryText) {
  const text = String(summaryText).trim();
  const headingMatches = [...text.matchAll(/^# (.+)$/gm)];

  if (headingMatches.length === 0) {
    // Sin headings H1 (resumen corto/sin estructura) — una sola sección,
    // mismo comportamiento que antes de paginar.
    return [{
      id: 'resumen-1',
      number: '1',
      title: 'Resumen',
      rich: true,
      paragraphs: [textParagraph(text)],
    }];
  }

  return headingMatches.map((match, i) => {
    const start = match.index;
    const end = i + 1 < headingMatches.length ? headingMatches[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    const newlineIndex = chunk.indexOf('\n');
    const body = (newlineIndex === -1 ? '' : chunk.slice(newlineIndex + 1)).trim();
    return {
      id: `resumen-${i + 1}`,
      number: String(i + 1),
      title: match[1].trim(),
      rich: true,
      paragraphs: body ? [textParagraph(body)] : [],
    };
  });
}

function buildResumenDocument(result) {
  if (!result.summary_text) {
    return { key: 'resumen', label: 'Resumen', sections: [] };
  }
  return {
    key: 'resumen',
    label: 'Resumen',
    sections: splitResumenSections(result.summary_text),
  };
}

// ── Notas ────────────────────────────────────────────────────────────────────
// Estructura real: notes_json.concepts[] → una sección por concepto, todas
// `rich: true`. overview abre como introducción; examples/important_details/
// key_takeaways cierran como sección final (son arrays planos, no van por
// concepto) — se arman como listas Markdown reales, no con "•" a mano.

function buildIntroSection(notesJson) {
  if (!notesJson.overview) return null;
  return {
    id: 'notas-intro',
    number: '0',
    title: notesJson.title || 'Introducción',
    rich: true,
    paragraphs: [textParagraph(notesJson.overview)],
  };
}

function buildConceptSection(concept, index) {
  const paragraphs = [
    concept.definition && textParagraph(concept.definition),
    concept.explanation && textParagraph(concept.explanation),
    concept.context && textParagraph(concept.context),
    concept.observations && textParagraph(concept.observations),
  ].filter(Boolean);

  if (paragraphs.length === 0) return null;

  return {
    id: `concept-${index}`,
    number: String(index + 1),
    title: concept.name || `Concepto ${index + 1}`,
    rich: true,
    paragraphs,
  };
}

// examples[] no siempre es string — confirmado contra datos reales de
// producción (SELECT jsonb_typeof(e) FROM stt_recording_result, ...): el
// modelo a veces describe un ejercicio resuelto como objeto estructurado
// ({problem, solution, steps, notes...}) en vez de una línea plana, y las
// claves usadas varían entre jobs (title/problem/statement/context/steps/
// solution/result/notes/observations/description — 10 distintas). Sin este
// manejo, el template literal de más abajo coacciona el objeto a
// "[object Object]". Cualquier clave no listada igual se muestra (con su
// nombre tal cual) — nunca se descarta contenido silenciosamente.
const EXAMPLE_FIELD_LABELS = {
  title: 'Título',
  problem: 'Problema',
  statement: 'Enunciado',
  context: 'Contexto',
  steps: 'Pasos',
  solution: 'Solución',
  result: 'Resultado',
  notes: 'Notas',
  observations: 'Observaciones',
  description: 'Descripción',
};

function formatExample(example) {
  if (typeof example === 'string') return example;
  if (!example || typeof example !== 'object') return String(example ?? '');

  return Object.entries(example)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => {
      const label = EXAMPLE_FIELD_LABELS[key] || key;
      const text = Array.isArray(value) ? value.join(' → ') : String(value);
      return `**${label}:** ${text}`;
    })
    .join('  \n'); // "  \n" = salto de línea Markdown dentro del mismo ítem
}

function buildClosingSection(notesJson, sectionNumber) {
  const blocks = [
    notesJson.key_takeaways?.length && {
      label: 'Puntos clave',
      lines: notesJson.key_takeaways,
    },
    notesJson.important_details?.length && {
      label: 'Detalles importantes',
      lines: notesJson.important_details,
    },
    notesJson.examples?.length && {
      label: 'Ejemplos',
      lines: notesJson.examples.map(formatExample),
    },
  ].filter(Boolean);

  if (blocks.length === 0) return null;

  // Lista Markdown real ("## Label" + "- item") — RichMarkdown la renderiza
  // como encabezado + <ul> de verdad, no como texto con "•" a mano.
  const paragraphs = blocks.map(block =>
    textParagraph(`## ${block.label}\n\n${block.lines.map(l => `- ${l}`).join('\n')}`)
  );

  return {
    id: 'notas-cierre',
    number: String(sectionNumber),
    title: 'Puntos clave y ejemplos',
    rich: true,
    paragraphs,
  };
}

function buildNotasDocument(result) {
  const notesJson = result.notes_json;

  if (!notesJson) {
    // Sin estructura — fallback al texto plano como sección única.
    if (!result.notes_text) return { key: 'notas', label: 'Notas', sections: [] };
    return {
      key: 'notas',
      label: 'Notas',
      sections: [{
        id: 'notas-1',
        number: '1',
        title: 'Notas',
        rich: true,
        paragraphs: splitIntoParagraphs(result.notes_text),
      }],
    };
  }

  const sections = [];
  const intro = buildIntroSection(notesJson);
  if (intro) sections.push(intro);

  (notesJson.concepts ?? []).forEach((concept, i) => {
    const section = buildConceptSection(concept, i);
    if (section) sections.push(section);
  });

  const closing = buildClosingSection(notesJson, sections.length + 1);
  if (closing) sections.push(closing);

  // Renumerar en orden final para que la paginación sea consistente 1..N
  sections.forEach((s, i) => { s.number = String(i + 1); });

  return { key: 'notas', label: 'Notas', sections };
}

// ── Transcripción ────────────────────────────────────────────────────────────
// Sin segmentación semántica todavía (eso es V2 — Topics). Una sola sección,
// texto plano (`rich` ausente) — ver nota de cabecera del archivo.

function buildTranscripcionDocument(result) {
  if (!result.transcription_text) {
    return { key: 'transcripcion', label: 'Transcripción', sections: [] };
  }
  return {
    key: 'transcripcion',
    label: 'Transcripción',
    sections: [{
      id: 'transcripcion-1',
      number: '1',
      title: 'Transcripción completa',
      paragraphs: splitIntoParagraphs(result.transcription_text),
    }],
  };
}

/**
 * Traduce el resultado de /jobs/{id}/result a los 3 documentos que el
 * Workspace puede mostrar hoy (Resumen / Notas / Transcripción).
 * Bloques (mind map) y Audio (narración TTS) no pasan por este mapper —
 * son componentes aislados aparte, todavía no integrados a esta pantalla.
 */
export function mapJobResultToWorkspace(result) {
  return {
    documentTitle: result.blob_name || 'Knowledge Pack sin título',
    documents: {
      resumen: buildResumenDocument(result),
      notas: buildNotasDocument(result),
      transcripcion: buildTranscripcionDocument(result),
    },
  };
}
