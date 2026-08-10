/**
 * MathView — tipografía real de una expresión LaTeX, vía WebView + KaTeX.
 *
 * Es la pieza de mayor riesgo del Workspace hasta ahora: reintroduce WebView,
 * la misma clase de tecnología que causó el rollback completo de la
 * Presentation Layer (ver App/Knowledge/Bugs/known-issues.md, ISSUE-012).
 * Decisión explícita del usuario de aceptar ese riesgo a cambio de fidelidad
 * visual real en las ecuaciones — no es un descuido, quedó documentado en la
 * conversación de planificación.
 *
 * Mitigación aplicada (a diferencia del intento anterior, que renderizaba
 * TODO el documento en un WebView único): acá el WebView es minúsculo y está
 * acotado a UNA sola fórmula por instancia — nunca al documento completo. El
 * clásico bug de "WebView no ajusta su alto" se evita midiendo el contenido
 * real dentro del WebView (offsetHeight) y reportándolo a RN vía
 * postMessage, en vez de fijar un alto arbitrario.
 *
 * Limitación conocida: KaTeX se carga desde CDN (jsDelivr) — requiere
 * conexión a internet. Bundlearlo localmente (assets + file://) queda como
 * mejora futura si el uso offline resulta necesario. Mientras tanto: si el
 * CDN falla, no se muestra el LaTeX crudo en pantalla (confundía con la
 * sintaxis interna) — un aviso corto en su lugar. Y si el `postMessage` de
 * altura nunca llega (mismo tipo de falla de red), un timeout evita que la
 * fórmula quede clippeada al alto inicial para siempre.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';

function buildHtml(latex, block, color) {
  const safeLatex = JSON.stringify(latex);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <link rel="stylesheet" href="${KATEX_CSS}">
  <script src="${KATEX_JS}"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; }
    #m {
      color: ${color};
      padding: ${block ? '10px 4px' : '0'};
      text-align: ${block ? 'center' : 'left'};
      overflow-x: auto;
      white-space: nowrap;
    }
    #m.error { color: #ef4444; font-family: -apple-system, sans-serif; font-size: 13px; white-space: normal; }
  </style>
</head>
<body>
  <div id="m"></div>
  <script>
    function postHeight() {
      var h = document.getElementById('m').scrollHeight;
      window.ReactNativeWebView.postMessage(String(h));
    }
    try {
      katex.render(${safeLatex}, document.getElementById('m'), {
        throwOnError: false,
        displayMode: ${block ? 'true' : 'false'},
      });
    } catch (e) {
      var el = document.getElementById('m');
      el.className = 'error';
      el.textContent = '⚠ fórmula no disponible';
    }
    postHeight();
    window.addEventListener('load', postHeight);
  </script>
</body>
</html>`;
}

const HEIGHT_TIMEOUT_MS = 4000;
const FALLBACK_HEIGHT = 60;

export default function MathView({ latex, block = false, color = '#2E2E2E' }) {
  // Estimación inicial más cercana a una fórmula típica (fracción/límite en
  // bloque suele rondar 1.5-2 líneas a este tamaño) — reduce el salto visual
  // entre el primer paint y el alto real que llega por postMessage. Sigue
  // siendo una estimación, no reemplaza la medición real.
  const [height, setHeight] = useState(block ? 64 : 26);
  const loadedOnce = useRef(false);

  const onMessage = useCallback((event) => {
    const h = Number(event.nativeEvent.data);
    if (Number.isFinite(h) && h > 0) {
      setHeight(h);
      loadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    loadedOnce.current = false;
    const timer = setTimeout(() => {
      if (!loadedOnce.current) setHeight(block ? FALLBACK_HEIGHT : FALLBACK_HEIGHT / 2);
    }, HEIGHT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [latex, block]);

  if (!latex?.trim()) return null;

  return (
    <View style={[styles.wrap, block && styles.wrapBlock, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildHtml(latex.trim(), block, color) }}
        onMessage={onMessage}
        style={styles.webview}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        // Fondo transparente para no mostrar un flash blanco mientras carga
        // el CSS/JS de KaTeX desde el CDN.
        androidLayerType="software"
        containerStyle={styles.container}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  wrapBlock: {
    marginVertical: 6,
  },
  webview: {
    backgroundColor: 'transparent',
  },
  container: {
    backgroundColor: 'transparent',
  },
});
