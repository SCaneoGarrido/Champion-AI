# Problemas Conocidos y Vacíos de Información

tags: #bugs #pending #open-questions

---

## Issues resueltos

### ~~ISSUE-001: Tecnología de Azure Functions — Java vs Python~~  ✅ CERRADO

**Resolución:** La Azure Function es **Python**. El README mencionaba "Java" incorrectamente en la sección de arquitectura. Texto corregido en README y ARCHITECTURE.md. La implementación usa Python con Azure Durable Functions (Orchestrator + Activities).

---

### ~~ISSUE-002: GET /jobs/{job_id}/status — No implementado~~  ✅ CERRADO

**Resolución:** Endpoint implementado. Consulta `vw_ai_job_current_status`. Devuelve `status`, `current_step` y `last_error_code`.

---

### ~~ISSUE-003: GET /jobs/{job_id}/result — No implementado~~  ✅ CERRADO

**Resolución:** Endpoint implementado. Consulta `vw_stt_recording_result`. Devuelve transcripción, resumen, notas y mapa mental.

---

### ~~ISSUE-006: Azure OpenAI — Detalles de configuración~~  ✅ PARCIALMENTE CERRADO

**Resolución:**
- Modelo: **gpt-5-mini** (modelo de razonamiento)
- Temperatura: no acepta override — solo soporta el valor por defecto (1)
- Parámetro de tokens: `max_completion_tokens` (no `max_tokens`, renombrado en modelos de nueva generación)
- Límite configurado: `max_completion_tokens: 16384` — necesario porque los tokens de razonamiento interno cuentan contra el presupuesto
- Prompts: en `App/procesamiento/prompts/` — `system.md`, `summary.md`, `notes.md`, `notes_json.md`, `mind_map.md`

**Pendiente:** documentar rate limits de la región actual.

---

### ~~ISSUE-007: Estructura del JSON de notas y mapa mental~~  ✅ CERRADO

**Resolución:** Los schemas están definidos en los prompts.

**`notes_json` schema:**
```json
{
  "title": "",
  "overview": "",
  "concepts": [
    { "name": "", "definition": "", "explanation": "", "context": "", "observations": "" }
  ],
  "examples": [],
  "important_details": [],
  "key_takeaways": []
}
```

**`mind_map_json` schema:**
```json
{
  "title": "",
  "nodes": [
    {
      "name": "",
      "children": [
        { "name": "", "children": [] }
      ]
    }
  ]
}
```

Profundidad máxima del árbol: 4 niveles.

---

## Issues retirados del roadmap activo

### ~~ISSUE-005: Gestión de Archivos — Sin documentación técnica~~ ⛔ RETIRADO (2026-07-13)

El README y `vision.md` (retirado) mencionaban "Gestión de Archivos" (subir audios, textos y documentos como archivos sueltos) como capacidad del sistema.

**Resolución:** con la reorganización del roadmap hacia el Knowledge Workspace, esta capacidad genérica **se retira del roadmap activo**. No forma parte de ninguna versión V1–V5 (ver [[ROADMAP]]). El concepto se reemplaza por **Knowledge Packs**: el sistema no gestiona archivos sueltos, genera y organiza unidades de conocimiento a partir del contenido procesado. Si en el futuro se requiere gestión de archivos genérica, debe evaluarse como una versión nueva fuera de V1–V5, no reincorporarse silenciosamente.

Ver [[PROJECT_VISION]].

---

## Issues activos

### ISSUE-004: Text to Speech (TTS) — Reencuadrado bajo EPIC V4

El README mencionaba "Conversión de texto a voz" como capacidad genérica del sistema, sin contrato ni implementación.

**Estado actual:** TTS deja de ser una feature genérica sin alcance definido. Vive ahora, con alcance acotado, dentro de **EPIC V4 — Intelligent Audio Learning** (ver [[EPICS]]): narración de `summary_text` y `notes_text` ya generados por el Workspace, con selección de voz, SSML y caché — no conversión de texto arbitrario a voz.

Sigue pendiente de implementación. Ver [[text-to-speech]] y [[EPICS#EPIC V4 — Intelligent Audio Learning]].

---

### ISSUE-012: Riesgo de regresión visual al reintroducir Mermaid en el Knowledge Workspace

La Presentation Layer (Markdown, LaTeX, Mermaid mind maps) se implementó de punta a punta y se **revirtió por completo** (código + BD) el 2026-07-11 por bugs visuales persistentes en mobile.

El nuevo roadmap (EPIC V1 — Knowledge Workspace, ver [[EPICS]]) reintroduce el renderizado Mermaid del mapa mental, esta vez como un componente encapsulado dentro del Workspace en lugar de una vista Markdown standalone. El riesgo de repetir los mismos bugs visuales sigue vigente si el componente no se prueba de forma aislada antes de integrarlo.

**Mitigación documentada:** ver criterios de aceptación y riesgos del EPIC V1 en [[EPICS]], y [[ADR-008-knowledge-workspace]].

---

### ISSUE-008: JWT — Expiración y refresh no documentados

El endpoint de login devuelve un `access_token` pero no está documentado:
- Tiempo de expiración del token
- Si existe refresh token
- Qué hacer cuando el token expira (el error `TOKEN_EXPIRED` está en el catálogo de errores, pero no el flujo de renovación)

---

### ISSUE-009: upload_status — Transiciones no documentadas

La tabla `stt_recording` tiene `upload_status` con valores:
`initialized | uploading | uploaded | validated | failed | expired`

No está documentado:
- Quién actualiza cada estado
- Cuándo transiciona de `initialized` a `uploaded`
- Qué proceso hace la validación (`validated`)
- Cuándo expira (`expired`)

---

### ISSUE-010: failed_attempts y locked_until en sec_user_password — Sin lógica documentada

La tabla tiene campos para bloqueo de cuenta, pero no está documentado:
- Cuántos intentos fallidos bloquean la cuenta
- Quién actualiza `failed_attempts` y `locked_until`
- Si el backend valida el bloqueo en el login

---

### ISSUE-011: Rate limits de Fast Transcription — No documentados

No está documentado el límite de requests por minuto o por hora de la API de Fast Transcription en la región configurada. Relevante para entornos con alta concurrencia.

---

## Resumen de estado

| Issue | Tipo | Estado | Impacto |
|---|---|---|---|
| ISSUE-001 | Contradicción | ✅ Resuelto | — |
| ISSUE-002 | Pendiente de impl | ✅ Resuelto | — |
| ISSUE-003 | Pendiente de impl | ✅ Resuelto | — |
| ISSUE-004 | Feature reencuadrada (EPIC V4) | Activo — roadmapeado | Medio |
| ISSUE-005 | Feature retirada del roadmap | ⛔ Retirado | — |
| ISSUE-006 | Vacío de info | ✅ Parcialmente resuelto | — |
| ISSUE-007 | Vacío de info | ✅ Resuelto | — |
| ISSUE-008 | Vacío de info | Activo | Bajo |
| ISSUE-009 | Vacío de info | Activo | Bajo |
| ISSUE-010 | Vacío de info | Activo | Bajo |
| ISSUE-011 | Vacío de info | Activo | Informativo |
| ISSUE-012 | Riesgo de regresión (Mermaid en Workspace) | Activo | Alto |
