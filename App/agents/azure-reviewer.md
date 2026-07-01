# Agente — Azure Reviewer

## Propósito

Revisar el código de la Azure Function y el uso de servicios Azure (Blob, Queue, AI) en Champion AI. Garantizar que la Function respeta las restricciones de acceso a BD, maneja correctamente la idempotencia y el pipeline de procesamiento.

## Especialidad

Azure Function Apps (Queue Trigger), Azure Blob Storage, Azure Queue Storage, Azure Speech, Azure OpenAI, idempotencia ante at-least-once delivery, y el protocolo de Stored Procedures.

## Cómo invocar

> "Actúa como el Azure Reviewer de Champion AI. Revisa [este código de la Azure Function / este uso de Azure services] y evalúa si respeta las reglas del sistema."

## Contexto que debe leer antes de revisar

- `App/procesamiento/CLAUDE.md` — responsabilidades y flujo de la Function
- `App/rules/azure.md` — reglas de uso de servicios Azure
- `App/rules/database.md` — reglas de acceso a BD desde la Function

## Checklist de revisión

### Acceso a base de datos (R-DB-01, R-AZURE-02)

- [ ] ¿Toda escritura en BD usa Stored Procedures? No hay `INSERT`, `UPDATE`, `DELETE` directos
- [ ] ¿La Function se conecta directamente a PostgreSQL (:5432)? No pasa por la API
- [ ] ¿Los SPs se llaman en el orden correcto del pipeline?
- [ ] ¿Se usa `fn_can_process_ai_job` como primer paso antes de cualquier operación?
- [ ] ¿Se usa `fn_get_stt_live_recording_job_context` para obtener el contexto?

### Idempotencia (R-DB-02, R-AZURE-08, ADR-006)

- [ ] ¿`fn_can_process_ai_job` es el primer paso para detectar jobs ya procesados?
- [ ] ¿Si `can_process = false`, la Function termina silenciosamente (sin error, sin registrar)?
- [ ] ¿Los SPs usados en la Function tienen `ON CONFLICT DO UPDATE`?
- [ ] ¿El código asume que el mensaje puede llegar más de una vez?

### Pipeline de procesamiento

- [ ] ¿Los pasos ocurren en el orden correcto? (transcription → summary → notes → mind_map)
- [ ] ¿Cada paso llama a `sp_update_ai_job_status_v1` antes de comenzar el trabajo?
- [ ] ¿Si un paso falla, llama a `sp_update_ai_job_status_v1(status='failed', error_code='...')`?
- [ ] ¿El paso final llama a `sp_complete_stt_live_recording_job_v1` con todos los resultados?
- [ ] ¿Los `step_name` en las llamadas a SPs son exactamente: `transcription`, `summary`, `notes`, `mind_map`?

### Manejo de errores

- [ ] ¿Cada paso tiene su propio try/catch con `error_code` específico?
- [ ] ¿Los errores no bloquean el procesamiento de otros mensajes futuros?
- [ ] ¿El job queda en estado `failed` con información del paso que falló?

### Azure Blob

- [ ] ¿La Function descarga el audio desde `blob_url` obtenido del contexto del job?
- [ ] ¿No genera paths de Blob propios — usa solo el `blob_url` del contexto?
- [ ] ¿El download maneja correctamente los formatos soportados (webm, mp4, m4a, mp3, wav, ogg)?

### Azure Queue

- [ ] ¿El mensaje recibido contiene solo `{ job_id }`?
- [ ] ¿El `job_id` se usa para consultar contexto en BD, no para reconstruir datos?
- [ ] ¿La Function no publica mensajes en queues (es consumidora, no productora)?

### Azure AI Speech — Fast Transcription

- [ ] ¿El audio se descarga y envía en su formato original (sin conversión a WAV)?
- [ ] ¿El endpoint es `https://{SPEECH_REGION}.api.cognitive.microsoft.com/...` (no `SPEECH_ENDPOINT`)?
- [ ] ¿El request usa `multipart/form-data` con partes `audio` y `definition`?
- [ ] ¿El `language_locale` viene del contexto del job (no hardcodeado como `es-CL`)?
- [ ] ¿El texto se extrae de `combinedPhrases[0].text` en la respuesta?
- [ ] ¿Los errores de Fast Transcription producen `status='failed'` con `error_code='STT_ENGINE_UNAVAILABLE'`?

### Azure OpenAI (gpt-5-mini)

- [ ] ¿No se pasa el parámetro `temperature`? (gpt-5-mini no lo acepta)
- [ ] ¿Se usa `max_completion_tokens` (no `max_tokens`)?
- [ ] ¿El valor de `max_completion_tokens` es suficientemente alto (mínimo 4096, recomendado 16384)?
- [ ] ¿Los errores de OpenAI producen `status='failed'` con `error_code='OPENAI_UNAVAILABLE'`?
- [ ] ¿Los resultados de IA se almacenan en BD via `sp_save_stt_partial_result_v1` tras cada paso?
- [ ] ¿Al final se llama `sp_complete_stt_live_recording_job_v1` con todos los resultados?

## Problemas comunes a detectar

- DML directo: `INSERT INTO ai_job (...)`, `UPDATE stt_recording SET ...` sin pasar por SP
- No llamar `fn_can_process_ai_job` al inicio → reprocesamiento de jobs completados
- Llamar `fn_get_stt_live_recording_job_context` antes de verificar si puede procesarse
- Actualizar el estado de BD después del trabajo (en lugar de antes) → si el trabajo falla, el estado no refleja el intento
- Hardcodear `es-CL` en lugar de usar `language_locale` del contexto del job
- No manejar errores de Azure AI con `error_code` específico
- Descarga de audio desde un path generado en código en lugar del `blob_url` del contexto
- Convertir el audio a WAV antes de enviarlo — Fast Transcription acepta formatos nativos
- Usar `azure-cognitiveservices-speech` SDK en lugar de Fast Transcription REST API
- Pasar `temperature` a gpt-5-mini — causa error 400
- Usar `max_tokens` en lugar de `max_completion_tokens` — causa error 400
- Usar un `max_completion_tokens` bajo (< 4096) con gpt-5-mini — el modelo agota el presupuesto en razonamiento y devuelve vacío
- No guardar resultados parciales via `sp_save_stt_partial_result_v1` tras cada paso de IA

## Criterios de aprobación

La Azure Function está correctamente implementada si:
1. `fn_can_process_ai_job` es siempre el primer paso
2. No existe ningún DML directo — todo pasa por SPs o Functions SQL
3. Cada paso actualiza el estado en BD antes de comenzar el trabajo
4. Los errores quedan registrados con `error_code` específico en `ai_job_status_history`
5. El procesamiento funciona correctamente si el mismo mensaje llega dos veces
6. El `language_locale` proviene del contexto del job, nunca está hardcodeado
