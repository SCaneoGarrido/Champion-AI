Implementación: Knowledge Workspace / Document Reader (React Native)
Objetivo

Implementar una pantalla de lectura de documentos llamada Knowledge Workspace, optimizada para móvil (iOS y Android), con un diseño moderno tipo Notion + Kindle + ChatGPT.

La pantalla debe renderizar un documento dividido en secciones enriquecidas (texto, citas, imágenes) y ofrecer acciones rápidas mediante una barra flotante lateral.

La implementación debe ser completamente reusable, componentizada y preparada para recibir datos dinámicamente desde una API.

Stack esperado
React Native
Expo (si el proyecto utiliza Expo)
TypeScript
React Navigation
React Native Reanimated (para pequeñas animaciones)
React Native Gesture Handler
FlashList (Shopify) o FlatList
react-native-safe-area-context
Estructura de componentes

Construir la pantalla utilizando la siguiente jerarquía.

KnowledgeWorkspaceScreen

│
├── Header
│     ├── BackButton
│     ├── WorkspaceTitle
│     └── UserAvatar
│
├── DocumentInfo
│     ├── DocumentIcon
│     └── DocumentTitle
│
├── ReaderCard
│      ├── SectionBadge
│      ├── SectionTitle
│      ├── RichText
│      ├── AIQuoteCard
│      ├── RichText
│      ├── ImageCard
│      └── FooterPagination
│
├── FloatingToolbar
│      ├── SummaryButton
│      ├── NotesButton
│      ├── VoiceButton
│      └── BlocksButton
│
└── BottomToolbar
       ├── ExportButton
       ├── ShareButton
       ├── DeleteButton
       └── FavoriteButton

Todo debe ser independiente y reutilizable.

Layout general

La pantalla ocupa toda la altura.

Fondo:

#F7F4F2

La lectura se encuentra dentro de una tarjeta blanca con esquinas redondeadas.

Padding horizontal:

20

Safe Area obligatoria.

Header

Altura aproximada:

72

Distribución:

←          Champion AI            Avatar
Back Button

Icono:

Arrow Left

Área táctil:

44x44
Título
Champion AI

Color:

#8B6A00

FontWeight

700
Avatar

Circular

36 px

Color amarillo dorado.

Iniciales:

SC
Información del documento

Debajo del header.

Contiene:

Icono documento

Texto superior

DOCUMENT WORKSPACE

uppercase

gris.

Debajo

Teoría_Cuántica_V2.pdf

Peso 700.

Reader Card

Elemento principal.

Color:

#FFFFFF

Border Radius

28

Padding interno

24

Debe ocupar el máximo alto disponible.

Debe permitir scroll vertical únicamente del contenido.

Sección

En la parte superior:

Badge circular crema.

Texto pequeño:

SECTION 1.4

uppercase

tracking amplio.

Debajo

Título

Dualidad Onda-Partícula

Font

22

Bold.

Texto enriquecido

El primer párrafo posee una Drop Cap.

Ejemplo:

L

de aproximadamente

42 px

alineada al inicio.

El resto del párrafo debe fluir alrededor.

No usar una imagen.

Implementar con Text y estilos.

Color texto:

#444

lineHeight

30

fontSize

18
AI Quote Card

Implementar un componente independiente.

Diseño:

Caja gris claro.

#F4F2F1

Border radius:

18

Padding:

20

Línea vertical izquierda dorada.

4 px

Color:

#B98A00

Contenido:

Texto en cursiva.

Abajo:

— Resumen Generado por Champion AI

En color dorado.

Debe aceptar:

quote
author

como props.

Párrafos

Después del quote continúa texto normal.

Separación:

24

entre bloques.

Image Card

Imagen grande.

Border Radius

18

Shadow suave.

Aspect ratio aproximado

16:9

Debajo de la imagen aparece un caption.

Ejemplo:

Avenir Next

centrado.

Color gris.

Footer de paginación

Ubicado dentro del ReaderCard.

Distribución:

<        1-5        >

Botones laterales:

44x44

Texto central:

1-5

Bold.

Preparar callbacks:

onPrevious()

onNext()
Floating Toolbar

Elemento flotante.

Posición:

Derecha.

Centrado verticalmente.

Separado 16 px del borde.

Debe usar:

position:absolute

Diseño

Contenedor blanco.

Border radius:

24

Padding vertical:

12

Shadow.

Dentro:

4 botones circulares.

Espaciado:

16 px.

Botones

Todos de

52x52

Iconos:

Resumen

Editar

Audio

Bloques

El primer botón debe aparecer activo.

Activo:

background #C69200
icon white

Inactivo:

background #F2F2F2
icon #777

Agregar animación de escala utilizando Reanimated.

Bottom Toolbar

Pegada al fondo.

Dentro del Safe Area.

Color:

#ECE7E2

Border Radius superior:

28

Altura:

82

Contenido:

Izquierda

Exportar
Compartir

Derecha

Dos iconos circulares.

Delete

Favorite

Separación uniforme.

Tipografía

Usar:

Inter

o

SF Pro

según disponibilidad.

Escala:

Caption 12

Small 14

Body 17

Large Body 18

Title 22

Display 32
Paleta

Background

#F7F4F2

Card

#FFFFFF

Primary Gold

#B98A00

Dark Gold

#8B6A00

Text

#2E2E2E

Secondary Text

#6B6B6B

Border

#ECECEC

Soft Background

#F3F2F1
Modelo de datos

La pantalla debe consumir un objeto con la siguiente estructura:

interface DocumentSection {
  id: string;
  number: string;
  title: string;
  paragraphs: Paragraph[];
}

interface Paragraph {
  type:
    | "text"
    | "quote"
    | "image";
  content?: string;
  quote?: string;
  author?: string;
  image?: string;
  caption?: string;
}

interface Document {
  id: string;
  title: string;
  fileName: string;
  sections: DocumentSection[];
}

No hardcodear textos.

Todo debe renderizarse desde este modelo.

Accesibilidad

Implementar:

hitSlop en todos los iconos
accessibilityLabel
accessibilityRole
soporte para Dynamic Type
soporte para VoiceOver/TalkBack
Animaciones

Utilizar Reanimated.

Agregar:

Fade In del ReaderCard
Scale al presionar botones
Elevación del botón activo del toolbar
Transición suave entre páginas
Scroll con inercia nativa

Evitar animaciones excesivas.

Rendimiento
Componentes memoizados (React.memo).
Callbacks con useCallback.
Listas virtualizadas (FlashList o FlatList) para documentos largos.
Carga diferida de imágenes.
Evitar renders innecesarios.
Preparar la pantalla para documentos con cientos de secciones.
Resultado esperado

La implementación debe ser visualmente muy cercana al diseño de referencia, con énfasis en:

estética premium y minimalista;
alta reutilización de componentes;
arquitectura escalable;
separación clara entre presentación, lógica y datos;
facilidad para integrar contenido dinámico proveniente de una API o CMS.