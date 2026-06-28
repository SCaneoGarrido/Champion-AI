# Comando — /review

Prompt reutilizable para revisar código de Champion AI.

## Uso

Copiar y adaptar según el componente o artefacto a revisar.

---

## Revisión de endpoint de la API

```
Actúa como el API Reviewer de Champion AI (ver App/agents/api-reviewer.md).

Revisa el siguiente endpoint de la Champion API:

[PEGAR CÓDIGO DEL ENDPOINT]

Evalúa:
1. ¿Sigue el contrato de respuesta { success, data, error }?
2. ¿El JWT se valida como primer paso?
3. ¿El user_id se extrae del token, no del payload?
4. ¿Las escrituras de dominio usan Stored Procedures?
5. ¿Las lecturas usan las vistas definidas?
6. ¿Los códigos HTTP y error codes son los correctos?
7. ¿Se maneja el fallo de encolamiento?

Para cada problema encontrado, indica:
- Regla violada (referencia App/rules/api.md)
- Código actual
- Cómo debe ser
```

---

## Revisión de Stored Procedure

```
Actúa como el PostgreSQL Reviewer de Champion AI (ver App/agents/postgres-reviewer.md).

Revisa el siguiente Stored Procedure:

[PEGAR SP]

Evalúa:
1. ¿Es idempotente? ¿Qué pasa si se ejecuta dos veces con los mismos argumentos?
2. ¿Respeta el protocolo is_current (desactiva anterior antes de insertar nuevo)?
3. ¿Las operaciones están en la transacción correcta?
4. ¿Los tipos de parámetros son consistentes con el schema actual?
5. ¿Actualiza ai_job.status, current_step y los timestamps correspondientes?

Para cada problema, indica el número de línea y la corrección necesaria.
```

---

## Revisión de Azure Function

```
Actúa como el Azure Reviewer de Champion AI (ver App/agents/azure-reviewer.md).

Revisa el siguiente código de la Azure Function:

[PEGAR CÓDIGO]

Evalúa:
1. ¿fn_can_process_ai_job es el primer paso?
2. ¿Hay algún DML directo (INSERT/UPDATE/DELETE) sin pasar por SP?
3. ¿Los pasos del pipeline están en orden correcto?
4. ¿Cada paso actualiza el estado en BD antes de comenzar el trabajo?
5. ¿Los errores de IA producen status='failed' con error_code específico?
6. ¿El language_locale viene del contexto del job, no está hardcodeado?
7. ¿El código soporta redelivery (idempotencia)?
```

---

## Revisión de migración de BD

```
Actúa como el PostgreSQL Reviewer de Champion AI.

Revisa la siguiente migración:

[PEGAR MIGRACIÓN SQL]

Evalúa:
1. ¿Qué tablas modifica?
2. ¿Qué vistas dependen de esas tablas? ¿Se recrean en esta migración?
3. ¿Qué SPs usan las columnas modificadas? ¿Se actualizan?
4. ¿Qué constraints se ven afectados?
5. ¿La migración es reversible?
6. ¿Hay riesgo de pérdida de datos?

Lista los objetos que deben actualizarse pero no están en la migración.
```

---

## Revisión arquitectónica de una propuesta

```
Actúa como el Architecture Reviewer de Champion AI (ver App/agents/architecture-reviewer.md).

Evalúa la siguiente propuesta de diseño o feature:

[DESCRIBIR LA PROPUESTA]

Evalúa contra los principios en CLAUDE.md:
1. ¿Cada componente hace solo lo que le corresponde?
2. ¿No rompe ninguno de los 6 ADRs del proyecto?
3. ¿El flujo de datos mantiene PostgreSQL como fuente de verdad?
4. ¿El procesamiento de IA es async (queue + function)?
5. ¿La API no recibe binarios?

Indica si la propuesta es aprobada, necesita ajustes, o debe rediseñarse.
```
