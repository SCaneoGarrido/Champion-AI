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
// Una sola sección, `rich: true` — summary_text ya viene en Markdown con sus
// propios encabezados ("# Executive Summary", "## ...") y ecuaciones LaTeX,
// así que se pasa entero a RichMarkdown en vez de forzarlo dentro de un
// AIQuoteCard (tenía sentido cuando era una sola cita de texto plano, ya no
// cuando es un documento Markdown con su propia jerarquía).

function buildResumenDocument(result) {
  if (!result.summary_text) {
    return { key: 'resumen', label: 'Resumen', sections: [] };
  }
  return {
    key: 'resumen',
    label: 'Resumen',
    sections: [{
      id: 'resumen-1',
      number: '1',
      title: 'Resumen',
      rich: true,
      paragraphs: [textParagraph(result.summary_text)],
    }],
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
      lines: notesJson.examples,
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
