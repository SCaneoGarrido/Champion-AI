# Reglas — Seguridad

Reglas de seguridad específicas de Champion AI. Aplicar al revisar endpoints, lógica de auth y acceso a datos.

## R-SEC-01: JWT requerido en todos los endpoints excepto register y login

Los dos únicos endpoints públicos son:
- `POST /API/AUTH/register`
- `POST /API/AUTH/login`

Todos los demás requieren `Authorization: Bearer {token}` y deben rechazar con `401 INVALID_TOKEN` si está ausente.

**Checklist al agregar un endpoint:**
- [ ] ¿Requiere JWT? Si es cualquier endpoint que acceda a datos del usuario → sí
- [ ] ¿Está en la lista de excepciones? → solo register y login

## R-SEC-02: user_id nunca del payload del cliente

El `user_id` se extrae del JWT. Si el cliente envía un `user_id` en el body, **validar** que coincide con el del token. Si no coincide → `403 USER_MISMATCH`.

Nunca usar el `user_id` del payload directamente para operaciones de BD sin esta validación.

**Código de error:** `USER_MISMATCH` (HTTP 403)

## R-SEC-03: Emails case-insensitive para prevenir duplicados

El índice `uq_sec_user_email_lower` en `sec_user` almacena `lower(email)`.

Al buscar usuarios por email (en login o en check de duplicados en registro), usar:
```sql
WHERE lower(email) = lower($1)
```

**Violación:** comparación case-sensitive que permite registrar `User@mail.com` y `user@mail.com` como cuentas distintas.

## R-SEC-04: Contraseñas hasheadas con bcrypt

Las contraseñas nunca se almacenan en texto plano. Se guardan como hash bcrypt en `sec_user_password.password_hash`.

`sec_user_password.password_algorithm = 'bcrypt'`

No almacenar contraseñas en `sec_user` ni en ninguna otra tabla.

## R-SEC-05: SAS URL con alcance mínimo

La SAS URL para upload a Azure Blob debe tener el menor alcance posible:
- Solo operación `PUT` (no `GET`, `DELETE`, ni wildcard)
- Scoped al blob específico (`audio/{user_uuid}/{job_id}/{job_id}.{formato}`)
- Expiración: 3600 segundos máximo

Una SAS URL interceptada solo puede usarse para subir ese blob específico en la siguiente hora.

## R-SEC-06: La Azure Function no expone superficie HTTP

La Azure Function es disparada por Queue Trigger, no por HTTP. No tiene endpoints HTTP públicos.
No agregar triggers HTTP a la Azure Function para evitar exponer el pipeline de procesamiento directamente.

## R-SEC-07: Validar formato de audio en la API — no confiar solo en el cliente

La API valida el formato de audio antes de crear el job:
- Formatos válidos: `webm | mp4 | m4a | mp3 | wav | ogg`
- Sample rates válidos: `8000 | 16000 | 44100 | 48000`
- Duración máxima: 10800 segundos

Estas validaciones están en la API porque la BD también las enforcea con constraints, pero la API debe rechazar antes de llegar a la BD para dar un error descriptivo al cliente.

## R-SEC-08: Catálogo de códigos de error HTTP

| HTTP | Código | Uso |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos faltantes en register/login |
| 400 | `INVALID_PAYLOAD` | `req_info` ausente en STT |
| 400 | `INVALID_STT_CONTEXT` | req_info o audio_info mal formados |
| 400 | `UNSUPPORTED_FORMAT` | Formato de audio no soportado |
| 400 | `INVALID_SAMPLE_RATE` | Sample rate inválido |
| 400 | `DURATION_EXCEEDED` | Audio > 3 horas |
| 400 | `INVALID_BLOB_URL` | blob_url ausente o expirada |
| 401 | `UNAUTHORIZED` | Credenciales incorrectas en login |
| 401 | `INVALID_TOKEN` | JWT ausente en endpoint protegido |
| 403 | `TOKEN_EXPIRED` | JWT inválido o expirado |
| 403 | `USER_MISMATCH` | user_id del token no coincide con el payload |
| 404 | `NOT_FOUND` | job_id no encontrado |
| 409 | `CONFLICT` | Email ya registrado |
| 500 | `JOB_CREATION_FAILED` | No se pudo crear el job en BD |
| 500 | `QUEUE_SEND_FAILED` | No se pudo publicar en Azure Queue |
| 500 | `INTERNAL_ERROR` | Error no clasificado |

Al agregar un nuevo código de error, actualizar este catálogo y `App/Knowledge/Operations/error-codes.md`.

## R-SEC-09: Conexión directa de Azure Function a PostgreSQL

La Azure Function se conecta directamente a PostgreSQL. Esta conexión no pasa por la API.
Las credenciales de BD de la Function deben estar en variables de entorno, no en código.

Superficie de ataque: la Function necesita acceso de red directo a PostgreSQL. Esto debe estar restringido por network rules (VNet o equivalente en la infraestructura de despliegue).

## R-SEC-10: No exponer errores internos al cliente

Los errores `500 INTERNAL_ERROR` devuelven solo `{ code, message }` genérico.
Stack traces, nombres de tablas, queries SQL y detalles internos no deben aparecer en respuestas HTTP al cliente.

Registrar el detalle del error en logs del servidor — no en la respuesta.
