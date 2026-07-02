/**
 * Renderiza el mapa mental como diagrama real (Mermaid → SVG).
 *
 * A diferencia de LaTeX/KaTeX, Mermaid SÍ necesita un DOM real para calcular layout
 * (mide texto, posiciona nodos) — no se puede precomputar en el JS thread de RN.
 * El WebView corre mermaid.js una sola vez (invisible, solo como motor de cálculo);
 * el SVG resultante se muestra después con react-native-svg (nativo, sin WebView) y
 * se sube al backend para cachearlo — ver App/Knowledge/ADR/ADR-008-client-side-rendering.md.
 *
 * Fallback obligatorio (R-RENDER-05/08): si no hay mind_map_mermaid_code (job anterior
 * a esta capa) o si mermaid.render() falla, se usa MindMapListView — nunca pantalla en blanco.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { MERMAID_JS } from '../assets/mermaidEmbedded';
import { saveMindmapSvg } from '../utils/api';
import MindMapListView from './MindMapListView';

function buildMermaidHtml(code, darkMode) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html, body { margin: 0; padding: 0; background: transparent; }</style>
</head>
<body>
<script>${MERMAID_JS}</script>
<script>
(async function () {
  try {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: ${JSON.stringify(darkMode ? 'dark' : 'default')} });
    var code = ${JSON.stringify(code)};
    var result = await mermaid.render('mindmap-render', code);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'svg', svg: result.svg }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String((e && e.message) || e) }));
  }
})();
</script>
</body>
</html>`;
}

export default function MermaidRenderer({ jobId, mindMapJson, mermaidCode, svg: cachedSvg }) {
  const { colors, darkMode } = useTheme();
  const [svg, setSvg] = useState(cachedSvg || null);
  const [failed, setFailed] = useState(false);

  const needsRender = !svg && !failed && !!mermaidCode;
  const html = useMemo(() => (needsRender ? buildMermaidHtml(mermaidCode, darkMode) : null), [needsRender, mermaidCode, darkMode]);

  const handleMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch (_e) {
      setFailed(true);
      return;
    }
    if (msg.type === 'svg' && msg.svg) {
      setSvg(msg.svg);
      // Cachear en el backend — best effort, no bloquea la UI si falla (se recalcula en la próxima vista)
      if (jobId) saveMindmapSvg(jobId, msg.svg).catch(() => {});
    } else {
      setFailed(true);
    }
  }, [jobId]);

  if (svg) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.svgScroll}>
        <SvgXml xml={svg} />
      </ScrollView>
    );
  }

  if (!needsRender) {
    // Sin mermaidCode (job anterior a esta capa) o el render falló — fallback a lista.
    return <MindMapListView data={mindMapJson} />;
  }

  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={colors.primary} />
      {/* WebView invisible — solo se usa como motor de cálculo de layout, nunca se muestra */}
      <WebView
        source={{ html }}
        onMessage={handleMessage}
        onError={() => setFailed(true)}
        originWhitelist={['*']}
        style={styles.hiddenWebview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  svgScroll: { minHeight: 220 },
  loadingWrap: { minHeight: 80, alignItems: 'center', justifyContent: 'center' },
  hiddenWebview: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
