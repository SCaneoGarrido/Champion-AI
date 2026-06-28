# ADR-002: Azure Function solo puede llamar Stored Procedures

tags: #adr #database #domain #azure-function

---

## Estado

Adoptado

## Contexto

La Azure Function necesita escribir en PostgreSQL durante el procesamiento: actualizar estados, guardar resultados parciales y el resultado final. Tiene dos opciones para hacerlo: ejecutar DML directo (`INSERT`, `UPDATE`) o llamar Stored Procedures.

## Decisión

> **La Azure Function NUNCA ejecuta DML directo. Solo puede llamar Stored Procedures.**

Esta es una regla absoluta del sistema, documentada explícitamente en el contrato de arquitectura.

## Razonamiento

### Los SPs son el contrato del dominio

Los Stored Procedures encapsulan las reglas de negocio:
- `sp_create_stt_live_recording_job_v1` garantiza que un job siempre se crea con su historial inicial y su recording, en una sola transacción
- `sp_complete_stt_live_recording_job_v1` valida que el recording existe antes de guardar el resultado
- `sp_update_ai_job_status_v1` garantiza que el historial anterior se desactiva antes de insertar el nuevo

Si la Function hiciera DML directo, cualquier bug en la secuencia de operaciones podría dejar la BD en estado inconsistente.

### Separación de responsabilidades

| Capa | Responsable de |
|---|---|
| Azure Function | Lógica de procesamiento AI, orquestación de llamadas a SPs |
| Stored Procedures | Integridad de datos, reglas de dominio, atomicidad |
| PostgreSQL | Persistencia, índices, constraints |

### Testabilidad

Los SPs pueden ser testeados de forma independiente sin ejecutar la Function completa.
Un cambio en la lógica de datos solo requiere actualizar el SP, no el código de la Function.

## Consecuencias

**Positivas:**
- Las reglas del dominio viven en un solo lugar (SQL)
- Cambios en la estructura de datos no requieren redeployar la Function
- Fácil auditoría: todos los cambios pasan por SPs conocidos
- La BD puede rechazar operaciones inválidas sin depender del código de la Function

**Negativas / Compromisos:**
- Los SPs deben mantenerse junto al código de la Function
- Los desarrolladores necesitan conocer PL/pgSQL además del lenguaje de la Function
- Las migraciones de SPs son más complejas que cambios en código de aplicación

---

## Referencias cruzadas

- [[azure-function]] — Componente que debe respetar esta regla
- [[stored-procedures]] — Los SPs que puede llamar
- [[functions]] — Functions de soporte
- [[stt-processing]] — Flujo donde se aplica en práctica
