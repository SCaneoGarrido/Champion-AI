# ADR-001: Procesamiento basado en Azure Queue + Azure Function

tags: #adr #architecture #queue #async

---

## Estado

Adoptado

## Contexto

Champion AI necesita procesar audio con múltiples servicios de IA (transcripción, resumen, notas, mapa mental). Este procesamiento puede tardar decenas de segundos o minutos dependiendo de la duración del audio.

Si la API procesara de forma síncrona:
- Las conexiones HTTP quedarían abiertas durante todo el procesamiento
- Un error de red del cliente cancelaría el trabajo
- La API no podría escalar de forma independiente al procesamiento

## Decisión

El procesamiento de IA se delega completamente a una **Azure Function con Queue Trigger**.

El flujo es:
1. La API acepta el job y responde `202 Accepted` inmediatamente
2. La API publica `{ "job_id" }` en una Azure Queue
3. La Azure Function consume el mensaje y ejecuta todo el procesamiento
4. El cliente hace polling para conocer el resultado

## Consecuencias

**Positivas:**
- La API nunca bloquea esperando resultados de IA
- El procesamiento escala automáticamente (Azure Functions escala por carga de queue)
- Un error de red del cliente no afecta el procesamiento en curso
- Trazabilidad completa en PostgreSQL: cada paso queda registrado
- Fácil de testear sin UI (Postman puede ejecutar el flujo completo)
- La arquitectura está preparada para múltiples tipos de jobs

**Negativas / Compromisos:**
- El cliente debe implementar polling (mayor complejidad en el frontend)
- No existe push notification ni WebSocket: el cliente no sabe cuándo está listo sin preguntar
- At-least-once delivery requiere idempotencia en el procesamiento (ver [[ADR-006-idempotent-stored-procedures]])
- La latencia mínima observable aumenta (tiempo en queue + inicio de Function)

## Alternativas consideradas

- **Procesamiento síncrono en la API**: Descartado por los problemas de timeout y acoplamiento.
- **WebSockets o Server-Sent Events**: No implementado. Podría ser una mejora futura para eliminar el polling.

---

## Referencias cruzadas

- [[overview]] — Diagrama donde se ve este patrón
- [[azure-function]] — El componente que consume la queue
- [[azure-services]] — Azure Queue Storage
- [[upload-audio]] — Cómo la API publica en la queue
- [[stt-processing]] — El procesamiento que ocurre en la Function
- [[polling]] — La solución del cliente al procesamiento async
