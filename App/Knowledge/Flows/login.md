# Flujo: Login

tags: #flow #auth #login #jwt

---

## Descripción

El login autentica al usuario y devuelve un JWT (`access_token`) que debe usarse en todas las peticiones protegidas.

---

## Endpoint

```http
POST /API/AUTH/login
Content-Type: application/json
```

---

## Payload

```json
{
  "email": "usuario@championai.app",
  "password": "Password123!"
}
```

---

## Respuestas

### Éxito — 200 OK

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "error": null
}
```

### Error — 401 Unauthorized

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Credenciales inválidas"
  }
}
```

---

## Diagrama

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as Champion API
    participant PG as PostgreSQL

    C->>API: POST /API/AUTH/login { email, password }
    API->>PG: SELECT sec_user WHERE lower(email) = lower(input)
    PG-->>API: user data + password_hash

    alt Usuario no existe o password incorrecta
        API->>C: 401 UNAUTHORIZED
    else Credenciales válidas
        API->>API: Genera JWT con user_id
        API->>C: 200 OK { access_token }
    end
```

---

## Uso del token

El `access_token` debe enviarse en el header `Authorization` de todos los endpoints protegidos:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Extracción del user_id

El backend extrae el `user_id` directamente del JWT en cada petición protegida.
El cliente **no** debe enviar el `user_id` en el body: se considera una falla de seguridad si el backend acepta un user_id externo sin validación contra el token.

---

## Errores posibles

| Status | Código | Motivo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email o password faltante en el body |
| 401 | `UNAUTHORIZED` | Credenciales incorrectas |
| 500 | `INTERNAL_ERROR` | Error de servidor |

---

## Preguntas abiertas

- ¿Cuánto tiempo expira el `access_token`?
- ¿Existe un mecanismo de refresh token?
- ¿Se registra `last_login_at` en `sec_user` al hacer login?
- ¿Existe bloqueo de cuenta tras intentos fallidos? (La tabla tiene `failed_attempts` y `locked_until`)

Ver [[known-issues]].

---

## Referencias cruzadas

- [[registration]] — Paso previo necesario
- [[upload-audio]] — Siguiente paso tras el login
- [[tables]] — Tablas `sec_user` y `sec_user_password`
- [[backend-api]] — Contrato HTTP completo
- [[error-codes]] — Catálogo de errores
