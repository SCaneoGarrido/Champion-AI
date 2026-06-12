# Análisis de Contrato de Respuestas HTTP — Champion AI API

**Fecha:** 2026-06-12  
**Alcance:** `App/API/src/` — controladores, rutas, middlewares y helpers  
**Estado:** Solo análisis y propuesta — sin cambios de código

---

## Tabla de Contenidos

1. [Inventario de Endpoints](#1-inventario-de-endpoints)
2. [Patrones de Respuesta Actuales](#2-patrones-de-respuesta-actuales)
3. [Inconsistencias Detectadas](#3-inconsistencias-detectadas)
4. [Contrato Estándar Propuesto](#4-contrato-estándar-propuesto)
5. [Cambios Sugeridos por Endpoint](#5-cambios-sugeridos-por-endpoint)
6. [Implementación Sugerida](#6-implementación-sugerida)

---

## 1. Inventario de Endpoints

### A. Autenticación — `/API/AUTH`

| Método | Ruta | Auth | Status Codes |
|--------|------|------|--------------|
| POST | `/API/AUTH/login` | No | 200, 400, 401, 500 |
| POST | `/API/AUTH/register` | No | 201, 400, 409, 500 |

### B. Speech-to-Text — `/AIServices/Speechv2`

| Método | Ruta | Auth | Status Codes |
|--------|------|------|--------------|
| POST | `/AIServices/Speechv2/init` | JWT Bearer | 201, 500 |
| POST | `/AIServices/Speechv2/SpeechToTextv2` | JWT Bearer | 202, 400, 500 |
| GET | `/AIServices/Speechv2/getAvailableLenguages` | JWT Bearer | 200, 404, 500 |
| GET | `/AIServices/Speechv2/getVoicesByLang` | JWT Bearer | 200, 400, 404, 500 |
| GET | `/AIServices/Speechv2/jobs/{job_id}/status` | JWT Bearer | ❌ No implementado |
| GET | `/AIServices/Speechv2/jobs/{job_id}/result` | JWT Bearer | ❌ No implementado |

> **Nota:** Los dos últimos endpoints están documentados en `Docs/STT_Feature_Grabación en vivo.md` y referenciados en respuestas del controller, pero no existen en el código.

### C. Visión — `/AIServices/Visionv1`

| Método | Ruta | Auth | Status Codes |
|--------|------|------|--------------|
| POST | `/AIServices/Visionv1/analyze-image-url` | No | 200, 400, 500 |
| POST | `/AIServices/Visionv1/analyze-uploaded-image` | No | 200, 400, 500 |

### D. Transversal — `/API/Transversal`

| Método | Ruta | Auth | Status Codes |
|--------|------|------|--------------|
| GET | `/API/Transversal/health` | No | 200, 503 |
| GET | `/API/Transversal/version` | No | 200 |

---

## 2. Patrones de Respuesta Actuales

Se identificaron **5 patrones distintos** de respuesta en uso simultáneo en la API. Ninguno es consistente con los demás.

---

### Patrón A — Auth Controller
**Usado en:** `login`, `register`  
**Archivo:** `src/controllers/auth.controller.js`

```json
// Éxito en register (201)
{
  "success": true,
  "data": {
    "message": "Usuario creado satisfactoriamente."
  },
  "error": null
}

// Éxito en login (200) — DIFERENTE al register
{
  "success": true,
  "access_token": "eyJhbGciOi..."
}

// Error en auth (400 / 401 / 409 / 500)
{
  "success": false,
  "data": null,
  "error": {
    "code": 400,
    "message": "Datos de entrada faltantes."
  }
}
```

**Problemas:**
- Login exitoso rompe el propio patrón que usa register (no usa `data`, expone `access_token` directo)
- `error.code` es numérico (replica el HTTP status), no un código semántico de string

---

### Patrón B — Speech Controller (errores)
**Usado en:** `SpeechToTextv2`, middlewares de validación (`validateAudio`, `validateSTTRequest`, `validateUserMatch`, `jwtMiddleware`)  
**Archivos:** `src/controllers/speech.controller.js`, `src/middleware/*.js`

```json
// Error (400 / 500)
{
  "error": {
    "code": "INVALID_STT_CONTEXT",
    "message": "No se pudo construir el contexto STT requerido."
  }
}
```

**Problemas:**
- No incluye `success`
- Usa string codes (correcto), pero es incompatible con Patrón A que usa numéricos
- Estructura de error inconsistente con el propio endpoint `/init` del mismo controller

---

### Patrón C — Speech Controller (respuestas exitosas)
**Usado en:** `SpeechToTextv2` (202), `init` (201), `getAvailableLenguages` (200), `getVoicesByLang` (200)  
**Archivo:** `src/controllers/speech.controller.js`

```json
// SpeechToTextv2 — aceptado (202)
{
  "status": "accepted",
  "job_id": "job_abc123",
  "flow": "flow_live_recording",
  "polling_url": "/AIServices/Speechv2/jobs/job_abc123/status",
  "created_at": "2026-06-12T10:00:00Z"
}

// init — creado (201)
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "blobName": "audio/user-uuid/job_abc123/archivo.webm",
    "uploadUrl": "https://storage.blob.core.windows.net/...",
    "expiresIn": 3600
  }
}

// getAvailableLenguages / getVoicesByLang — ok (200)
{
  "success": true,
  "result": [
    { "Locale": "es-CL", "LocalName": "Spanish (Chile)" }
  ]
}
```

**Problemas:**
- `SpeechToTextv2` no usa wrapper (`success`/`data`), el resto sí
- `init` usa `data`, pero `getLanguages` usa `result` — mismo controller, dos campos distintos para el payload

---

### Patrón D — Vision Routes
**Usado en:** `analyze-image-url`, `analyze-uploaded-image`  
**Archivo:** `src/routes/vision_routes.js`

```json
// analyze-image-url — ok (200)
{
  "success": true,
  "message": "Imagen analizada correctamente desde URL.",
  "data": { ... }
}

// analyze-uploaded-image — ok (200) — DIFERENTE
{
  "success": true,
  "message": "Imagen analizada correctamente desde archivo subido.",
  "detected_text": [ ... ],
  "better_img_description": "..."
}
```

**Problemas:**
- `analyze-image-url` usa `data` como wrapper, `analyze-uploaded-image` expone propiedades directamente (`detected_text`, `better_img_description`)
- Ambos del mismo módulo pero con estructura diferente

---

### Patrón E — Health Controller
**Usado en:** `health`, `version`  
**Archivo:** `src/controllers/health.controller.js`

```json
// health — ok (200) o degradado (503)
{
  "uptime": 12345.67,
  "status": "UP",
  "services": {
    "postgres": true,
    "azureQueue": true,
    "azureBlob": true
  }
}

// version — ok (200)
{
  "name": "Champion AI API",
  "version": "1.0.0",
  "status": "online",
  "environment": "production",
  "services": ["STT"],
  "server_time": "2026-06-12T10:00:00Z"
}
```

**Nota:** Estos endpoints son informativos/diagnósticos, por lo que su estructura plana tiene cierta justificación, pero no está documentada como excepción intencional.

---

## 3. Inconsistencias Detectadas

### I-01 — Campo payload inconsistente (`data` vs `result` vs directo)

| Endpoint | Campo usado | Archivo |
|----------|-------------|---------|
| `POST /register` | `data` | `auth.controller.js` |
| `POST /init` | `data` | `speech.controller.js` |
| `POST /analyze-image-url` | `data` | `vision_routes.js` |
| `GET /getAvailableLenguages` | `result` | `speech.controller.js` |
| `GET /getVoicesByLang` | `result` | `speech.controller.js` |
| `POST /analyze-uploaded-image` | _(campos directos)_ | `vision_routes.js` |
| `POST /SpeechToTextv2` | _(campos directos)_ | `speech.controller.js` |

**Impacto:** El cliente debe conocer el campo correcto por endpoint en lugar de manejar un contrato uniforme.

---

### I-02 — Flag `success` ausente en algunos endpoints

**Presente en:** `login`, `register`, `init`, `getLanguages`, `getVoicesByLang`, `analyze-image-url`, `analyze-uploaded-image`  
**Ausente en:** `SpeechToTextv2` (202, 400, 500)  
**Archivo:** `src/controllers/speech.controller.js:55-61`

---

### I-03 — `error.code` es numérico en Auth, string en el resto

| Módulo | Tipo de code | Ejemplo |
|--------|-------------|---------|
| Auth | `number` | `400`, `401`, `409`, `500` |
| Speech controller | `string` | `"INVALID_STT_CONTEXT"`, `"JOB_CREATION_FAILED"` |
| Middlewares | `string` | `"INVALID_TOKEN"`, `"USER_MISMATCH"`, `"UNSUPPORTED_FORMAT"` |

**Impacto:** El cliente no puede manejar errores de forma genérica; necesita tratar Auth distinto al resto.

---

### I-04 — Login exitoso rompe el patrón del propio módulo Auth

```json
// register (201) — con wrapper data
{ "success": true, "data": { "message": "..." }, "error": null }

// login (200) — sin wrapper, access_token al nivel raíz
{ "success": true, "access_token": "eyJ..." }
```

**Archivo:** `src/controllers/auth.controller.js`  
**Impacto:** Inconsistencia dentro del mismo controller.

---

### I-05 — Contrato documentado no se cumple

El archivo `App/Docs/arquitectura/error.json` define:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": 500,
    "message": "Info"
  }
}
```

Este contrato solo se respeta parcialmente en Auth. Los módulos STT y Vision no lo siguen.

---

### I-06 — Endpoints referenciados pero no implementados

La respuesta de `SpeechToTextv2` incluye `polling_url` apuntando a:

```
GET /AIServices/Speechv2/jobs/{job_id}/status
```

Este endpoint **no existe** en el router. El cliente recibiría un 404 al intentar hacer polling.

---

### I-07 — `data: null` explícito solo en Auth

En errores de Auth se retorna `"data": null` explícitamente. En los demás módulos se omite el campo. Aunque funcionalmente equivalente, genera ruido en el cliente al parsear.

---

## 4. Contrato Estándar Propuesto

Basado en el contrato documentado en `Docs/arquitectura/error.json` y extendiendo hacia las necesidades del proyecto, se propone el siguiente estándar.

### 4.1 Estructura Base

```json
{
  "success": true | false,
  "data": <objeto | array | null>,
  "error": <objeto de error | null>
}
```

**Regla:** `data` y `error` son mutuamente excluyentes. Si `success: true`, `error` es `null`. Si `success: false`, `data` es `null`.

---

### 4.2 Respuesta Exitosa

```json
{
  "success": true,
  "data": <payload>,
  "error": null
}
```

**Variante para 202 Accepted (operaciones asíncronas):**

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "accepted",
    "flow": "flow_live_recording",
    "polling_url": "/AIServices/Speechv2/jobs/job_abc123/status",
    "created_at": "2026-06-12T10:00:00Z"
  },
  "error": null
}
```

**Variante para colecciones:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "count": 5
  },
  "error": null
}
```

---

### 4.3 Respuesta de Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SNAKE_CASE_STRING",
    "message": "Mensaje legible para el usuario o desarrollador."
  }
}
```

**Reglas del campo `error`:**
- `code`: siempre `string` en `SCREAMING_SNAKE_CASE`, semántico (nunca replicar el HTTP status como número)
- `message`: siempre en español (idioma del proyecto), sin datos sensibles

---

### 4.4 Catálogo de Error Codes Estándar

| Code | HTTP Status | Descripción |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Payload inválido o campos faltantes |
| `INVALID_FORMAT` | 400 | Formato de archivo/dato no soportado |
| `INVALID_PAYLOAD` | 400 | Estructura del body incorrecta |
| `UNAUTHORIZED` | 401 | Sin credenciales o credenciales inválidas |
| `INVALID_TOKEN` | 401 | JWT ausente o inválido |
| `FORBIDDEN` | 403 | Credenciales válidas pero sin permiso |
| `TOKEN_EXPIRED` | 403 | JWT expirado |
| `USER_MISMATCH` | 403 | user_id del token no coincide con el payload |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Conflicto de recurso (ej: email duplicado) |
| `INTERNAL_ERROR` | 500 | Error interno no clasificado |
| `SERVICE_UNAVAILABLE` | 503 | Servicio externo no disponible |
| `JOB_CREATION_FAILED` | 500 | No se pudo crear el job STT |
| `INVALID_STT_CONTEXT` | 400 | Contexto STT mal formado |
| `UNSUPPORTED_FORMAT` | 400 | Formato de audio no soportado |
| `INVALID_SAMPLE_RATE` | 400 | Sample rate de audio inválido |
| `DURATION_EXCEEDED` | 400 | Audio supera duración máxima |
| `INVALID_BLOB_URL` | 400 | URL de blob inválida o expirada |
| `SERVER_MISCONFIGURATION` | 500 | Variable de entorno faltante o inválida |

---

### 4.5 Respuestas por Endpoint bajo el Contrato Propuesto

#### POST `/API/AUTH/login` — 200

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi..."
  },
  "error": null
}
```

#### POST `/API/AUTH/register` — 201

```json
{
  "success": true,
  "data": {
    "message": "Usuario creado satisfactoriamente."
  },
  "error": null
}
```

#### POST `/AIServices/Speechv2/init` — 201

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "blob_name": "audio/user-uuid/job_abc123/archivo.webm",
    "upload_url": "https://storage.blob.core.windows.net/...",
    "expires_in": 3600
  },
  "error": null
}
```

#### POST `/AIServices/Speechv2/SpeechToTextv2` — 202

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "accepted",
    "flow": "flow_live_recording",
    "polling_url": "/AIServices/Speechv2/jobs/job_abc123/status",
    "created_at": "2026-06-12T10:00:00Z"
  },
  "error": null
}
```

#### GET `/AIServices/Speechv2/getAvailableLenguages` — 200

```json
{
  "success": true,
  "data": {
    "items": [
      { "locale": "es-CL", "local_name": "Spanish (Chile)" }
    ],
    "count": 1
  },
  "error": null
}
```

#### POST `/AIServices/Visionv1/analyze-image-url` — 200

```json
{
  "success": true,
  "data": {
    "detected_text": ["texto1", "texto2"],
    "description": "Descripción generada de la imagen."
  },
  "error": null
}
```

#### GET `/API/Transversal/health` — 200 / 503

```json
{
  "success": true,
  "data": {
    "uptime": 12345.67,
    "status": "UP",
    "services": {
      "postgres": true,
      "azure_queue": true,
      "azure_blob": true
    }
  },
  "error": null
}
```

> **Excepción documentada:** `/API/Transversal/version` puede mantener su estructura plana actual ya que es un endpoint de diagnóstico/discovery, no de negocio.

---

## 5. Cambios Sugeridos por Endpoint

### Auth Controller (`src/controllers/auth.controller.js`)

| Situación actual | Cambio sugerido | Prioridad |
|-----------------|-----------------|-----------|
| Login retorna `access_token` directo en raíz | Mover a `data.access_token` | Alta |
| `error.code` es numérico (`400`, `401`) | Cambiar a string semántico (`UNAUTHORIZED`, `CONFLICT`) | Alta |
| `data: null` explícito en errores | Mantener (ya cumple el contrato propuesto) | — |

### Speech Controller (`src/controllers/speech.controller.js`)

| Situación actual | Cambio sugerido | Prioridad |
|-----------------|-----------------|-----------|
| `SpeechToTextv2` omite `success` | Añadir `success: true` y envolver en `data` | Alta |
| `getLanguages` y `getVoicesByLang` usan `result` | Cambiar a `data.items` | Media |
| `init` usa `blobName` (camelCase) | Cambiar a `blob_name` (snake_case, consistente con el resto) | Baja |

### Vision Routes (`src/routes/vision_routes.js`)

| Situación actual | Cambio sugerido | Prioridad |
|-----------------|-----------------|-----------|
| `analyze-uploaded-image` expone `detected_text` directo | Mover a `data.detected_text` | Alta |
| `message` descriptivo en respuesta | Mover dentro de `data.message` o eliminar (redundante con status code) | Media |

### Middlewares

| Middleware | Situación actual | Cambio sugerido | Prioridad |
|-----------|-----------------|-----------------|-----------|
| `jwtMiddleware.js` | Ya usa `{ error: { code: string, message } }` | Añadir `success: false, data: null` | Media |
| `validateAudio.js` | Ya usa `{ error: { code: string, message } }` | Añadir `success: false, data: null` | Media |
| `validateSTTRequest.js` | Ya usa `{ error: { code: string, message } }` | Añadir `success: false, data: null` | Media |
| `validateUserMatch.js` | Ya usa `{ error: { code: string, message } }` | Añadir `success: false, data: null` | Media |

---

## 6. Implementación Sugerida

### 6.1 Response Helper Centralizado

Se recomienda crear `src/utils/response.helper.js`:

```javascript
/**
 * Construye una respuesta HTTP exitosa estandarizada.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (2xx)
 * @param {any} data - Payload de la respuesta
 */
function sendSuccess(res, statusCode, data) {
  return res.status(statusCode).json({
    success: true,
    data: data ?? null,
    error: null,
  });
}

/**
 * Construye una respuesta HTTP de error estandarizada.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (4xx / 5xx)
 * @param {string} code - Error code en SCREAMING_SNAKE_CASE
 * @param {string} message - Mensaje descriptivo del error
 */
function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message },
  });
}

module.exports = { sendSuccess, sendError };
```

### 6.2 Middleware Global de Manejo de Errores

Se recomienda añadir en `src/index.js` (al final, antes del listen):

```javascript
// Captura errores no manejados de middleware/controllers
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor.',
    },
  });
});
```

### 6.3 Prioridad de Migración Sugerida

| Prioridad | Acción |
|-----------|--------|
| 1 | Crear `src/utils/response.helper.js` |
| 2 | Migrar `auth.controller.js` (fix login + error codes numéricos) |
| 3 | Migrar `speech.controller.js` (SpeechToTextv2 + result→data.items) |
| 4 | Migrar `vision_routes.js` (datos directos → data wrapper) |
| 5 | Migrar middlewares (añadir `success: false, data: null`) |
| 6 | Añadir middleware global de error handling en `index.js` |
| 7 | Implementar endpoints faltantes (`/jobs/{id}/status`, `/jobs/{id}/result`) |

---

## Resumen Ejecutivo

El proyecto tiene **5 patrones de respuesta distintos** conviviendo en una API de 10 endpoints. Existe un contrato documentado en `Docs/arquitectura/error.json` que no se cumple de forma consistente.

Las inconsistencias principales son:
- El campo del payload varía (`data`, `result`, o propiedades directas)
- El flag `success` está ausente en el módulo STT
- Los códigos de error son numéricos en Auth y strings en el resto
- El propio módulo Auth tiene login y register con estructuras diferentes
- Dos endpoints referenciados en respuestas (`/jobs/{id}/status`, `/jobs/{id}/result`) no están implementados

La solución de menor fricción es introducir un helper centralizado (`response.helper.js`) y migrar los controladores de forma incremental, sin cambiar la lógica de negocio existente.
