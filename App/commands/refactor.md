# Comando — /refactor

Prompt reutilizable para refactoring seguro de Champion AI. El objetivo es mejorar el código sin romper contratos ni principios arquitectónicos.

## Uso

Copiar el template correspondiente. Siempre verificar impacto antes de ejecutar.

---

## Refactoring — Extraer lógica de validación de un endpoint

```
Necesito refactorizar las validaciones del siguiente endpoint de Champion AI:

[PEGAR CÓDIGO DEL ENDPOINT]

El endpoint tiene validaciones mezcladas con la lógica de negocio.

Ayúdame a:
1. Extraer las validaciones a una función/middleware separado
2. Mantener el orden correcto (JWT → user_id → payload → campos específicos)
3. Garantizar que cada validación devuelve el error code correcto del catálogo
4. No cambiar el comportamiento observable — mismas respuestas, mismo contrato

Restricción: El refactoring no debe cambiar:
- El contrato de respuesta { success, data, error }
- Los códigos HTTP
- El orden de validaciones
- El uso de Stored Procedures para escritura

Referencia: App/rules/api.md, App/rules/security.md
```

---

## Refactoring — Mover DML directo a un Stored Procedure

```
El siguiente código tiene DML directo que debería estar en un Stored Procedure:

[PEGAR CÓDIGO CON DML DIRECTO]

Este código viola R-DB-01 (los SPs son el contrato del dominio).

Ayúdame a:
1. Crear el Stored Procedure correspondiente
   - Nombre sugerido: sp_{acción}_{entidad}_v1
   - Hacerlo idempotente (ON CONFLICT DO UPDATE) — R-DB-02
   - Si toca ai_job_status_history, respetar el protocolo is_current — R-DB-03

2. Reemplazar el DML directo con la llamada al SP

3. Verificar que el comportamiento observable no cambia

Genera:
a) El DDL del nuevo SP (para agregar a App/SQL/Stored Procedures/)
b) El código modificado que llama al SP
c) Un test SQL para verificar la idempotencia del SP
```

---

## Refactoring — Separar responsabilidades entre componentes

```
El siguiente código está haciendo cosas que no le corresponden al componente:

Componente: [API / Mobile / Azure Function]
Código: [PEGAR CÓDIGO]
Problema detectado: [DESCRIBIR — ej: "La API está llamando a Azure Speech directamente"]

Regla violada: [PRINCIPIO del CLAUDE.md o ADR correspondiente]

Ayúdame a:
1. Identificar qué lógica debe moverse y hacia dónde
2. Diseñar la interfaz entre los componentes (endpoint HTTP / SP / Azure Queue)
3. Generar el plan de cambios mínimo sin introducir nueva deuda técnica

Restricción: El comportamiento observable del sistema no debe cambiar.
```

---

## Refactoring — Agregar idempotencia a un Stored Procedure existente

```
El siguiente Stored Procedure no es idempotente:

[PEGAR SP]

Problema: si se ejecuta dos veces con los mismos argumentos, [DESCRIBIR EL ERROR].

Esto viola R-DB-02 y ADR-006 porque la Azure Function puede recibir el mismo mensaje más de una vez.

Ayúdame a:
1. Identificar qué operaciones no son idempotentes
2. Agregar ON CONFLICT DO UPDATE donde corresponda
3. Verificar que la lógica de is_current sigue siendo correcta

Genera:
a) El SP modificado
b) Un script SQL para testear la idempotencia:
   CALL sp_xxx(...mismos args...);
   CALL sp_xxx(...mismos args...);
   SELECT * FROM ai_job WHERE job_id = '...'; -- debe ser idempotente
```

---

## Refactoring — Normalizar errores de la API

```
Los siguientes endpoints de la API tienen manejo de errores inconsistente:

[LISTAR ENDPOINTS O PEGAR CÓDIGO]

Problemas identificados:
- [ej: algunos devuelven { message } en lugar de { success, data, error }]
- [ej: los error codes no están en SCREAMING_SNAKE_CASE]
- [ej: algunos casos retornan 200 cuando deberían retornar 400]

Ayúdame a normalizar los errores siguiendo:
- R-API-01: Envelope { success, data, error }
- R-SEC-08: Catálogo de códigos de error

Para cada endpoint, indica:
1. El código actual (incorrecto)
2. El código corregido
3. Por qué es el cambio correcto

Restricción: No cambiar la lógica de negocio — solo el formato de los errores.
```

---

## Refactoring — Extraer consultas de BD a vistas

```
El siguiente código de la API construye queries directas sobre las tablas:

[PEGAR CÓDIGO CON QUERIES AD-HOC]

Esto viola R-API-09 (las lecturas de polling deben usar las vistas del sistema).

Evalúa:
1. ¿La consulta corresponde a vw_ai_job_current_status o vw_stt_recording_result?
2. ¿La vista ya existe y cubre este caso?
3. Si no existe, ¿qué vista nueva sería necesaria?

Genera:
a) El reemplazo de la query directa por consulta a la vista
b) Si se necesita una nueva vista: el DDL de la vista
c) Verificación de que la nueva consulta retorna los mismos datos

Referencia: App/Knowledge/Database/views.md
```
