# ADR-008: Renderizado cliente (WebView) para Mermaid y LaTeX, con SVG cacheado en backend

tags: #adr #decision #mobile #presentation-layer #mermaid #latex

---

## Estado

En implementación (2026-07)

---

## Contexto

La Presentation Layer necesita renderizar dos tipos de contenido que React Native no soporta nativamente:

1. **Mapas mentales** — `mind_map_json` se convierte de forma determinística (`mermaid_converter.py`, ver [[mind-maps]]) a sintaxis Mermaid `mindmap`, que debe renderizarse como diagrama SVG.
2. **Notación matemática (LaTeX)** — expresiones `$...$`/`$$...$$` que deben renderizarse como fórmulas, no como texto.

Ninguno de los dos tiene un renderer nativo maduro y mantenido para React Native/Expo sin salir de Expo Go (ej. librerías que envuelven `iosMath`/`MTMathUILabel` requieren un native module fuera del set soportado por Expo Go). Matiz importante descubierto durante la implementación: `katex.renderToString()` no necesita DOM — corre en JS puro (funciona igual en Node o en el motor Hermes de RN) y produce HTML+CSS estático. Lo que sigue sin tener alternativa nativa es *mostrar* ese HTML — el layout preciso de fracciones, raíces y matrices depende de CSS real, que solo un WebView puede interpretar en RN. Mermaid, en cambio, sí necesita un DOM real (mide texto, calcula layout) tanto para calcular como para mostrar.

Dos ubicaciones posibles para el renderizado a SVG/imagen:

- **Servidor** (Azure Function): requeriría un navegador headless (Puppeteer/Chromium vía `mermaid-cli`) para ejecutar mermaid.js/KaTeX, ya que ambas librerías están escritas para DOM de navegador. Esto agrega una dependencia pesada (binario de Chromium) a una Function Python, con riesgo real de cold-start y límites de tamaño de deployment en el plan Consumption de Azure.
- **Cliente** (mobile): `react-native-webview` es un módulo soportado por Expo Go, permite ejecutar mermaid.js/KaTeX reales dentro de un WebView embebido con los assets bundleados localmente (sin red), y devolver el resultado (SVG / HTML renderizado) a React Native vía `postMessage`.

---

## Decisión

Renderizar Mermaid y LaTeX **100% en el cliente**, vía `react-native-webview`, usando mermaid.js y KaTeX embebidos como assets locales (sin fetch a CDN, funciona offline). Un único mecanismo (WebView) sirve para ambas capacidades — no se agregan dos librerías nativas distintas.

**El SVG resultante del mapa mental se sube al backend una sola vez, tras el primer render, y se cachea** (`stt_recording_result.mind_map_svg`). Vistas posteriores (mismo dispositivo, otro dispositivo, PDF export) usan el SVG cacheado directamente vía `react-native-svg` (`SvgXml`), sin volver a montar el WebView.

**Principio derivado — nunca una imagen como fuente de verdad:** `mind_map_json` (generado por IA) y `mind_map_mermaid_code` (proyección determinística) son la fuente de verdad. `mind_map_svg` es una caché de renderizado, regenerable en cualquier momento si se pierde o queda desactualizada.

Para LaTeX en PDF (`pdfExport.js`), en cambio, se usa `markdown-it-katex` directamente (sin WebView) — produce HTML+CSS estático que `expo-print` renderiza igual que el resto del documento, sin necesidad de async/WebView en un flujo de generación de PDF.

---

## Consecuencias

### Positivas

- Cero dependencias nuevas en la Azure Function — el pipeline de IA queda intacto.
- `react-native-webview` está soportado por Expo Go — no obliga a migrar a un dev client custom.
- Un solo mecanismo (WebView) cubre dos capacidades (Mermaid + LaTeX en pantalla).
- El SVG cacheado deja la base lista para zoom, exportar, compartir, regenerar y editar — todo opera sobre un string persistido, no sobre un WebView vivo.
- Renderizado fiel: mermaid.js/KaTeX corren en un motor de navegador real, no una reimplementación parcial.

### Negativas

- Latencia perceptible en el primer render de cada mapa mental/fórmula nueva (arranque del WebView + parseo de mermaid.js/KaTeX).
- Bundle de la app crece por los assets de mermaid.js/KaTeX (JS+CSS+fuentes) embebidos localmente — en la práctica, más de lo estimado inicialmente: KaTeX (CSS+fuentes woff2 en base64) agrega ~360 KB, pero mermaid.js agrega **~3.5 MB** (el bundle IIFE oficial no se puede dividir por tipo de diagrama sin un pipeline de bundling propio — se evaluó como sobre-ingeniería para esta primera implementación, pero es la optimización más clara a futuro si el tamaño de la app se vuelve un problema; ver `scripts/generate-mermaid-js.js`).
- La sintaxis `mindmap` de Mermaid es relativamente nueva/menos madura — texto de nodo con caracteres especiales puede romper el parseo (mitigado con sanitización + fallback al renderer de lista anterior).
- Jobs completados antes de esta capa no tienen `mind_map_mermaid_code`/`mind_map_svg` — sin backfill retroactivo, se resuelven con el mismo fallback.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Renderizado server-side en la Azure Function (Puppeteer/Chromium) | Dependencia pesada en un componente Python que hoy no la necesita; riesgo de cold-start y tamaño de deployment en Consumption plan |
| Librería nativa de LaTeX (ej. bindings a iosMath) | Requiere salir de Expo Go (native module no soportado), y no cubre Mermaid de todos modos |
| Mantener el mapa mental como lista anidada (sin cambios) | No cumple el objetivo del producto — un mapa mental real debe ser un diagrama, no una lista |

---

## Referencias

- [[mind-maps]] — Feature que usa esta decisión
- `App/rules/mobile-rendering.md` — Reglas derivadas de esta decisión
- `App/Docs/product/02-knowledge-pack-spec.md` — Criterio que confirma que la conversión a Mermaid no es una etapa de IA nueva
- CLAUDE.md raíz — sección "Presentation Layer"
