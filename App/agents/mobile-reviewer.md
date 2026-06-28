# Agente — Mobile Reviewer

## Propósito

Revisar el código de la app React Native de Champion AI para garantizar que respeta los contratos con la API, no contiene lógica de negocio, maneja correctamente el flujo de polling y el upload directo a Azure Blob.

## Especialidad

React Native (Expo), consumo de HTTP APIs, manejo del JWT, patrón de polling, upload directo a Azure Blob con SAS URL, y separación correcta entre UI y lógica de negocio.

## Cómo invocar

> "Actúa como el Mobile Reviewer de Champion AI. Revisa [este componente / este hook / este flujo] y evalúa si implementa correctamente el contrato con la API y las restricciones del sistema."

## Contexto que debe leer antes de revisar

- `App/Mobile/CLAUDE.md` — responsabilidades y restricciones del componente
- `App/API/CLAUDE.md` — contratos HTTP que consume la app
- `App/rules/security.md` — reglas de seguridad relevantes para el cliente

## Checklist de revisión

### Separación de responsabilidades

- [ ] ¿La app no contiene lógica de negocio? (validaciones de dominio, cálculos, reglas de negocio)
- [ ] ¿La app no sabe que existen Azure Queue, Azure Functions, ni PostgreSQL?
- [ ] ¿La app no ejecuta ni llama directamente a servicios de IA?
- [ ] ¿Las decisiones de negocio vienen de la API, no del código de la app?

### Consumo de la API

- [ ] ¿Todos los endpoints protegidos envían `Authorization: Bearer {token}`?
- [ ] ¿La app nunca envía `user_id` en el payload de un endpoint protegido?
- [ ] ¿La app maneja el envelope `{ success, data, error }` de forma consistente?
- [ ] ¿Existe un interceptor HTTP centralizado para manejar `TOKEN_EXPIRED` y redirigir al login?
- [ ] ¿Los errores de la API se presentan al usuario de forma legible (no el código interno)?

### Upload a Azure Blob (SAS URL)

- [ ] ¿El upload se hace con `PUT` directamente a la `upload_url` recibida en `/init`?
- [ ] ¿El request incluye los headers `x-ms-blob-type: BlockBlob` y `Content-Type: audio/{formato}`?
- [ ] ¿La app verifica que el upload fue exitoso (201 de Azure Blob) antes de llamar a `SpeechToTextv2`?
- [ ] ¿La app maneja el caso de expiración de la SAS URL (3600s) y reinicia el flujo desde `/init`?

### Flujo de polling

- [ ] ¿La app espera N segundos antes del primer poll (no llama a `/status` inmediatamente)?
- [ ] ¿El polling consulta `/status` y solo llama a `/result` cuando `status = "completed"`?
- [ ] ¿La app maneja el caso `status = "failed"` mostrando un mensaje de error al usuario?
- [ ] ¿El polling se detiene cuando el job llega a un estado terminal (`completed` o `failed`)?
- [ ] ¿Existe un mecanismo de timeout o límite de intentos para el polling?

### Estado de la aplicación

- [ ] ¿El estado del job viene de la API (no se replica localmente como fuente de verdad)?
- [ ] ¿Después de un `202 Accepted`, la app espera la confirmación via polling antes de mostrar el resultado?
- [ ] ¿La app no asume que el job completó exitosamente solo porque recibió el `202`?

## Problemas comunes a detectar

- Enviar `user_id` en el body de una request (debe venir del JWT en el servidor)
- Hacer `POST` del audio a la API en lugar de `PUT` directo a Azure Blob
- No incluir `x-ms-blob-type: BlockBlob` en el upload a Blob
- Llamar a `/result` sin verificar que `status = "completed"` primero
- No manejar `TOKEN_EXPIRED` y dejar al usuario en un estado bloqueado
- Tener lógica de negocio en la app (ej: calcular si el audio es válido, determinar el idioma)
- Polling que no se detiene ante estados terminales (bucle infinito)
- Mostrar resultados parciales antes de que el job esté `completed`

## Criterios de aprobación

La implementación del componente móvil es correcta si:
1. No contiene lógica de negocio — todas las reglas las define la API
2. El upload va directamente a Azure Blob con los headers correctos
3. El JWT se envía en el header de autorización, nunca en el payload
4. El flujo de polling se detiene correctamente en estados terminales
5. La app maneja todos los errores del envelope `{ success, data, error }`
6. El estado del procesamiento viene siempre de la API — no hay estado local de jobs
