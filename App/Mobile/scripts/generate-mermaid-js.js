/**
 * Genera src/assets/mermaidEmbedded.js: el bundle IIFE de mermaid.js embebido
 * como string, para inyectarlo dentro de un <script> en el WebView de
 * MermaidRenderer.jsx — 100% offline, sin fetch a CDN.
 *
 * Se corre una sola vez (o cuando se actualice la versión de `mermaid`), no en cada build.
 * Uso: node scripts/generate-mermaid-js.js
 */
const fs = require('fs');
const path = require('path');

const SRC_FILE = path.resolve(__dirname, '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'assets', 'mermaidEmbedded.js');

const js = fs.readFileSync(SRC_FILE, 'utf8');

const out = `/**
 * GENERADO por App/Mobile/scripts/generate-mermaid-js.js — no editar a mano.
 * Bundle de node_modules/mermaid/dist/mermaid.min.js embebido como string,
 * para inyectar dentro de un <script> en el WebView (ver MermaidRenderer.jsx).
 * Expone globalThis.mermaid una vez ejecutado dentro del WebView.
 */
export const MERMAID_JS = ${JSON.stringify(js)};
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, out, 'utf8');

const sizeMB = (Buffer.byteLength(out) / 1024 / 1024).toFixed(2);
console.log(`OK: ${OUT_FILE} (${sizeMB} MB)`);
