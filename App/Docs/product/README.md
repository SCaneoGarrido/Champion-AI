# Champion AI — Documentación de Producto

tags: #product #knowledge-pack #architecture #roadmap

---

## Qué es esta carpeta

Contiene el **contrato oficial de diseño** de la nueva generación del pipeline inteligente de Champion AI, organizado alrededor de un concepto central: el **Knowledge Pack**.

Esta documentación es el resultado de un proceso de diseño explícito (análisis → especificación → arquitectura → UX → roadmap) realizado **antes** de escribir código. Ningún componente de código (API, Azure Function, Mobile, PostgreSQL) fue modificado como parte de este trabajo — es exclusivamente de análisis, diseño y documentación.

## Cómo leer esta carpeta

Leer en este orden:

| # | Documento | Responde a |
|---|---|---|
| 1 | [`01-knowledge-pack-vision.md`](./01-knowledge-pack-vision.md) | ¿Qué es el Knowledge Pack y por qué existe? |
| 2 | [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md) | ¿Qué componentes contiene? ¿Cuáles son MVP y cuáles roadmap? |
| 3 | [`03-intelligent-pipeline-design.md`](./03-intelligent-pipeline-design.md) | ¿Cómo se genera cada componente? ¿Qué etapa produce qué? |
| 4 | [`04-data-architecture.md`](./04-data-architecture.md) | ¿Qué se persiste? ¿Qué relaciones y metadatos existen? |
| 5 | [`05-ux-capabilities.md`](./05-ux-capabilities.md) | ¿Qué capacidades habilita esto para el usuario final? |
| 6 | [`06-roadmap-risks-recommendations.md`](./06-roadmap-risks-recommendations.md) | ¿En qué orden se implementa? ¿Qué riesgos hay? ¿Qué hacer antes de codear? |

## Relación con el resto del proyecto

Esta carpeta **no reemplaza** ninguna documentación existente — la extiende:

| Fuente existente | Relación con esta carpeta |
|---|---|
| `CLAUDE.md` (raíz) | Los principios arquitectónicos (1–10) siguen siendo invariantes. El Knowledge Pack los respeta, no los reemplaza. |
| `ARCHITECTURE.md` | Documenta el sistema **implementado hoy**. Esta carpeta documenta el sistema **objetivo** hacia el que evoluciona. |
| `App/Knowledge/Roadmap/pipeline-roadmap.md` | Roadmap técnico del pipeline STT específico. Esta carpeta lo generaliza a nivel de producto y lo profundiza. |
| `App/Knowledge/Product/vision.md` | Visión de producto de alto nivel. Esta carpeta la desarrolla en detalle funcional. |

## Regla de consistencia

Cualquier feature nueva que se diseñe a partir de ahora en Champion AI debe poder ubicarse dentro del modelo del **Knowledge Pack**: ¿qué componente agrega? ¿de qué depende? ¿en qué etapa del pipeline se genera? ¿es MVP o roadmap? Ver [`02-knowledge-pack-spec.md`](./02-knowledge-pack-spec.md#criterio-para-agregar-un-nuevo-componente).
