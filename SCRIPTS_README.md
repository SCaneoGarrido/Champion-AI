# Guía de Scripts de Base de Datos

Este directorio contiene scripts para gestionar copias de seguridad y conexiones a la base de datos PostgreSQL. Los scripts son multiplataforma y funcionan en **Windows**, **Linux** y **macOS**.

## Archivos Disponibles

### 1. Backup de Base de Datos (Schema sin datos)

#### Linux / macOS
```bash
./backup_db.sh
```

#### Windows (PowerShell)
```powershell
.\backup_db.ps1
```

**Descripción:**
- Realiza una copia de seguridad del **schema de la base de datos (sin datos)**
- Utiliza Docker para ejecutar `pg_dump` en el contenedor PostgreSQL
- Guarda el backup en el directorio `backups/`
- Actualiza `docker/postgres/init.sql` con el schema más reciente
- Limpia automáticamente backups antiguos (mantiene máximo 10)

**Requisitos:**
- Docker y docker-compose deben estar instalados y corriendo
- El contenedor `postgres_db` debe estar activo
- El archivo `.env` debe existir con las variables `POSTGRES_USER` y `POSTGRES_DB`

**Uso típico:**
```bash
# Despues de cambios en la BD
./backup_db.sh        # Linux/macOS
.\backup_db.ps1       # Windows

# Luego compartir con el equipo
git add docker/postgres/init.sql
git commit -m 'chore: update db schema'
git push
```

---

### 2. Conexión a Base de Datos (PSQL Interactivo)

#### Linux / macOS
```bash
./db.sh
```

#### Windows (PowerShell)
```powershell
.\db.ps1
```

**Descripción:**
- Abre una conexión interactiva a la base de datos PostgreSQL
- Inicia automáticamente el contenedor si está detenido
- Permite ejecutar queries SQL directamente

**Requisitos:**
- Docker debe estar instalado
- El contenedor `postgres_db` debe existir

**Ejemplo:**
```bash
./db.sh

# Se abrirá psql listo para comandos
psql> SELECT * FROM users;
psql> \dt
psql> \q  # Para salir
```

---

## Configuración de Ejecución en Windows

### Paso 1: Permitir ejecución de scripts en PowerShell

Si recibe el error `cannot be loaded because running scripts is disabled`, ejecute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Paso 2: Ejecutar el script

```powershell
# Desde el directorio raíz del proyecto
.\backup_db.ps1
.\db.ps1
```

---

## Configuración en Linux/macOS

### Paso 1: Dar permisos de ejecución

```bash
chmod +x backup_db.sh
chmod +x db.sh
chmod +x App/API/backup.sh
```

### Paso 2: Ejecutar los scripts

```bash
# Desde el directorio raíz
./backup_db.sh
./db.sh
```
---

## Importante: Schema sin Datos

Todos estos scripts realizan backups del **schema únicamente, sin datos**. Esto significa:

✅ **Se guarda:**
- Estructura de tablas
- Columnas y tipos de datos
- Índices
- Constraints (claves primarias, claves foráneas)
- Vistas y funciones
- Triggers

❌ **NO se guarda:**
- Datos de las tablas
- Registros

**Razón:** Mantener el repositorio limpio y permitir que cada desarrollador tenga sus propios datos de prueba.

---

## Troubleshooting

### El contenedor no está corriendo

```bash
# Inicia Docker Compose
docker compose up -d
```

### PostgreSQL connection refused

```bash
# Verifica que el contenedor esté activo
docker ps

# Si no aparece, levántalo
docker compose up -d
```

### Permisos insuficientes en Linux

```bash
# Dale permisos al usuario
sudo chown $USER:$USER backup_db.sh
chmod +x backup_db.sh
```

---

## Notas de Desarrollo

- Los scripts son idempotentes: puedes ejecutarlos múltiples veces sin problemas
- El timestamp en los backups previene sobrescrituras
- Siempre verifica el resultado antes de hacer git push
- Los backups sin datos son ideales para control de versiones

---

**Última actualización:** 2026-06-10
