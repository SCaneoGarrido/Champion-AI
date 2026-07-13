# Project Vision — Champion AI

tags: #product #vision #knowledge-workspace

> Reemplaza a `Product/vision.md` (retirado). Última actualización: 2026-07-13.

---

## Qué es Champion AI ahora

Champion AI deja de definirse como una app de transcripción de audio. Es una **plataforma de aprendizaje asistida por Inteligencia Artificial**, organizada alrededor de un concepto central: el **Knowledge Workspace**.

El problema que resuelve no cambió en su raíz — el acceso a IA avanzada está fragmentado y requiere conocimiento técnico — pero el destino final del valor generado sí cambió: ya no es "un resultado de transcripción para leer una vez", es **conocimiento estructurado, navegable y reutilizable para estudiar**.

---

## Cadena de valor

```
Champion AI
     ↓
Knowledge Packs
     ↓
Knowledge Workspace
     ↓
Herramientas Inteligentes de Aprendizaje
```

### Champion AI
El hub que orquesta la ingesta de contenido y los servicios de IA de Azure (hoy: Speech-to-Text; a futuro: TTS narrado, otros orígenes de contenido).

### Knowledge Pack
La unidad de conocimiento que produce el pipeline de IA a partir de una fuente (hoy, una grabación de audio): transcripción, resumen, notas estructuradas y mapa mental. Es el equivalente evolucionado de lo que hoy es un `stt_recording` + `stt_recording_result`. Un Knowledge Pack es la materia prima; no es la experiencia de usuario final.

### Knowledge Workspace
**La experiencia principal del producto.** Deja de existir una "vista Markdown" como interfaz central — todo resultado generado por IA se consume desde el Workspace: reproductor de audio, resumen, notas y mapa mental integrados en una sola superficie, pensada para mobile-first y para crecer (topics, timeline, búsqueda, chat, flashcards, quizzes) sin rehacer la base cada vez.

Ver [[ADR-008-knowledge-workspace]] y la arquitectura en [[overview]].

### Herramientas Inteligentes de Aprendizaje
Las capacidades que se construyen **sobre** el Workspace una vez que existe una superficie estable: estudio activo (flashcards, quiz, chat sobre la clase), enriquecimiento semántico (keywords, entidades, relaciones), narración inteligente y, eventualmente, una plataforma de conocimiento con grafo y búsqueda semántica entre Knowledge Packs.

---

## Qué queda explícitamente fuera de alcance

| Capacidad | Estado anterior | Estado actual |
|---|---|---|
| Gestión de Archivos genérica (subir audio/texto/documentos como archivos sueltos) | Mencionada en README/vision.md sin documentación técnica | **Retirada del roadmap activo.** El concepto se reemplaza por Knowledge Packs: no se gestionan "archivos", se generan y consumen unidades de conocimiento. Ver nota histórica en [[known-issues]]. |
| Vista Markdown como interfaz principal | Interfaz de facto tras el pipeline STT (y un intento de Presentation Layer con Markdown/LaTeX/Mermaid, revertido por completo) | Reemplazada por el Knowledge Workspace desde V1. |

---

## Usuario objetivo

Champion AI está pensado para personas que **aprenden a partir de contenido grabado**: estudiantes que graban clases, profesionales que graban charlas o reuniones formativas, y en general cualquier usuario que necesita convertir audio en material de estudio estructurado y repasable — no solo en un texto plano para leer una vez.

No existe todavía documentación formal de personas/segmentos (mismo vacío que en la visión anterior). Ver [[PRODUCT_STRATEGY]] para el razonamiento de priorización mientras ese trabajo de research no se hace.

---

## Pilares del producto

### 1. El Workspace es la experiencia, no el pipeline
El pipeline de IA (transcripción → resumen → notas → mapa mental, y lo que se sume después) es implementación. Lo que el usuario percibe como el producto es el Knowledge Workspace.

### 2. Evolución por capas, sin romper lo anterior
Cada versión (V1–V5, ver [[ROADMAP]]) agrega una capa de valor sobre las anteriores. Nada de una versión reemplaza a la anterior — la extiende. Ver [[PRODUCT_STRATEGY]].

### 3. Separación de responsabilidades técnica sin cambios
La evolución de producto no cambia los invariantes de arquitectura: la API sigue orquestando sin procesar IA, la Azure Function sigue procesando sin coordinar, PostgreSQL sigue siendo la única fuente de verdad. Ver `CLAUDE.md` raíz.

### 4. Aprender de los intentos fallidos
El primer intento de superficie de presentación (Markdown/LaTeX/Mermaid) se implementó y se revirtió por completo por bugs visuales persistentes en mobile. El Knowledge Workspace no es ese mismo intento repetido — es una superficie nueva, diseñada desde cero, con ese aprendizaje incorporado. Ver riesgos en `EPICS.md` (EPIC V1) y [[known-issues]].

---

## Equipo

| Integrante | Rol |
|---|---|
| Nicolás Bustamante | Desarrollador |
| Sebastián Caneo | Desarrollador |

**Metodología:** Scrum — iteraciones cortas con funcionalidades clave priorizadas. Ver [[SPRINT_PLANNING]].

---

## Estado actual del proyecto

El proyecto está en **fase de desarrollo activo**. La base técnica (pipeline STT completo, auth, polling) está implementada y es la fundación sobre la que se construye el Knowledge Workspace (V1). Ver [[ROADMAP]] para el detalle de versiones y [[EPICS]] para el desglose de trabajo.

---

## Referencias

- [[PRODUCT_STRATEGY]] — por qué este orden de versiones, qué reemplaza a la vista Markdown y con qué criterio se mide el éxito
- [[ROADMAP]] — versiones V1–V5
- [[EPICS]] — desglose de cada versión en EPIC accionable
- [[overview]] — arquitectura técnica del sistema
- [[known-issues]] — vacíos y decisiones de alcance (incluye retiro de Gestión de Archivos)
