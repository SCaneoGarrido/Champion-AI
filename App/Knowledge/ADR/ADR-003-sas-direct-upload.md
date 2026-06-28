# ADR-003: Upload de audio directo a Azure Blob via SAS URL

tags: #adr #architecture #blob #upload #sas

---

## Estado

Adoptado

## Contexto

Los usuarios necesitan subir archivos de audio que pueden pesar varios MB o decenas de MB.
La API necesita un mecanismo para recibir o coordinar estos uploads.

## Decisión

El audio se sube **directamente desde el cliente a Azure Blob Storage** usando una **SAS URL temporal**.

El flujo:
1. El cliente pide una SAS URL a la API (`POST /init`)
2. La API genera la SAS URL (con expiración de 3600s) y la devuelve
3. El cliente hace `PUT` del audio **directamente a Azure Blob** usando esa URL
4. El backend no interviene en este paso

## Razonamiento

### El binario nunca pasa por la API

Si el audio pasara por la API:
- La API consumiría mucho ancho de banda y memoria
- Los timeouts de la API limitarían el tamaño del archivo
- La API sería un cuello de botella en el proceso de upload
- Se necesitaría persistir el archivo temporalmente en el servidor

Con SAS URL directa:
- La API solo procesa texto (JSON) — nunca binarios
- Azure Blob escala el upload de forma nativa
- No hay límite de tamaño impuesto por la API
- El cliente puede usar la URL directamente con cualquier biblioteca HTTP

### Seguridad del SAS

- La SAS URL expira en 3600 segundos
- Solo permite la operación `PUT` sobre el blob específico
- El path incluye el `user_id` y `job_id` para aislar los archivos
- Una vez expirada, no puede usarse aunque sea interceptada

## Consecuencias

**Positivas:**
- La API es ligera: solo maneja JSON
- Azure Blob maneja el upload nativo con resumable uploads
- El ancho de banda de la API no escala con el número de uploads
- El cliente puede mostrar progreso del upload directamente

**Negativas / Compromisos:**
- El cliente debe conocer el protocolo de Azure Blob (`x-ms-blob-type: BlockBlob`)
- Si la SAS expira antes del upload, el proceso falla
- No hay validación del audio en el momento del upload (el backend no lo ve)
- El backend confía en que el `blob_url` del request de procesamiento existe y es válida

## Path en Azure Blob

```
audio/{user_uuid}/{job_id}/{job_id}.{formato}
```

---

## Referencias cruzadas

- [[azure-services]] — Azure Blob Storage
- [[upload-audio]] — Flujo donde se aplica
- [[backend-api]] — Endpoint `/init` que genera la SAS URL
