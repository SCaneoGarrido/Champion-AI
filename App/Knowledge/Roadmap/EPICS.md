# EPICS — Champion AI

tags: #roadmap #epics #scrum

> Desglose accionable del [[ROADMAP]]. Un EPIC por versión. Sirve como fuente para GitHub Milestones/Issues — ver [[BACKLOG]] para la lista plana de issues y [[MILESTONES]] para el mapeo a GitHub Milestones.
>
> Cada EPIC respeta los principios invariantes de `CLAUDE.md` raíz: la API orquesta y no procesa, la Azure Function procesa y no coordina, todo estado vive en PostgreSQL vía Stored Procedures, todo procesamiento de IA es asíncrono (queue + function).

---

## EPIC V1 — Knowledge Workspace — ✅ CERRADO (M1, 2026-08-10)

### Objetivo
Reemplazar la vista Markdown por una superficie de consumo única (Knowledge Workspace) donde el usuario ve audio, resumen, notas y mapa mental integrados, con mejor experiencia móvil y una arquitectura de componentes preparada para las versiones siguientes.

### Descripción
Hoy el resultado de un Knowledge Pack (STT) se consume en una sola pantalla componible
(`KnowledgeWorkspaceScreen.jsx`, producción desde el cierre de M1): reproductor de audio, secciones
de resumen y notas con renderizado Markdown + LaTeX real, y mapa mental, todo dentro del mismo
contenedor de navegación. **Nota sobre el mapa mental**: el plan original decía "Mermaid" — la
implementación final es un árbol nativo (View/Text), no Mermaid/WebView, decisión tomada por el
precedente de rollback de ISSUE-012 (ver [[known-issues]] y
[[ADR-013-math-rendering-pipeline-rewrite]]). Cumple el mismo objetivo visual sin el riesgo
estructural que causó ese rollback.

### Historias de usuario
- Como estudiante, quiero abrir un Knowledge Pack y ver el audio, el resumen, las notas y el mapa mental en un solo lugar, para no perder contexto saltando entre pantallas.
- Como estudiante, quiero que el Workspace se vea bien en mi teléfono, para poder repasar mientras me muevo.
- Como desarrollador, quiero que el Workspace esté armado con componentes reutilizables, para poder agregar Topics/Search/Flashcards en versiones futuras sin reescribir la base.

### Subtareas técnicas
- ~~Diseño de la estructura de navegación del Workspace en `App/Mobile`~~ ✅ [[ADR-009-mobile-navigation-manager-viewer-seam]]
- ~~Componente de reproductor de audio integrado al Workspace~~ ✅ Resuelto (2026-08-10)
- ~~Componente de mind map encapsulado y testeado de forma aislada~~ ✅ Resuelto (2026-08-10) — árbol
  nativo, no Mermaid (ver nota en Descripción)
- ~~Endpoint de la API que sirva el Knowledge Pack completo~~ ✅ `GET /jobs/{id}/result` ya era
  suficiente, confirmado, sin cambios
- ~~Flip de `KnowledgePackViewer` a la superficie del Workspace~~ ✅ Resuelto (2026-08-10, ver
  [[ADR-014-knowledge-workspace-versioning]])
- No requirió cambios en la Azure Function ni en el pipeline STT — fue consumo de datos ya generados

### Dependencias
- Ninguna hacia atrás — depende solo del pipeline STT ya implementado (transcripción, resumen, notas, mapa mental)
- Bloquea a V2, V2.5, V3, V4 y V5: todas requieren una superficie donde mostrarse

### Criterios de aceptación
- ✅ El usuario puede completar el flujo "abrir Knowledge Pack → escuchar audio → leer resumen/notas → ver mapa mental" sin salir del Workspace
- ✅ El mapa mental renderiza sin errores visuales en dispositivo real, tras varias rondas de
  bugfixing (renderizado matemático, paginación, overlaps — ver
  [[ADR-013-math-rendering-pipeline-rewrite]]). Nota: no es Mermaid, ver Descripción.
- ✅ No se reintrodujo una vista Markdown standalone como punto de entrada principal —
  `NoteDetailScreen` (legacy) se retiró de las rutas activas

### Riesgos (históricos, ya mitigados)
- **Alto** (materializado parcialmente, no como rollback completo): el pipeline de renderizado
  matemático tuvo bugs reales en producción (superposición de ecuaciones, sintaxis interna visible)
  — a diferencia del rollback de ISSUE-012, esta vez se identificó la causa raíz y se corrigió sin
  necesidad de revertir código. Ver [[ADR-013-math-rendering-pipeline-rewrite]] para el detalle
  técnico completo.
- **Medio:** contrato de datos del Workspace — `GET /jobs/{id}/result` resultó suficiente, no hizo
  falta desacoplar.

### Prioridad
Alta — desbloquea el resto del roadmap.

### Estimación
L

---

## EPIC V2 — Intelligent Study

### Objetivo
Mejorar la calidad del texto que consume el resto del pipeline y convertir el audio en contenido navegable por tema y por tiempo.

### Descripción
Fast Transcription produce texto fiel al audio, incluyendo muletillas, repeticiones y frases incompletas. Este EPIC introduce una etapa de limpieza (Transcript Cleanup) y una etapa de extracción de temas (Topics) que habilita navegación, búsqueda y citas temporales dentro del Workspace construido en V1. Migra y reemplaza el contenido técnico que antes vivía en `pipeline-roadmap.md`.

### Historias de usuario
- Como estudiante, quiero que el resumen y las notas no tengan muletillas ni repeticiones, para que sean más fáciles de estudiar.
- Como estudiante, quiero saltar directamente a la sección del audio donde se habló de un tema, para no escuchar todo de nuevo.
- Como estudiante, quiero buscar dentro de una clase y encontrar el minuto exacto donde se mencionó algo, para repasar puntual.
- Como estudiante, quiero continuar exactamente donde dejé mi sesión de estudio anterior.

### Subtareas técnicas
- Nueva activity `cleanup_activity.py` en `App/procesamiento/activities/` + prompt `prompts/transcript_cleanup.md`
- Nuevo step `transcript_cleanup` en el pipeline Durable, entre `transcription` y `summary`
- Nuevo campo `transcript_clean_text` (TEXT) en `stt_recording_result` — vía migración SQL
- Extensión de `sp_save_stt_partial_result_v1` (COALESCE) para persistir el resultado parcial del nuevo step — el smart retry ya soporta pasos nuevos sin cambios adicionales
- Nueva activity de extracción de topics, consumiendo `transcript_clean_text` + `phrases[]` (offsets) que ya devuelve Fast Transcription
- Nuevo campo `topics_json` (JSONB) en `stt_recording_result`:
  ```json
  {
    "topics": [
      {
        "id": "topic_01",
        "name": "Introducción al proyecto",
        "start_time_seconds": 0.0,
        "end_time_seconds": 182.5,
        "summary": "...",
        "key_points": ["...", "..."]
      }
    ]
  }
  ```
- Nuevo endpoint `GET /AIServices/Speechv2/jobs/{job_id}/topics` en la API (vía vista, no DML directo)
- Timeline y Search viven en el Workspace (Mobile) consumiendo `topics_json` + offsets — sin nuevo procesamiento de IA
- "Continuar donde quedó" requiere persistir posición de estudio del usuario — evaluar tabla nueva o campo en `stt_recording` vía SP dedicado

### Dependencias
- Depende de V1 (necesita el Workspace para mostrar timeline/search/citas)
- `transcript_cleanup` debe ejecutarse antes de `summary`/`notes`/`mind_map` si se decide que estos consuman el texto limpio en vez del crudo — a definir en diseño técnico antes de implementar

### Criterios de aceptación
- El texto limpio elimina artefactos de voz sin cambiar el significado del contenido original
- El usuario puede navegar el audio por topic desde el Workspace
- Una búsqueda por palabra clave devuelve el timestamp correcto dentro del audio
- El smart retry sigue funcionando con los nuevos steps (`transcript_cleanup`, extracción de topics)

### Riesgos
- **Medio:** Transcript Cleanup con GPT-5-mini puede alterar matices del contenido si el prompt no está bien acotado — requiere revisión de calidad antes de reemplazar el texto crudo en toda la cadena downstream.
- **Bajo:** rate limits de Fast Transcription/Azure OpenAI no están documentados para alta concurrencia (ver [[known-issues]]).

### Prioridad
Alta — mejora la calidad de todos los outputs downstream y habilita V2.5/V3.

### Estimación
XL

---

## EPIC V2.5 — Knowledge Enrichment

### Objetivo
Enriquecer cada Knowledge Pack con metadata semántica y con curaduría personal del usuario.

### Descripción
Una vez que el contenido está limpio y navegable por topic (V2), se puede anotar semánticamente (keywords, conceptos, entidades, relaciones) y permitir que el usuario lo cure (highlights, favoritos, notas personales) sin rehacer el trabajo de las versiones anteriores.

### Historias de usuario
- Como estudiante, quiero ver las palabras clave y entidades mencionadas en una clase, para tener un mapa rápido del contenido.
- Como estudiante, quiero marcar como favorito un Knowledge Pack, para encontrarlo rápido después.
- Como estudiante, quiero resaltar fragmentos del resumen o las notas y agregar mi propia anotación.

### Subtareas técnicas
- Nueva activity de extracción de keywords/entities/concepts (Azure OpenAI), consumiendo `transcript_clean_text` de V2
- Nuevo campo `enrichment_json` (JSONB) en `stt_recording_result` (o tabla dedicada si el volumen de relaciones lo justifica — decidir en diseño técnico)
- Tabla nueva para favoritos y notas personales del usuario, ligada a `user_id` + `job_id`, con su propio SP de escritura (`sp_upsert_user_annotation_v1` o similar)
- Endpoint(s) de la API para favoritos/highlights/notas personales (CRUD acotado, vía SP)
- UI de highlight y notas dentro del Workspace (Mobile)

### Dependencias
- Depende de V2 (necesita `transcript_clean_text` y topics para anclar entidades y relaciones a un contexto)

### Criterios de aceptación
- Cada Knowledge Pack expone keywords/entities/concepts sin reprocesar transcripción o resumen
- El usuario puede marcar favoritos y ver un listado filtrado por favoritos
- Los highlights y notas personales persisten y sobreviven a un retry/reprocesamiento del job

### Riesgos
- **Bajo-Medio:** relaciones entre conceptos pueden crecer en complejidad (grafo embrionario) — mantener el modelo de datos simple hasta que V5 lo requiera explícitamente, evitar sobre-diseñar acá.

### Prioridad
Media-Alta — insumo directo para V3.

### Estimación
L

---

## EPIC V3 — AI Learning Platform

### Objetivo
Convertir el conocimiento estructurado (V1-V2.5) en herramientas de aprendizaje activo.

### Descripción
Con topics, enriquecimiento semántico y una superficie estable, este EPIC agrega generación de flashcards y quizzes, un chat conversacional sobre el contenido de la clase, mapas mentales interactivos y la capacidad de reprocesar parcialmente el pipeline sin repetir pasos ya completados.

### Historias de usuario
- Como estudiante, quiero generar flashcards automáticamente desde un Knowledge Pack, para repasar con repetición espaciada.
- Como estudiante, quiero rendir un quiz corto sobre una clase, para verificar qué tanto entendí.
- Como estudiante, quiero hacerle preguntas al contenido de la clase ("¿qué dijo sobre X?") y recibir una respuesta basada en la transcripción.
- Como estudiante, quiero interactuar con el mapa mental (expandir/colapsar nodos), no solo verlo estático.
- Como desarrollador, quiero poder reprocesar solo un paso del pipeline (ej. regenerar el mapa mental) sin rehacer transcripción y resumen.

### Subtareas técnicas
- Nueva activity de generación de flashcards/quiz por topic (Azure OpenAI), consumiendo `topics_json` + `enrichment_json`
- Nuevos campos `flashcards_json` / `quiz_json` (JSONB) en `stt_recording_result`
- Chat sobre la clase: requiere definir si es RAG sobre `transcript_clean_text` + `enrichment_json` o llamada directa con contexto acotado — diseño técnico previo a implementación, respetando que la Function nunca expone un endpoint conversacional directo a la app (la API sigue orquestando la request de chat, la Function/servicio de IA la resuelve de forma async o síncrona acotada, a definir)
- Mind map interactivo: trabajo de Mobile sobre el componente Mermaid ya encapsulado en V1 (expandir/colapsar), sin cambios de backend
- ~~Reprocesamiento parcial~~ — **implementado por adelantado** (2026-07-13, ver [[ADR-010-knowledge-pack-lifecycle-actions]]) como parte de convertir "Mis Apuntes" en administrador de Knowledge Packs: `POST /jobs/{id}/reprocess` (`{ step, custom_instructions? }`) + `sp_request_stt_step_reprocess_v1`. Alcance más chico que lo planeado aquí: solo `summary` / `notes` / `mind_map` (no dependientes en cadena — los tres se generan directo desde `transcription_text`, confirmado en el pipeline, así que reprocesar uno no invalida a los otros), sin UI de flashcards/quiz todavía. Además de lo roadmapeado, agrega una capacidad nueva no prevista originalmente: instrucciones propias del usuario (`custom_instructions`) inyectadas al prompt de ese step.

### Dependencias
- Depende de V2 (topics) y V2.5 (enrichment) como input de flashcards/quiz/chat
- El mind map interactivo depende del componente Mermaid encapsulado en V1

### Criterios de aceptación
- Flashcards y quiz generados son coherentes con el contenido real de la clase (validación manual mínima antes de considerar el EPIC cerrado)
- El chat responde solo con información derivable del Knowledge Pack, sin alucinar contenido ausente
- El reprocesamiento parcial no vuelve a ejecutar (ni cobrar) pasos ya completados exitosamente

### Riesgos
- **Alto:** chat conversacional introduce superficie de alucinación — requiere guardrails de prompt y, posiblemente, citar la fuente (timestamp/topic) en cada respuesta.
- **Medio:** reprocesamiento parcial rompe el supuesto actual de pipeline estrictamente secuencial — requiere revisar el diseño del orquestador Durable Functions.

### Prioridad
Media — alto valor de producto, pero depende de que V2/V2.5 estén maduros.

### Estimación
XL

---

## EPIC V4 — Intelligent Audio Learning

### Objetivo
Narrar de forma inteligente el contenido ya generado por el Workspace (resumen, notas), no reemplazar TTS como feature genérica.

### Descripción
Este EPIC reencuadra lo que antes era "Text to Speech" (mencionado sin documentación técnica) como una capacidad acotada: convertir en audio narrado el Summary y las Notes de un Knowledge Pack, con selección de voz, SSML y prosodia contextual, cacheado y disponible offline.

### Historias de usuario
- Como estudiante, quiero escuchar el resumen de mi clase narrado en vez de leerlo, para repasar mientras hago otra actividad.
- Como estudiante, quiero elegir la voz de la narración.
- Como estudiante, quiero descargar la narración para escucharla sin conexión.

### Subtareas técnicas
- Nueva activity de síntesis de voz (Azure AI Speech — TTS) para `summary_text` y `notes_text`, ejecutada de forma asíncrona como el resto del pipeline (queue + function, nunca síncrona en la API)
- Nuevo campo/tabla para audio narrado generado (`narration_audio_url`, voz usada, duración) — vía SP dedicado, mismo patrón que `stt_recording_result`
- Construcción de SSML con prosodia contextual a partir del texto (marcado de pausas, énfasis) — prompt/lógica a definir en diseño técnico
- Selector de voz en el Workspace (Mobile)
- Caché de audio narrado en Azure Blob (evitar regenerar si el texto fuente no cambió) + descarga offline en Mobile

### Dependencias
- Depende de que exista `summary_text`/`notes_text` de calidad (se beneficia directamente de V2 — Transcript Cleanup)
- No depende de V3

### Criterios de aceptación
- El usuario puede generar y reproducir una narración del resumen y de las notas
- Cambiar de voz no requiere reprocesar transcripción/resumen/notas, solo la narración
- El audio narrado queda disponible offline tras la descarga

### Riesgos
- **Bajo-Medio:** costo y latencia de generación de audio por Knowledge Pack — el caché es mitigación directa.
- **Bajo:** SSML con prosodia contextual es la parte más experimental — acotar el alcance inicial a pausas/énfasis básicos antes de prosodia avanzada.

### Prioridad
Media — valor claro pero no bloqueante para el resto del roadmap.

### Estimación
L

---

## EPIC V5 — Knowledge Platform

### Objetivo
Conectar los Knowledge Packs entre sí como una plataforma de conocimiento, no solo como unidades individuales.

### Descripción
Con volumen suficiente de Knowledge Packs enriquecidos (V2.5) y estructurados por topics (V2), este EPIC introduce relaciones entre clases distintas, búsqueda semántica global, un dashboard de progreso y recomendaciones, incluyendo repaso espaciado basado en el desempeño en quizzes/flashcards (V3).

### Historias de usuario
- Como estudiante, quiero ver cómo se relacionan los temas de distintas clases entre sí.
- Como estudiante, quiero buscar semánticamente ("clases donde se habló de X") a través de todos mis Knowledge Packs, no solo dentro de uno.
- Como estudiante, quiero un dashboard con mi progreso de estudio.
- Como estudiante, quiero que el sistema me recomiende qué repasar según repetición espaciada.

### Subtareas técnicas
- Modelo de Knowledge Graph: entidades y relaciones entre Knowledge Packs, construido sobre `enrichment_json` de V2.5 (nueva capa de datos — evaluar almacenamiento relacional vs. grafo dedicado en diseño técnico)
- Búsqueda semántica: requiere embeddings de `transcript_clean_text`/`topics_json` — nuevo servicio de IA (Azure OpenAI embeddings) y almacenamiento vectorial (evaluar extensión PostgreSQL `pgvector` u otra opción, respetando que todo acceso sigue siendo vía SP/función SQL desde la Function)
- Dashboard: nuevos endpoints de agregación en la API (lectura vía vistas, sin DML)
- Recomendaciones y repaso espaciado: lógica basada en resultados de quiz/flashcards (V3) + fecha de último repaso — algoritmo a definir (ej. SM-2 o variante simple)

### Dependencias
- Depende de V2 (topics), V2.5 (enrichment) y V3 (resultados de quiz/flashcards para repaso espaciado)
- Es la versión con más dependencias acumuladas — no debería iniciarse antes de que V2/V2.5/V3 tengan datos reales de producción

### Criterios de aceptación
- El usuario puede navegar de un Knowledge Pack a otro relacionado semánticamente
- Una búsqueda semántica devuelve resultados relevantes entre distintas clases
- El dashboard refleja progreso real (no placeholder) y las recomendaciones de repaso usan desempeño real de quizzes

### Riesgos
- **Alto:** es la versión más especulativa — requiere volumen de datos reales que hoy no existe. Mitigación: no comprometer estimaciones firmes hasta tener datos de V1-V3 en producción.
- **Medio:** introduce almacenamiento vectorial, una pieza de infraestructura nueva no cubierta por los principios arquitectónicos actuales — requiere su propio ADR antes de implementar.

### Prioridad
Baja (por ahora) — visión de largo plazo, no accionable hasta que existan datos reales de las versiones anteriores.

### Estimación
XL

---

## Convención de estimación (t-shirt size)

No existe velocity histórica del equipo todavía, por lo que se usa tamaño relativo en vez de story points:

| Tamaño | Orden de magnitud |
|---|---|
| S | Días — cambio acotado a un componente |
| M | Días a una semana — un endpoint + su UI, sin nuevo modelo de datos complejo |
| L | 1-3 semanas — nueva superficie de UI o nuevo step de pipeline con su propio modelo de datos |
| XL | Varias semanas / requiere diseño técnico previo — múltiples componentes nuevos o infraestructura nueva |

Ver [[BACKLOG]] para el desglose de cada EPIC en issues individuales estimables con este mismo criterio.
