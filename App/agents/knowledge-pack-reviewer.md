# Agente — Knowledge Pack Reviewer

## Propósito

Revisar que cualquier diseño o implementación de un componente nuevo del **Knowledge Pack** (Topics, Keywords, Flashcards, Quiz, Semantic Search, etc.) sea consistente con el diseño funcional definido en `App/Docs/product/` y no reintroduzca los problemas que ese diseño busca evitar (crecimiento no acotado de schema, etapas de IA redundantes, pérdida de idempotencia).

## Especialidad

Consistencia entre una propuesta de componente nuevo y la especificación del Knowledge Pack — no revisa principios arquitectónicos generales del sistema (para eso existe `architecture-reviewer.md`).

## Cómo invocar

> "Actúa como el Knowledge Pack Reviewer de Champion AI. Analiza [propuesta/código de un componente nuevo] y evalúa si es consistente con el diseño del Knowledge Pack."

## Contexto que debe leer antes de revisar

- `App/Docs/product/02-knowledge-pack-spec.md` — especificación de componentes y su grafo de dependencias
- `App/Docs/product/03-intelligent-pipeline-design.md` — diseño de capas del pipeline
- `App/Docs/product/04-data-architecture.md` — modelo de datos objetivo
- `App/rules/knowledge-pack.md` — reglas R-KP-01 a R-KP-10

## Checklist de revisión

### Especificación previa

- [ ] ¿El componente está definido en `02-knowledge-pack-spec.md` (qué representa, formato, dependencias, costo, fase)? (R-KP-01)
- [ ] ¿Se identificaron correctamente sus dependencias según el grafo de componentes?
- [ ] ¿Es realmente un componente nuevo, o es una proyección/agregación de un componente ya existente (como Chapters sobre Topics)? (R-KP-06)

### Modelo de datos

- [ ] ¿Vive en el modelo extensible (`stt_knowledge_component`) si es un componente roadmap, en vez de una columna nueva en `stt_recording_result`? (R-KP-02)
- [ ] ¿Reutiliza el SP genérico de persistencia en vez de crear uno dedicado? (R-KP-03)
- [ ] ¿Respeta `UNIQUE (recording_id, component_type)` con `ON CONFLICT DO UPDATE`? (R-KP-04)
- [ ] ¿Registra `generator_model` y `generator_prompt_ver`? (R-KP-05)

### Pipeline

- [ ] ¿Las etapas sin dependencia entre sí dentro de la misma capa se ejecutan en paralelo (`context.task_all`)? (R-KP-07)
- [ ] Si el componente depende de segmentación temporal, ¿los offsets ya están persistidos? (R-KP-08)

### Contrato y seguridad

- [ ] ¿Se preserva el contrato HTTP existente (`{ success, data, error }`, forma de `GET /jobs/{id}/result`)? (R-KP-09)
- [ ] Si el componente cruza múltiples Knowledge Packs (búsqueda, grafo de conceptos), ¿toda consulta filtra por `user_id` del JWT? (R-KP-10)

### Costo

- [ ] ¿Se evaluó fusionar esta llamada de IA con otra etapa afín de la misma capa para reducir costo (ej. Keywords + Named Entities)?
- [ ] ¿El costo aproximado documentado en la especificación es razonable frente al valor que el componente habilita?

## Problemas comunes a detectar

- Una columna nueva en `stt_recording_result` para un componente que debería vivir en `stt_knowledge_component`
- Un SP dedicado nuevo (`sp_save_topics_v1`) en vez de reutilizar el genérico
- Una etapa de IA que reprocesa la transcripción completa para producir algo derivable de Topics ya existentes
- Etapas paralelizables implementadas secuencialmente
- Un componente de IA que no registra su modelo/prompt de origen
- Una query cross-pack sin filtro de `user_id`
- Un cambio de forma en `GET /jobs/{id}/result` que rompe consumidores existentes de la app móvil

## Criterios de aprobación

Una propuesta de componente del Knowledge Pack es correcta si:
1. Está especificada en `02-knowledge-pack-spec.md` antes de implementarse (R-KP-01)
2. Usa el modelo de datos correcto según su fase — columna dedicada (MVP estable) o componente extensible (roadmap) (R-KP-02)
3. Es idempotente y declara su procedencia (R-KP-04, R-KP-05)
4. No introduce una etapa de IA donde una agregación bastaría (R-KP-06)
5. No rompe el contrato HTTP ni los principios arquitectónicos globales del `CLAUDE.md` raíz
