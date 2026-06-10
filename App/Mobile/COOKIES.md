# Cookies y sesión en la app

## Qué guarda la API (backend) en cookies

En **POST /api/auth/login**, el backend (App/API) envía en la respuesta **dos cookies**:

| Cookie          | Contenido     | httpOnly | Duración | Uso |
|-----------------|---------------|----------|----------|-----|
| **jwt**         | Token JWT     | Sí       | 15 min   | Autenticación en peticiones posteriores |
| **refresh_token** | Token de refresco | Sí   | 7 días   | Renovar el jwt cuando expire |

- **httpOnly:** el código JavaScript de la app **no puede leer** estas cookies (seguridad). Las gestiona el cliente HTTP (fetch con `credentials: 'include'`); en React Native el stack nativo puede almacenarlas y reenviarlas en las siguientes peticiones al mismo dominio.
- Definición: `App/API/src/routes/auth_routes.js` (líneas 36-49).

---

## Qué guarda la app móvil (AsyncStorage)

La app **no** lee las cookies anteriores. Solo guarda en **AsyncStorage** lo que la API devuelve en el **cuerpo JSON** del login:

- **Clave:** `@champion_user`
- **Valor:** objeto JSON, por ejemplo: `{"user_id":"..."}`

Eso se usa para:

- Saber si hay sesión activa (Dashboard).
- Mostrar `user_id` en la pantalla "Datos de sesión / cookies".

Para **ver** ese contenido dentro de la app: en el **Dashboard** está la sección **"Datos de sesión / cookies"**, que muestra el valor crudo guardado en `@champion_user` y una nota sobre las cookies de la API.

---

## Resumen

- **Cookies de la API:** `jwt`, `refresh_token` (solo las gestiona el cliente HTTP; no son visibles desde JS).
- **Datos de sesión en la app:** AsyncStorage, clave `@champion_user`, valor `{ user_id }` (visible en Dashboard).
