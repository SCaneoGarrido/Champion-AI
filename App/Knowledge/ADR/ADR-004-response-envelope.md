# ADR-004: Contrato de respuesta estándar { success, data, error }

tags: #adr #api #contract #http

---

## Estado

Adoptado (v3.0 del contrato)

## Contexto

Una API con múltiples endpoints puede devolver respuestas en formatos inconsistentes:
- Algunos con `{ status, message }`
- Otros con `{ ok, result }`
- Errores directamente en el body sin estructura
- HTTP status code como única señal de error

Esto obliga al cliente a manejar casos especiales por endpoint.

## Decisión

**Todas** las respuestas de la Champion API siguen esta estructura:

```json
{
  "success": true | false,
  "data": <objeto | array | null>,
  "error": { "code": "SCREAMING_SNAKE_CASE", "message": "..." } | null
}
```

**Reglas:**
- Si `success: true` → `error` es siempre `null`
- Si `success: false` → `data` es siempre `null`
- `error.code` siempre en `SCREAMING_SNAKE_CASE`
- HTTP status code refleja la categoría del error (no es el único indicador)

## Razonamiento

### El cliente siempre sabe qué esperar

```javascript
const response = await api.post('/endpoint', body);

if (response.data.success) {
  handle(response.data.data);  // siempre aquí si éxito
} else {
  handleError(response.data.error.code);  // siempre aquí si error
}
```

No hay casos especiales por endpoint.

### El error code es machine-readable

El campo `error.code` en `SCREAMING_SNAKE_CASE` permite al cliente reaccionar a tipos de error específicos:

```javascript
if (error.code === 'TOKEN_EXPIRED') → redirect to login
if (error.code === 'CONFLICT')      → show "email already exists"
if (error.code === 'QUEUE_SEND_FAILED') → show retry option
```

### Versionado

Esta es la versión 3.0 del contrato. Versiones anteriores no están documentadas en las fuentes disponibles.

## Consecuencias

**Positivas:**
- La app móvil puede tener un interceptor HTTP único para manejar errores
- Los códigos de error son auditables y documentables
- El contrato es predecible para pruebas automatizadas

**Negativas / Compromisos:**
- Respuestas de éxito siempre tienen un nivel extra de anidación (`data.data`)
- Los códigos de error deben ser mantenidos y documentados activamente

---

## Catálogo de códigos de error

Ver [[error-codes]] para el catálogo completo.

---

## Referencias cruzadas

- [[backend-api]] — Todos los endpoints que siguen este contrato
- [[error-codes]] — Catálogo de códigos
- [[registration]] — Ejemplo con múltiples errores
- [[upload-audio]] — Ejemplo con muchos tipos de error de validación
