# Comando — /knowledge-pack

Prompt reutilizable para diseñar e implementar un componente nuevo del **Knowledge Pack**. Diseño completo de referencia: `App/Docs/product/`.

## Uso

Copiar el template correspondiente a la fase de trabajo. Flujo recomendado: especificar → ubicar en el pipeline → diseñar datos → implementar.

---

## Fase 1 — Especificar el componente

```
Quiero agregar un componente nuevo al Knowledge Pack de Champion AI: [NOMBRE]

Descripción: [QUÉ REPRESENTA]

Basándote en App/Docs/product/02-knowledge-pack-spec.md, ayúdame a especificarlo:

1. ¿Qué representa exactamente y en qué formato (texto, JSON, vector)?
2. ¿De qué componentes existentes depende? (ubicar en el grafo de dependencias)
3. ¿Qué habilita — qué otros componentes o capacidades de UX se vuelven posibles?
4. ¿Requiere una etapa de IA nueva, o es una proyección/agregación de componentes ya existentes?
   (ej. Chapters no necesita IA nueva porque se deriva de Topics)
5. ¿Cuál es su costo aproximado (ninguno/bajo/medio/alto) y por qué?
6. ¿Es MVP, roadmap o visión?
7. ¿Es regenerable independientemente? ¿Qué otros componentes deberían invalidarse si se regenera?

Referencia: App/Docs/product/02-knowledge-pack-spec.md
```

---

## Fase 2 — Ubicar en el pipeline

```
El componente [NOMBRE] ya está especificado. Ayúdame a ubicarlo en el pipeline:

1. ¿En qué capa del pipeline vive? (ver App/Docs/product/03-intelligent-pipeline-design.md)
2. ¿Con qué otras etapas de la misma capa puede ejecutarse en paralelo (context.task_all)?
3. ¿Qué activity nueva necesita, o reutiliza una existente?
4. ¿Qué prompt nuevo necesita (si aplica) y en qué archivo de App/procesamiento/prompts/?
5. ¿Qué modelo de IA corresponde (gpt-5-mini para razonamiento/generación, modelo de embeddings para Semantic Search)?
6. ¿Existe una etapa afín con la que convenga fusionar la llamada de IA para reducir costo?
   (ej. Keywords + Named Entities comparten input y naturaleza)

Referencia: App/Docs/product/03-intelligent-pipeline-design.md, App/rules/azure.md
```

---

## Fase 3 — Diseñar el modelo de datos

```
El componente [NOMBRE] ya está especificado y ubicado en el pipeline. Ayúdame a diseñar su persistencia:

1. ¿Es un componente MVP estable (columna dedicada en stt_recording_result) o roadmap (fila en stt_knowledge_component)?
   Regla: MVP estable → columna dedicada. Todo lo demás → modelo extensible. (R-KP-02)

2. Si es roadmap:
   - component_type propuesto (string único, ej. 'topics', 'flashcards')
   - forma del payload JSONB
   - ¿reutiliza sp_save_knowledge_component_v1? (nunca crear un SP dedicado — R-KP-03)

3. ¿Qué vista expone este componente al cliente? (nueva o extensión de vw_stt_recording_result)

4. ¿Requiere segmentación temporal (offsets)? Verificar que ya estén persistidos (R-KP-08)
   antes de diseñar este componente sobre datos que hoy se descartan.

Reglas obligatorias: App/rules/knowledge-pack.md (R-KP-01 a R-KP-10), App/rules/database.md
```

---

## Fase 4 — Implementar

```
Voy a implementar el componente [NOMBRE] del Knowledge Pack.

Especificación aprobada: [PEGAR RESULTADO DE FASES 1-3]

Genera:

1. Activity Python en App/procesamiento/activities/ (nueva o extensión de una existente)
2. Prompt en App/procesamiento/prompts/ (si aplica)
3. Cambios en el orquestador Durable para incluir la etapa en la capa correcta,
   paralelizada con las etapas afines de su misma capa (R-KP-07)
4. Llamada a sp_save_knowledge_component_v1 con component_type, payload, generator_model
5. Actualización de App/Docs/product/02-knowledge-pack-spec.md marcando el componente como implementado

Reglas obligatorias:
- Cero DML directo — solo el SP genérico (R-KP-03, R-DB-01)
- Idempotente vía ON CONFLICT (recording_id, component_type) (R-KP-04)
- Registrar generator_model y generator_prompt_ver (R-KP-05)
- No romper GET /jobs/{id}/result ni el envelope { success, data, error } (R-KP-09)

Antes de dar por terminado, invocar el agente App/agents/knowledge-pack-reviewer.md sobre el resultado.
```
