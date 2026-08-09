# Champion AI – App móvil (Expo + React Native)

App móvil con **Expo**, **React**, **React Native** y conexión al backend **Node** (Express). Diseñada para ejecutarse en **Expo Go** o en emulador.

---

## Requisitos

- **Node.js 18 o superior** (recomendado LTS).
  - Descarga: [https://nodejs.org](https://nodejs.org)
  - Comprobar en terminal: `node -v` y `npm -v`
- **npm** (viene con Node.js).
- **Expo Go** en el móvil (para probar en dispositivo real):
  - [Android – Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS – App Store](https://apps.apple.com/app/expo-go/id982107779)

---

## Instalación

Desde la raíz del repositorio:

```bash
cd App/Mobile
npm install
```

---

## Cómo iniciar la app

### 1. Levantar la API (backend)

La app necesita la API en ejecución para login y registro. En una terminal:

```bash
cd App/API
npm install
npm start
```

La API debe quedar en **http://localhost:5051** (o el puerto definido en su `.env`).

### 2. Levantar Expo

En **otra terminal**:

```bash
cd App/Mobile
npm start
```

o:

```bash
npx expo start
```

### 3. Abrir en el dispositivo o emulador

- **Móvil con Expo Go:** escanear el código QR que aparece en la terminal. Móvil y PC deben estar en la **misma red Wi‑Fi**.
- **Emulador Android:** en la terminal de Expo pulsar `a`.
- **Simulador iOS (solo macOS):** pulsar `i`.

### 4. URL de la API cuando usas el móvil físico

En el móvil, `localhost` es el propio dispositivo. Para que la app se conecte a tu API en el PC:

1. En el PC ejecuta `ipconfig` (Windows) o `ifconfig` (Mac/Linux) y anota la **IPv4** (ej. `192.168.1.10`).
2. En la carpeta **App/Mobile** crea un archivo **`.env`** con:
   ```env
   EXPO_PUBLIC_API_URL=http://TU_IP:5051
   ```
   (reemplaza `TU_IP` por tu IPv4).
3. Reinicia Expo (`Ctrl+C` y luego `npx expo start`) y vuelve a escanear el QR.

---

## Scripts

| Comando | Descripción |
|--------|-------------|
| `npm start` | Inicia el servidor de desarrollo de Expo (Metro) |
| `npx expo start --android` | Abre la app en emulador Android |
| `npx expo start --ios` | Abre la app en simulador iOS (solo macOS) |
| `npx expo start --web` | Abre la app en el navegador (modo web) |

---

## Estructura del proyecto

```
App/Mobile/
├── App.jsx              # Raíz y navegación (stack: Splash, Login, Dashboard, SpeechToText, …)
├── index.js             # Punto de entrada de Expo
├── app.json             # Configuración de Expo (permisos micrófono, etc.)
├── babel.config.js
├── package.json
└── src/
    ├── config.js        # API_BASE_URL (EXPO_PUBLIC_API_URL) y rutas de auth
    ├── styles/
    │   └── global.css   # Referencia comentada (login); en RN los estilos son StyleSheet
    ├── components/
    │   ├── AudioRecorder.jsx
    │   └── AudioRecorder.styles.js
    ├── screens/         # Pantallas (estilos en *.styles.js cuando aplica)
    │   ├── DashboardScreen.jsx + DashboardScreen.styles.js
    │   ├── SpeechToTextScreen.jsx + SpeechToTextScreen.styles.js
    │   ├── HomeScreen.jsx
    │   ├── LoginScreen.jsx
    │   ├── SignUpScreen.jsx
    │   └── …
    └── utils/
        ├── api.js           # login(), register() (sin token)
        ├── authFetch.js     # fetch con Authorization: Bearer (JWT desde sesión)
        ├── session.js       # AsyncStorage @champion_user: user_id, accessToken, refreshToken
        ├── speechApi.js     # flujo STT v2 (init → blob → SpeechToTextv2)
        └── validation.js
```

En **React Native** no se usa CSS como en web: los estilos van en **`StyleSheet.create(...)`**, habitualmente en archivos **`.styles.js`** junto a la pantalla o el componente (equivalente a “CSS aparte”).

---

## Integración con el backend (Node/Express)

La app consume (rutas reales del API en este repo):

- **POST** `/API/v1/AUTH/login` – Inicio de sesión (email, password). Respuesta con JWT en `data.user.jwt`.
- **POST** `/API/v1/AUTH/register` – Registro de usuario.

Tras el login, la app guarda en **AsyncStorage** (`@champion_user`) el **user_id** y los **tokens** (`accessToken` / `refreshToken`). Las peticiones protegidas deben usar **`authenticatedFetch`** (`src/utils/authFetch.js`), que añade el header **`Authorization: Bearer <JWT>`**.

Servicios de voz (STT), con token:

- **POST** `/API/v1/AIServices/Speechv2/init`
- **POST** `/API/v1/AIServices/Speechv2/SpeechToTextv2`

El backend está en **App/API** (Express, puerto 5051 por defecto).
