# Reglas — Knowledge Pack

Reglas específicas para el diseño e implementación de componentes del **Knowledge Pack** — el objeto de conocimiento unificado hacia el que evoluciona el resultado de procesamiento de Champion AI. Diseño completo en `App/Docs/product/`.

Estas reglas se suman a — nunca reemplazan — los 10 principios arquitectónicos de `CLAUDE.md` (raíz) y las reglas existentes en `App/rules/api.md`, `App/rules/database.md`, `App/rules/azure.md`.

## R-KP-01: Todo componente nuevo se especifica antes de implementarse

Ningún componente del Knowledge Pack (Topics, Keywords, Flashcards, etc.) se implementa sin antes definir en `App/Docs/product/02-knowledge-pack-spec.md`: qué representa, formato, de qué depende, qué habilita, costo aproximado y fase (MVP/roadmap/visión).

**Violación:** agregar una columna o tabla nueva para un output de IA que no está especificado en ese documento.

## R-KP-02: Componentes MVP estables usan columnas dedicadas; todo lo demás usa el modelo extensible

Los componentes ya implementados o en implementación inmediata (transcripción, resumen, notas, mapa mental, transcript limpio) viven en columnas de `stt_recording_result`. Cualquier componente nuevo del roadmap (Topics, Keywords, Named Entities, Chapters, Study Metadata, Flashcards, Quiz) vive en el modelo genérico `stt_knowledge_component` (`component_type` + `payload JSONB`) — ver `App/Docs/product/04-data-architecture.md`.

**Violación:** agregar una columna nueva a `stt_recording_result` para un componente roadmap, o crear una tabla dedicada por tipo de componente.

## R-KP-03: Un componente nuevo no requiere un Stored Procedure nuevo

Los componentes del modelo extensible se persisten todos a través del mismo SP genérico (`sp_save_knowledge_component_v1` — a implementar cuando se aborde el primer componente roadmap). Un `component_type` nuevo no debe requerir un SP nuevo.

**Violación:** crear `sp_save_topics_v1`, `sp_save_flashcards_v1`, etc. como SPs separados en vez de reutilizar el SP genérico con un `component_type` distinto.

## R-KP-04: Idempotencia por componente, no solo por job

Todo componente del modelo extensible respeta `UNIQUE (recording_id, component_type)` con `ON CONFLICT DO UPDATE`, igual que el patrón ya validado en `sp_save_stt_partial_result_v1`. El smart retry se generaliza: si un `component_type` ya está `completed`, la etapa correspondiente se salta.

**Violación:** un componente que falle en su segunda ejecución con el mismo `recording_id` + `component_type`.

## R-KP-05: Toda etapa de IA declara su procedencia

Toda escritura de un componente generado por IA debe registrar `generator_model` y, si aplica, `generator_prompt_ver`. Esto es la base del roadmap de observabilidad (costo y trazabilidad por componente).

**Violación:** persistir un `payload` de IA sin registrar qué modelo lo generó.

## R-KP-06: No agregar una etapa de IA si el componente es una proyección de datos ya existentes

Antes de diseñar una etapa nueva del pipeline, verificar si el componente puede derivarse de componentes ya generados sin una llamada nueva a IA (ej. Chapters se deriva de Topics; Timeline se deriva de Topics + Segmentos). Ver el grafo de dependencias en `App/Docs/product/02-knowledge-pack-spec.md`.

**Violación:** crear una etapa de IA que vuelve a analizar la transcripción completa para producir un componente que ya es derivable de otro ya generado.

## R-KP-07: Las etapas sin dependencia entre sí se ejecutan en paralelo

Si dos o más etapas del pipeline dependen únicamente del mismo input y no entre sí, deben ejecutarse con `context.task_all([...])` en el orquestador Durable, no de forma secuencial. Ver capas del pipeline en `App/Docs/product/03-intelligent-pipeline-design.md`.

**Violación:** encadenar secuencialmente dos activities que no tienen dependencia real entre sí.

## R-KP-08: Persistir los offsets temporales de la transcripción

Todo dato de segmentación temporal (`phrases[]` con offset) que un servicio de transcripción devuelva debe persistirse (hoy: en `raw_result_json`), incluso si ningún componente lo consume todavía. Es un prerrequisito de bajo costo para Topics, Timeline, citas temporales y reproducción sincronizada.

**Violación:** descartar offsets o segmentos disponibles en la respuesta de un servicio de IA sin persistirlos.

## R-KP-09: El contrato HTTP existente no se rompe por agregar componentes

Agregar un componente nuevo del Knowledge Pack se hace vía campos adicionales o endpoints adicionales. `GET /jobs/{id}/result` y el envelope `{ success, data, error }` no se modifican de forma incompatible por la incorporación de un componente roadmap.

**Violación:** cambiar la forma de un campo ya consumido por la app móvil sin una estrategia de versionado explícita.

## R-KP-10: user_id siempre acota las consultas cross-pack

Toda capacidad que consulte más de un Knowledge Pack a la vez (búsqueda cross-pack, grafo de Concepts) debe filtrar explícitamente por `user_id` del JWT. Nunca debe ser posible que una consulta cruce packs de distintos usuarios.

**Violación:** una query o endpoint cross-pack sin filtro de `user_id` derivado del token.

## Referencias

- `App/Docs/product/README.md` — diseño funcional completo del Knowledge Pack
- `App/rules/database.md` — reglas generales de base de datos (siguen aplicando sin excepción)
- `App/rules/azure.md` — reglas de Durable Functions y servicios Azure
