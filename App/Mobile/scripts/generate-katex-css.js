/**
 * Genera src/assets/katexEmbedded.js: el CSS de KaTeX con las fuentes woff2
 * embebidas como data URI, para que LatexView.jsx pueda pasarle un HTML
 * 100% autocontenido a react-native-webview (sin resolver rutas de archivo
 * relativas, sin depender del pipeline de assets de Metro para las fuentes).
 *
 * Se corre una sola vez (o cuando se actualice la versión de `katex`), no en cada build.
 * Uso: node scripts/generate-katex-css.js
 */
const fs = require('fs');
const path = require('path');

const KATEX_DIST = path.resolve(__dirname, '..', 'node_modules', 'katex', 'dist');
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'assets', 'katexEmbedded.js');

let css = fs.readFileSync(path.join(KATEX_DIST, 'katex.min.css'), 'utf8');

// Reemplaza cada url(fonts/NAME.woff2) por un data URI base64, y elimina los
// fallbacks .woff/.ttf (solo nos importa woff2 — soportado por WKWebView/Android WebView modernos).
css = css.replace(
  /url\(fonts\/([^)]+\.woff2)\) format\("woff2"\),url\(fonts\/[^)]+\.woff\) format\("woff"\),url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g,
  (match, fontFile) => {
    const fontPath = path.join(KATEX_DIST, 'fonts', fontFile);
    const base64 = fs.readFileSync(fontPath).toString('base64');
    return `url(data:font/woff2;base64,${base64}) format("woff2")`;
  },
);

const remainingRefs = css.match(/url\(fonts\//g);
if (remainingRefs) {
  throw new Error(`Quedaron ${remainingRefs.length} referencias a fonts/ sin reemplazar — revisar el regex.`);
}

const out = `/**
 * GENERADO por App/Mobile/scripts/generate-katex-css.js — no editar a mano.
 * CSS de KaTeX (node_modules/katex/dist/katex.min.css) con fuentes woff2 embebidas
 * como data URI, para uso 100% offline dentro de un WebView (ver LatexView.jsx).
 */
export const KATEX_CSS = ${JSON.stringify(css)};
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, out, 'utf8');

const sizeKB = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`OK: ${OUT_FILE} (${sizeKB} KB)`);
