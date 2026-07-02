# Setup Local

tags: #operations #setup #local #docker

---

## Requisitos previos

| Herramienta | Versión | Verificación |
|---|---|---|
| Node.js | 18+ (LTS recomendado) | `node -v` |
| npm | incluido con Node.js | `npm -v` |
| Docker Desktop | cualquier versión reciente | UI de Docker |
| Expo Go (opcional) | app en móvil | Para dispositivo físico |

---

## Requisitos adicionales

| Herramienta | Uso |
|---|---|
| Python 3.11+ | Azure Function App |
| Azure Functions Core Tools v4 | Ejecutar la Function localmente (`func start`) |

## Orden de inicio

```
1. PostgreSQL (Docker)
2. Backend API (Node.js)
3. Azure Function (Python)
4. App Móvil (Expo)
```

Los cuatro pueden correr en terminales paralelas. La API y la Function dependen de la BD; la app depende de la API.

---

## 1. Base de datos (PostgreSQL via Docker)

```bash
cd App

# Levantar contenedor en background
docker compose up -d
```

| Parámetro | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Usuario | `champion_db_user` |
| Contraseña | definida en `.env` |
| Base de datos | `champion_db` |

El schema completo se carga automáticamente desde `App/docker/postgres/init.sql` en el primer arranque (cuando el volumen es nuevo).

**Comandos útiles:**

| Comando | Efecto |
|---|---|
| `docker compose up -d` | Levanta el contenedor. Si el volumen existe, preserva los datos. |
| `docker compose down -v` | Detiene el contenedor **y elimina todos los datos**. El próximo `up` aplica `init.sql` desde cero. |
| `docker compose down` | Detiene el contenedor sin borrar datos. |

> **Cuidado:** `docker compose down -v` elimina todos los datos de la BD. Usarlo solo cuando se quiere partir desde el schema versionado.

---

## 2. Backend API

```bash
cd App/API
npm install
npm start
```

La API queda disponible en `http://localhost:5000`.

**Variables de entorno:** Configurar en `App/.env` (global — `App/API/src/index.js` carga `dotenv` desde ahí, no desde `App/API/.env`). Incluye `PORT` (default 5000 si no está definido), la conexión a PostgreSQL y las credenciales de Azure.

---

## 3. Azure Function (Python)

```bash
cd App/procesamiento
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
func start
```

Requiere `local.settings.json` con las variables de Azure. Ver `App/procesamiento/local.settings.json` (no commitear).

**Variables necesarias:**
- `AzureWebJobsStorage` — Azure Storage connection string (o Azurite local)
- `AZURE_STORAGE_CONNECTION_STRING` — para acceso a Blob
- `AZURE_BLOB_CONTAINER_NAME` — contenedor de audio
- `SPEECH_KEY` / `SPEECH_REGION` — Fast Transcription
- `OPENAI_KEY` / `OPENAI_ENDPOINT` / `OPENAI_API_VERSION` / `OPENAI_DEPLOYMENT` — gpt-5-mini
- `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` — PostgreSQL

---

## 4. App Móvil (Expo)

```bash
cd App/Mobile
npm install
npx expo start
```

Se muestra un QR en la terminal o en el navegador.

### Opciones de ejecución

| Opción | Comando |
|---|---|
| Android emulador | `a` en la terminal de Expo |
| iOS emulador (solo macOS) | `i` en la terminal de Expo |
| Dispositivo físico | Escanear QR con Expo Go |

### Configurar URL de la API para dispositivo físico

`localhost` en el móvil apunta al teléfono, no al PC. Configurar la IP local:

1. En Windows: ejecutar `ipconfig` y anotar la IPv4 de la red local (ej. `192.168.1.10`)
2. Crear `App/Mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
   ```
3. Reiniciar Expo (`Ctrl+C` y `npx expo start`)
4. Escanear el QR nuevamente

> El móvil y el PC deben estar en la misma red Wi-Fi.

---

## Verificación del setup

Una vez todo iniciado, verificar con:

```bash
# Verificar que la BD responde
docker exec -it postgres_db psql -U champion_db_user -d champion_db -c "\dt"

# Verificar que la API responde
curl http://localhost:5000/API/AUTH/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# Debe devolver 401 UNAUTHORIZED (no 500), lo que confirma que la API y la BD están conectadas
```

---

## Estructura del repositorio relevante para el setup

```
Champion-AI/
└── App/
    ├── API/                    ← Backend Node.js
    │   └── .env               ← Variables de entorno de la API
    ├── Mobile/                 ← App React Native
    │   └── .env               ← URL de la API
    ├── docker-compose.yml      ← Configuración del contenedor
    ├── docker/
    │   └── postgres/
    │       └── init.sql       ← Schema versionado de la BD
    └── backup_db.sh           ← Script de backup
```

---

## Referencias cruzadas

- [[database-management]] — Backup y sincronización de la BD
- [[schema-overview]] — Qué hay en la BD al iniciarse
- [[overview]] — Arquitectura general del sistema
