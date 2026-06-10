# 🤖 Champion AI

<p align="center">
  <img src="./App/Docs/LogoApp/Logo Champion AI.png" alt="Champion AI Icon" width="720"/>
</p>

# 📋 Descripción

**Champion AI** es una plataforma tecnológica orientada a integrar múltiples capacidades de **Inteligencia Artificial** en un solo ecosistema. El proyecto busca construir un **hub de servicios de IA** que permita a los usuarios utilizar distintas herramientas basadas en modelos inteligentes para procesar, transformar y analizar información.

La plataforma está pensada principalmente como una **aplicación móvil**, permitiendo que los usuarios interactúen con distintos servicios de IA desde un único lugar.

Entre las capacidades que la plataforma busca integrar se encuentran:

- Conversión de **texto a voz**
- Conversión de **voz a texto**
- **Generación automática de resúmenes**
- Procesamiento de contenido mediante **modelos de lenguaje**
- Integración con servicios de **voz, visión y búsqueda**

Estas funcionalidades se implementan utilizando **servicios de inteligencia artificial nativos de Microsoft Azure**, permitiendo construir una plataforma escalable y extensible.

---

# 👁️ Visión del Proyecto

Champion AI busca facilitar el acceso a herramientas de inteligencia artificial que permitan a los usuarios procesar información de manera más rápida y eficiente.

El objetivo es integrar distintas tecnologías de IA dentro de una sola plataforma que permita transformar contenido entre distintos formatos (texto, audio, conocimiento estructurado) y apoyar tareas que normalmente requieren tiempo o esfuerzo manual.

La plataforma está diseñada para evolucionar progresivamente, permitiendo incorporar nuevas capacidades de inteligencia artificial a medida que el proyecto crece.

---

# 🏗️ Pilares del Proyecto

## 🧠 Procesamiento Inteligente de Contenidos

El sistema utiliza servicios de inteligencia artificial para transformar contenido entre distintos formatos, permitiendo automatizar tareas como:

- Transcripción de audio
- Conversión de texto a voz
- Análisis de contenido
- Generación de resúmenes

---

## 📱 Experiencia de Usuario Simple

La aplicación móvil busca ofrecer una experiencia clara e intuitiva que permita a los usuarios:

1. Cargar contenido
2. Procesarlo mediante servicios de IA
3. Visualizar o utilizar los resultados generados

El objetivo es reducir la complejidad técnica y facilitar el acceso a herramientas avanzadas de inteligencia artificial.

---

## ⚡ Desarrollo Ágil

El proyecto se desarrolla utilizando **metodología Scrum**, con iteraciones cortas que permiten avanzar progresivamente en el desarrollo de funcionalidades clave del sistema.

---

## 📈 Escalabilidad y Evolución

Champion AI se diseña con una arquitectura basada en **APIs y servicios desacoplados**, lo que permite integrar nuevas tecnologías de inteligencia artificial sin afectar el funcionamiento actual del sistema.

Esto permite que la plataforma evolucione hacia un ecosistema más amplio de herramientas basadas en IA.

---

# ⚙️ Funcionalidades Principales

Las funcionalidades actuales del sistema se organizan en las siguientes áreas principales.

## 🎤 Conversión de Texto a Audio (Text to Speech)

Permite ingresar texto o contenido escrito para generar audio reproducible mediante servicios de síntesis de voz.

Esto permite consumir contenido en formato auditivo desde la aplicación móvil.

---

## 📝 Conversión de Audio a Texto (Speech to Text)

Permite procesar audios o grabaciones para generar automáticamente una transcripción editable.

Esto facilita la transformación de contenido hablado en información escrita.

---

## 📋 Generación Automática de Resúmenes

Utiliza modelos de inteligencia artificial para analizar textos extensos y generar resúmenes estructurados que permitan comprender rápidamente el contenido.

---

## 📁 Gestión de Archivos

La plataforma permite gestionar archivos que serán utilizados para procesamiento mediante IA, como:

- Audios
- Textos
- Documentos

Estos archivos pueden ser utilizados posteriormente para ejecutar distintas funcionalidades del sistema.

---

# 🏛️ Arquitectura del Sistema

Champion AI está diseñado como un sistema basado en **servicios y APIs**, donde distintos componentes trabajan de forma desacoplada para integrar capacidades de inteligencia artificial.

La arquitectura general considera los siguientes componentes principales:

### 📱 Aplicación móvil

Aplicación desarrollada en **React Native**, que actúa como la interfaz principal para los usuarios y permite interactuar con las funcionalidades del sistema.

---

### 🔧 API Backend

Backend desarrollado en **Node.js utilizando Express.js**.

Este servicio se encarga de:

- Gestionar solicitudes provenientes de la aplicación móvil
- Orquestar el uso de servicios de inteligencia artificial
- Gestionar archivos y procesamiento
- Centralizar la lógica de negocio de la plataforma

---

### ☁️ Azure Function Apps

Algunos procesos específicos del sistema se ejecutan mediante **Azure Function Apps desarrolladas en Java**, permitiendo ejecutar tareas de forma desacoplada y escalable.

---

### 🤖 Servicios de Inteligencia Artificial

El sistema se integra con distintos **servicios de inteligencia artificial de Microsoft Azure**, incluyendo capacidades relacionadas con:

- procesamiento de voz
- modelos de lenguaje
- análisis de texto
- visión computacional
- búsqueda

---

# 💻 Tecnologías Utilizadas

## 📱 Aplicación móvil

- **React Native**

---

## 🔧 Backend

- **Node.js**
- **Express.js**

---

## ☁️ Procesamiento Serverless

- **Azure Function Apps**
- **Python**

---

## 🤖 Inteligencia Artificial

Servicios de **Microsoft Azure AI**, utilizados para el procesamiento de contenido y ejecución de funcionalidades inteligentes dentro de la plataforma.

---

## 📁 Estructura del Repositorio

```
Champion-AI
│
├── App/
│   ├── Mobile/                        # App móvil (Expo + React Native)
│   ├── API/                           # Backend Node.js + Express
│   ├── ChampionAi.functionapp/        # Azure Functions (Python)
│   ├── docker/
│   │   ├── api/Dockerfile             # Imagen Docker de la API
│   │   └── postgres/init.sql          # Schema completo de la BD (versionado)
│   ├── docker-compose.yml             # Configuración del contenedor PostgreSQL
│   ├── backup_db.sh                   # Script de backup y sincronización de la BD
│   └── Docs/                          # Documentación y contratos
│
└── README.md
```

---

# 🚀 Cómo iniciar el proyecto

## Requisitos previos

- **Node.js** 18 o superior (recomendado LTS).  
  - Descarga: [https://nodejs.org](https://nodejs.org)  
  - Verificar: `node -v` y `npm -v` en la terminal.
- **npm** (incluido con Node.js).
- **Expo Go** en el móvil (opcional, para probar la app): [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779).
- Para la **API**: variables de entorno configuradas en `App/API` (ver `.env.example` o documentación del backend). La API usa base de datos (MongoDB u otra según configuración).

## Pasos para levantar todo

### 1. Clonar e instalar dependencias

```bash
# Clonar el repositorio (si aún no lo tienes)
git clone <url-del-repositorio>
cd Champion-AI
```

### 2. Levantar la base de datos (Docker)

La base de datos PostgreSQL se comparte a través del repositorio usando Docker. El schema completo se encuentra versionado en `App/docker/postgres/init.sql` y se inicializa automáticamente al levantar el contenedor por primera vez.

**Requisito:** tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

```bash
cd App

# Levantar el contenedor en segundo plano
docker compose up -d

# Si necesitas recrear la BD desde cero (aplica el init.sql actualizado)
docker compose down -v && docker compose up -d
```

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Levanta el contenedor de PostgreSQL en segundo plano. Si el volumen ya existe, mantiene los datos actuales. |
| `docker compose down -v` | Detiene el contenedor **y elimina el volumen** (borra todos los datos). Úsalo cuando quieras partir desde cero con el schema del repositorio. |

- La BD queda disponible en **localhost:5432**.
- Usuario: `champion_db_user` / Contraseña: la definida en tu `.env`.
- El schema y los datos de prueba se cargan solos en el primer arranque.

---

### 3. Levantar el backend (API Node)

```bash
cd App/API
npm install
npm start
```

- La API queda en **http://localhost:5051** (o el puerto definido en `.env`).
- Debe estar en ejecución para que la app móvil pueda hacer login y registro.

### 3. Levantar la app móvil (Expo)

En **otra terminal**:

```bash
cd App/Mobile
npm install
npx expo start
```

- Se mostrará un **código QR** en la terminal (o en el navegador).
- Para abrir en el **móvil**: instala **Expo Go**, escanea el QR y asegúrate de que el móvil y el PC estén en la **misma red Wi‑Fi**.
- Para **emulador**: en la terminal de Expo pulsa `a` (Android) o `i` (iOS, solo macOS).

### 4. Configurar la URL de la API en el móvil (si usas dispositivo físico)

En el móvil, `localhost` apunta al propio teléfono. Para que la app hable con tu API en el PC:

1. En el PC, ejecuta `ipconfig` (Windows) o `ifconfig` (Mac/Linux) y anota la **IPv4** de tu red (ej. `192.168.1.10`).
2. En la raíz de `App/Mobile` crea un archivo **`.env`** con:
   ```env
   EXPO_PUBLIC_API_URL=http://TU_IP:5051
   ```
   (reemplaza `TU_IP` por tu IPv4).
3. Reinicia Expo (`Ctrl+C` y luego `npx expo start`) y vuelve a escanear el QR.

Más detalles en **App/Mobile/README.md**.

---

# 🗄️ Backup y sincronización de la base de datos

El script `App/backup_db.sh` permite exportar el estado actual de la BD y actualizar el `init.sql` del repositorio, de manera que todos los miembros del equipo puedan obtener la última versión.

**Requisito:** el contenedor `postgres_db` debe estar corriendo (`docker compose up -d`).

```bash
cd App
bash backup_db.sh
```

**Lo que hace el script:**

1. Verifica que el contenedor esté activo.
2. Genera un dump completo de la BD y lo guarda en `App/backups/` con timestamp (ej. `champion_db_20260603_120000.sql`).
3. Copia ese dump a `docker/postgres/init.sql`, actualizando el schema versionado en el repositorio.
4. Elimina backups antiguos, conservando solo los últimos 10.

**Para compartir los cambios con el equipo:**

```bash
git add App/docker/postgres/init.sql
git commit -m "chore: update db schema"
git push
```

**Para que otro integrante aplique la nueva versión:**

```bash
# En la máquina del compañero, desde App/
docker compose down -v && docker compose up -d
```

> Los archivos de `App/backups/` están en `.gitignore` y no se suben al repositorio.

---

# 🚧 Estado del Proyecto

El proyecto se encuentra actualmente en **fase de desarrollo**, donde se están implementando los primeros componentes del backend y las integraciones iniciales con servicios de inteligencia artificial.

Las primeras funcionalidades priorizadas corresponden a:

- Conversión de texto a voz
- Conversión de voz a texto
- Generación automática de resúmenes

Estas capacidades servirán como base para la evolución futura de la plataforma hacia un hub más amplio de herramientas basadas en inteligencia artificial.

---

# 👥 Equipo

Proyecto desarrollado por:

- Nicolás Bustamante  
- Sebastián Caneo
