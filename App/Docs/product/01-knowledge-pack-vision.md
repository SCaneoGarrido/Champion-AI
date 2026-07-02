# Knowledge Pack — Visión

tags: #product #knowledge-pack #vision

---

## El problema con el modelo actual

Hoy, el pipeline STT de Champion AI produce **cuatro artefactos planos** (`transcription_text`, `summary_text`, `notes_text`/`notes_json`, `mind_map_json`) guardados como columnas fijas de una única fila en `stt_recording_result`. Este modelo funcionó perfectamente para llegar al primer extremo-a-extremo, pero no escala conceptualmente:

- Cada nueva capacidad de IA (topics, keywords, entidades, flashcards, quiz, búsqueda semántica...) requeriría **una columna nueva + una migración + tocar los SPs y vistas existentes**, indefinidamente.
- No existe un lugar único donde razonar "esto es todo lo que Champion AI sabe sobre este audio".
- No hay metadatos de generación por componente (qué modelo, qué prompt, cuándo, a qué costo) — solo existe el historial de *estado del job*, no el historial de *cada pieza de conocimiento*.

La primera pregunta de esta etapa de diseño fue: **¿alrededor de qué concepto debe organizarse el resto de la vida del producto?** La respuesta es el **Knowledge Pack**.

---

## Qué es el Knowledge Pack

> Un **Knowledge Pack** es el objeto de conocimiento completo y evolutivo que Champion AI construye a partir de una pieza de contenido de entrada (hoy: un audio). Es la agregación versionada de todo lo que el sistema sabe, infiere y deriva sobre ese contenido.

No es una tabla nueva ni un endpoint nuevo — es un **concepto de dominio** que unifica:

1. El contenido original (audio + su metadata)
2. Los artefactos derivados por IA (transcripción, resumen, notas, mapa mental, topics, keywords, etc.)
3. Los metadatos de cómo se generó cada artefacto (modelo, prompt, versión, costo, timestamp)
4. El estado de procesamiento de cada pieza (algunas completas, otras pendientes, otras fallidas — de forma independiente)

Un Knowledge Pack **no es estático**: nace con un subconjunto mínimo de componentes (transcripción) y crece con el tiempo — tanto porque el pipeline agrega nuevas etapas (topics, flashcards...) como porque el usuario puede solicitar enriquecerlo después del procesamiento inicial (roadmap: "genera flashcards de esta grabación" sobre un pack ya completado hace semanas).

---

## Analogía

Si el pipeline actual es una **cadena de montaje** (audio entra → cuatro outputs fijos salen), el Knowledge Pack es un **documento vivo**: empieza como una transcripción cruda y se enriquece progresivamente hasta convertirse en un objeto de estudio navegable — con capítulos, temas, preguntas de repaso y capacidad de conversar sobre su contenido.

```
Audio  ──────────────────────►  Knowledge Pack
(dato crudo)                    (conocimiento estructurado y navegable)
```

---

## Por qué este concepto y no otro

Se evaluaron tres formas de nombrar y organizar esta evolución:

| Alternativa | Por qué se descartó |
|---|---|
| Seguir agregando columnas a `stt_recording_result` | No escala — cada feature nueva es una migración invasiva sobre una tabla que ya varios componentes conocen |
| Modelar cada capacidad como una "feature" independiente (como TTS hoy) | Fragmenta el conocimiento — un audio terminaría con resultados dispersos en N tablas sin una entidad que los una conceptualmente |
| **Knowledge Pack como objeto agregador, con componentes extensibles** | Permite que el pipeline crezca por años sin romper compatibilidad — ver [`04-data-architecture.md`](./04-data-architecture.md) |

---

## Principios que gobiernan el Knowledge Pack

### 1. Un Knowledge Pack por unidad de contenido procesada
Hoy: 1 `ai_job` STT → 1 `stt_recording` → 1 Knowledge Pack. La relación 1:1:1 actual se mantiene; el Knowledge Pack es la vista conceptual unificada de esa cadena, no una tabla nueva que la reemplace.

### 2. Los componentes MVP son estables; los componentes futuros son extensibles
Los cinco componentes ya implementados (o planificados como próximo paso inmediato) viven en columnas dedicadas porque son estables, de alta frecuencia de lectura y ya forman parte del contrato HTTP. Todo componente nuevo del roadmap se diseña para vivir en un **modelo extensible** que no requiera migración por cada capacidad nueva. Ver [`04-data-architecture.md`](./04-data-architecture.md).

### 3. Cada componente es independientemente observable
Un Knowledge Pack puede tener su transcripción completa, su resumen completo, y sus topics todavía en `pending` — no todo el pack progresa como un monolito. Esto ya es parcialmente cierto hoy (smart retry por campo vía `COALESCE`) y se convierte en principio explícito hacia adelante.

### 4. Todo componente declara su procedencia
Modelo usado, versión de prompt, y timestamp de generación deben ser recuperables por componente — no solo a nivel de job. Esto habilita trazabilidad, auditoría de costos y regeneración selectiva.

### 5. El Knowledge Pack no rompe el contrato HTTP existente
`GET /jobs/{id}/result` sigue devolviendo el envelope `{ success, data, error }`. El Knowledge Pack es un reordenamiento conceptual y de datos internos — no obliga a romper endpoints ya consumidos por la app móvil. Las nuevas capacidades se exponen como campos adicionales o endpoints nuevos, nunca reemplazando el contrato existente sin una estrategia de versionado explícita.

### 6. El Knowledge Pack respeta los 10 principios arquitectónicos del sistema
La API sigue orquestando, no procesando. La Azure Function sigue procesando solo vía Stored Procedures. PostgreSQL sigue siendo la única fuente de verdad. El Knowledge Pack no introduce una excepción a ninguno de estos principios — ver `CLAUDE.md` (raíz).

---

## Qué NO es el Knowledge Pack

- No es una feature nueva que se agrega al catálogo (como TTS) — es el **marco conceptual** bajo el cual STT y toda futura feature de generación de conocimiento se organiza.
- No implica reemplazar `ai_job` / `stt_recording` / `stt_recording_result` — estas tablas siguen siendo la base del MVP.
- No implica procesamiento síncrono ni cambia el modelo de polling — sigue siendo async vía queue + Azure Function.
- No es (todavía) un objeto que combine múltiples audios en un solo pack — esa posibilidad (packs multi-fuente) queda fuera de alcance y se menciona solo como pregunta abierta de largo plazo en [`06-roadmap-risks-recommendations.md`](./06-roadmap-risks-recommendations.md).

---

## Referencias

- [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) — especificación funcional completa de los componentes
- [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md) — cómo se genera cada componente
- `App/Knowledge/Product/vision.md` — visión de producto general de Champion AI
