/**
 * Renderiza una expresión LaTeX ($...$ / $$...$$) usando KaTeX.
 *
 * katex.renderToString() no necesita DOM — corre directo en el JS thread de RN
 * y produce HTML+CSS estático. El WebView solo se usa para *mostrar* ese HTML
 * (layout CSS real: fracciones, raíces, matrices, posicionamiento de sub/superíndices —
 * imposible de replicar con flexbox/Text de RN). Ver App/Knowledge/ADR/ADR-008-client-side-rendering.md.
 *
 * El CSS de KaTeX (con las fuentes woff2 embebidas como data URI) vive en
 * src/assets/katexEmbedded.js — HTML 100% autocontenido, sin red, sin rutas de archivo.
 *
 * Medición de tamaño (ver ADR-010 y App/rules/mobile-rendering.md R-RENDER-09):
 * las fuentes web, aunque estén embebidas, cargan de forma asíncrona dentro del WebView.
 * Medir una sola vez de forma síncrona corre el riesgo de medir contra la fuente de
 * fallback (más chica) y fijar ese tamaño incorrecto para siempre en el layout de RN,
 * mientras el contenido real se dibuja por encima de lo que sigue. Se combina reporte
 * inmediato + document.fonts.ready + ResizeObserver para autocorregirse.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import katex from 'katex';
import { useTheme } from '../context/ThemeContext';
import { KATEX_CSS } from '../assets/katexEmbedded';

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderKatexHtml(latex, displayMode) {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode, output: 'html' });
  } catch (_e) {
    // Nunca mostrar el error crudo de KaTeX — degradar al texto LaTeX original visible
    // (sigue siendo información útil, y no rompe la pantalla). Ver R-RENDER-05.
    return `<span>${escapeHtml(latex)}</span>`;
  }
}

function buildDocument({ katexHtml, displayMode, textColor }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
${KATEX_CSS}
html, body { margin: 0; padding: 0; background: transparent; }
body {
  display: inline-flex;
  ${displayMode ? 'justify-content: center;' : 'justify-content: flex-start;'}
  color: ${textColor};
  font-size: 1.12em;
}
</style>
</head>
<body>
<span id="math-root">${katexHtml}</span>
<script>
  function reportSize() {
    var el = document.getElementById('math-root');
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      width: Math.ceil(rect.width) + 4,
      height: Math.ceil(rect.height) + 4,
    }));
  }

  // Reporte inmediato (best-effort) + al terminar de cargar fuentes (causa raíz del bug
  // de superposición) + ResizeObserver como red de seguridad genérica ante cualquier
  // otro cambio de layout. Ver ADR-010.
  reportSize();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reportSize).catch(function () {});
  }
  if (window.ResizeObserver) {
    new ResizeObserver(reportSize).observe(document.getElementById('math-root'));
  }
</script>
</body>
</html>`;
}

const DEFAULT_SIZE = { width: 60, height: 24 };
const DEFAULT_BLOCK_SIZE = { width: 200, height: 48 };
const CONTAINER_WIDTH_FALLBACK = 320;

export default function LatexView({ latex, displayMode = false }) {
  const { colors } = useTheme();
  const [size, setSize] = useState(displayMode ? DEFAULT_BLOCK_SIZE : DEFAULT_SIZE);
  const [ready, setReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState(CONTAINER_WIDTH_FALLBACK);

  const html = useMemo(
    () => buildDocument({ katexHtml: renderKatexHtml(latex, displayMode), displayMode, textColor: colors.text }),
    [latex, displayMode, colors.text],
  );

  const handleMessage = (event) => {
    try {
      const { width, height } = JSON.parse(event.nativeEvent.data);
      if (width > 0 && height > 0) setSize({ width, height });
    } catch (_e) {
      // ignorar mensajes inesperados
    } finally {
      setReady(true);
    }
  };

  const handleOuterLayout = (event) => {
    const w = event.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  };

  // Scroll horizontal SOLO cuando la ecuación excede el ancho disponible medido —
  // nunca se encoge la fuente para que quepa (R-RENDER-10, ilegible en fórmulas complejas).
  const needsScroll = size.width > containerWidth;
  const visibleWidth = needsScroll ? containerWidth : size.width;

  return (
    <View
      style={displayMode ? styles.blockOuter : styles.inlineOuter}
      onLayout={handleOuterLayout}
    >
      <ScrollView
        horizontal
        scrollEnabled={needsScroll}
        showsHorizontalScrollIndicator={needsScroll}
        style={{ width: visibleWidth, maxWidth: containerWidth }}
      >
        <View
          style={[
            styles.content,
            { width: size.width, height: size.height, alignItems: displayMode ? 'center' : 'flex-start' },
          ]}
        >
          {!ready && <ActivityIndicator size="small" color={colors.primary} />}
          <WebView
            source={{ html }}
            onMessage={handleMessage}
            originWhitelist={['*']}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            style={[styles.webview, { opacity: ready ? 1 : 0 }]}
            containerStyle={styles.webviewContainer}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modo bloque ($$...$$): ancho completo + margen vertical propio para no quedar
  // pegado al texto siguiente (antes no tenía ningún margen).
  blockOuter: { width: '100%', marginVertical: 10 },
  inlineOuter: { alignSelf: 'flex-start' },
  content: { justifyContent: 'center' },
  webview: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  webviewContainer: { backgroundColor: 'transparent' },
});
