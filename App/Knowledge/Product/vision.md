# Visión del Producto

tags: #product #vision

---

## Qué es Champion AI

Champion AI es una plataforma tecnológica que integra múltiples capacidades de Inteligencia Artificial en un solo ecosistema. Su propósito central es ser un **hub de servicios de IA** accesible desde una aplicación móvil.

El problema que resuelve: el acceso a herramientas avanzadas de IA está fragmentado en múltiples servicios y requiere conocimiento técnico. Champion AI centraliza esas capacidades en una sola interfaz simple.

---

## Propuesta de valor

> Permitir a los usuarios procesar información (audio, texto, documentos) usando IA, de forma más rápida y eficiente, desde un dispositivo móvil, sin necesidad de conocimiento técnico.

---

## Capacidades del sistema

| Capacidad | Estado |
|---|---|
| Conversión de audio a texto (STT) | Implementada |
| Generación automática de resúmenes | Implementada (como salida del STT) |
| Generación de notas estructuradas | Implementada (como salida del STT) |
| Generación de mapas mentales | Implementada (como salida del STT) |
| Conversión de texto a voz (TTS) | Mencionada — sin documentación técnica |
| Gestión de archivos | Mencionada — sin documentación técnica |

Ver [[speech-to-text]], [[text-to-speech]], [[pending-features]].

---

## Usuario objetivo

La plataforma está pensada para usuarios que:

- Procesan contenido en formato de audio o texto regularmente
- Necesitan transformar ese contenido (transcribir, resumir, estructurar)
- Quieren acceder a esas capacidades desde el móvil

No existe documentación formal de personas o segmentos de usuario en las fuentes analizadas. Este punto está pendiente de definición.

---

## Pilares del proyecto

### Procesamiento Inteligente de Contenidos
El sistema transforma contenido entre distintos formatos usando servicios de Azure AI:
- Audio → Texto (transcripción)
- Texto largo → Resumen estructurado
- Texto → Notas y mapas conceptuales

### Experiencia de Usuario Simple
La app móvil ofrece tres pasos: cargar contenido → procesar → obtener resultado.
La complejidad técnica queda oculta detrás de la API y los servicios de Azure.

### Escalabilidad y Evolución
La arquitectura desacoplada (API + Queue + Function) permite agregar nuevas capacidades de IA sin afectar las existentes. Ver [[ADR-001-queue-based-processing]].

---

## Knowledge Pack — hacia dónde evoluciona el producto

Champion AI está diseñando la evolución de su resultado de procesamiento hacia un objeto de conocimiento unificado: el **Knowledge Pack**. La transcripción, el resumen, las notas y el mapa mental de hoy son el primer subconjunto de un objeto que crecerá con topics, capítulos, flashcards, quiz y búsqueda semántica — convirtiendo cada audio procesado en un objeto de estudio navegable, no solo en un resultado de transcripción.

Diseño funcional completo: `App/Docs/product/` (fuera de este vault — documenta el sistema objetivo, no el implementado). Ver especialmente `App/Docs/product/01-knowledge-pack-vision.md`.

---

## Equipo

| Integrante | Rol |
|---|---|
| Nicolás Bustamante | Desarrollador |
| Sebastián Caneo | Desarrollador |

**Metodología:** Scrum — iteraciones cortas con funcionalidades clave priorizadas.

---

## Estado actual del proyecto

El proyecto se encuentra en **fase de desarrollo activo**. La primera funcionalidad completa de extremo a extremo es el flujo STT live_recording. Ver [[stt-processing]] para el detalle completo.

---

## Tecnologías del ecosistema

| Capa | Tecnología |
|---|---|
| App móvil | React Native (Expo) |
| Backend | Node.js + Express.js |
| Procesamiento serverless | Azure Function Apps |
| Base de datos | PostgreSQL 17.10 (Docker) |
| Almacenamiento | Azure Blob Storage |
| Cola de mensajes | Azure Queue Storage |
| IA | Microsoft Azure AI (Speech, OpenAI) |

Ver [[overview]] para la arquitectura completa.
