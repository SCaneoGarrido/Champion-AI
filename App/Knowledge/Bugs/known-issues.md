# Problemas Conocidos y Vacíos de Información

tags: #bugs #pending #open-questions

---

## Contradicciones en las fuentes

### ISSUE-001: Tecnología de Azure Functions — Java vs Python

**Fuente 1 (README.md, sección Arquitectura):**
> "Algunos procesos específicos del sistema se ejecutan mediante Azure Function Apps desarrolladas en **Java**"

**Fuente 2 (README.md, sección Tecnologías):**
> Procesamiento Serverless: **Azure Function Apps / Python**

**Impacto:** No está claro el lenguaje de la Function en producción.

**Acción pendiente:** Verificar el código fuente en `App/ChampionAi.functionapp/` para determinar el lenguaje real.

---

## Endpoints pendientes de implementación

### ISSUE-002: GET /jobs/{job_id}/status — No implementado

**Documentación:** El contrato HTTP está definido en el documento de arquitectura.
**Estado en código:** Marcado explícitamente como "Pendiente de implementación en el router".

**Impacto:** El flujo de polling completo no puede ejecutarse de extremo a extremo desde la app.

Ver [[polling]].

### ISSUE-003: GET /jobs/{job_id}/result — No implementado

**Misma situación que ISSUE-002.**

---

## Features sin documentación técnica

### ISSUE-004: Text to Speech (TTS) — Sin contrato ni implementación documentada

El README menciona "Conversión de texto a voz" como capacidad del sistema.
No existe:
- Endpoint HTTP documentado
- Schema de BD para TTS
- Azure Function o queue para TTS
- Cualquier archivo de arquitectura sobre TTS

Ver [[text-to-speech]].

### ISSUE-005: Gestión de Archivos — Sin documentación técnica

El README menciona "Gestión de Archivos" (audios, textos, documentos).
No existe documentación de:
- Endpoints para CRUD de archivos
- Tabla de BD para gestión de archivos
- Diferencia entre "archivo" y "recording" en el modelo

---

## Vacíos de información en features implementadas

### ISSUE-006: Azure OpenAI — Detalles de configuración no documentados

La Azure Function usa Azure OpenAI para generar resumen, notas y mapa mental, pero no está documentado:
- Modelos utilizados (GPT-4, GPT-3.5-turbo, etc.)
- Prompts específicos para cada output
- Parámetros de temperatura, max_tokens, etc.
- Manejo de rate limits
- Idiomas soportados más allá de `es-CL`

### ISSUE-007: Estructura del JSON de notas y mapa mental no definida

Los campos `notes_json` y `mind_map_json` en `stt_recording_result` son JSONB sin schema definido.

**Preguntas abiertas:**
- ¿Qué estructura tiene `notes_json`? (lista de puntos, secciones, key-value)
- ¿Qué estructura tiene `mind_map_json`? (árbol, nodos y conexiones)
- ¿La app móvil valida esta estructura?

### ISSUE-008: JWT — Expiración y refresh no documentados

El endpoint de login devuelve un `access_token` pero no está documentado:
- Tiempo de expiración del token
- Si existe refresh token
- Qué hacer cuando el token expira (el error `TOKEN_EXPIRED` está documentado, pero no el flujo de renovación)

### ISSUE-009: upload_status — Transiciones no documentadas

La tabla `stt_recording` tiene `upload_status` con valores:
`initialized | uploading | uploaded | validated | failed | expired`

Pero no está documentado:
- Quién actualiza cada estado
- Cuándo transiciona de `initialized` a `uploaded`
- Qué proceso hace la validación (`validated`)
- Cuándo expira (`expired`)

### ISSUE-010: failed_attempts y locked_until en sec_user_password — Sin lógica documentada

La tabla tiene campos para bloqueo de cuenta, pero no está documentado:
- Cuántos intentos fallidos bloquean la cuenta
- Quién actualiza `failed_attempts` y `locked_until`
- Si el backend valida el bloqueo en el login

---

## Información faltante de infraestructura

### ISSUE-011: docker-compose.yml — No disponible como fuente

El README referencia `App/docker-compose.yml` pero no fue incluido en las fuentes analizadas.

### ISSUE-012: backup_db.sh — No disponible como fuente

El README describe el script en detalle pero no fue incluido en las fuentes analizadas.

---

## Resumen de estado

| Issue | Tipo | Impacto |
|---|---|---|
| ISSUE-001 | Contradicción | Alto — lenguaje desconocido |
| ISSUE-002 | Pendiente | Alto — endpoint crítico |
| ISSUE-003 | Pendiente | Alto — endpoint crítico |
| ISSUE-004 | Feature sin doc | Medio |
| ISSUE-005 | Feature sin doc | Medio |
| ISSUE-006 | Vacío de info | Medio |
| ISSUE-007 | Vacío de info | Medio |
| ISSUE-008 | Vacío de info | Bajo |
| ISSUE-009 | Vacío de info | Bajo |
| ISSUE-010 | Vacío de info | Bajo |
| ISSUE-011 | Fuente faltante | Informativo |
| ISSUE-012 | Fuente faltante | Informativo |
