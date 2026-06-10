# Este script realiza una copia de seguridad de la Base de datos (solo schema, sin datos)
# si se realiza algun cambio en la BD antes de subir los cambios
# ejecute este script para subir la ultima version de la BD al repositorio.
# .\backup_db.ps1

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Uso: .\backup_db.ps1" -ForegroundColor Green
    Write-Host ""
    Write-Host "Este script realiza una copia de seguridad del schema de la base de datos PostgreSQL"
    Write-Host "usando Docker y copia el resultado a docker/postgres/init.sql"
    exit 0
}

# Configuración de colores
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$NC = "`e[0m"

Write-Host "$GREEN=== Champion DB - Backup & Sync ===$NC"

# --- Rutas ---
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ENV_FILE = Join-Path $SCRIPT_DIR ".env"
$CONTAINER_NAME = "postgres_db"
$BACKUP_DIR = Join-Path $SCRIPT_DIR "backups"
$INIT_SQL = Join-Path $SCRIPT_DIR "docker\postgres\init.sql"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$MAX_BACKUPS = 10

# Cargar variables de entorno
Write-Host "`n$YELLOW--- Cargar variables de entorno ---$NC"
if (-Not (Test-Path $ENV_FILE)) {
    Write-Host "$RED Error: no se encontró .env en $SCRIPT_DIR $NC" -ForegroundColor Red
    exit 1
}

# Simple .env parser
$env_vars = @{}
Get-Content $ENV_FILE | Where-Object { $_ -match "^\s*([^=]+)=(.*)$" } | ForEach-Object {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim()
    $env_vars[$key] = $value
}

$DB_USER = if ($env_vars.ContainsKey("POSTGRES_USER")) { $env_vars["POSTGRES_USER"] } else { "champion_db_user" }
$DB_NAME = if ($env_vars.ContainsKey("POSTGRES_DB")) { $env_vars["POSTGRES_DB"] } else { "champion_db" }
$BACKUP_FILE = Join-Path $BACKUP_DIR "${DB_NAME}_${TIMESTAMP}.sql"

# --- [1/4] Verificar contenedor ---
Write-Host "`n$YELLOW[1/4] Verificando contenedor '$CONTAINER_NAME'...$NC"
$container_running = docker ps --format "{{.Names}}" | Select-String "^${CONTAINER_NAME}$"
if (-Not $container_running) {
    Write-Host "$RED  El contenedor no está corriendo.$NC" -ForegroundColor Red
    Write-Host "  Ejecuta primero: $YELLOW docker compose up -d $NC"
    exit 1
}
Write-Host "  Contenedor activo."

# --- [2/4] Generar dump (solo schema, sin datos) ---
Write-Host "`n$YELLOW[2/4] Generando pg_dump de '$DB_NAME' (schema sin datos)...$NC"
if (-Not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

docker exec $CONTAINER_NAME pg_dump `
    -U $DB_USER `
    -d $DB_NAME `
    --clean `
    --if-exists `
    --no-acl `
    --schema-only `
    | Out-File -FilePath $BACKUP_FILE -Encoding UTF8

Write-Host "  Backup guardado en: $BACKUP_FILE"

# --- [3/4] Actualizar init.sql ---
Write-Host "`n$YELLOW[3/4] Actualizando docker/postgres/init.sql...$NC"
Copy-Item $BACKUP_FILE $INIT_SQL -Force
Write-Host "  init.sql sincronizado con el estado actual de la BD."

# --- [4/4] Limpiar backups antiguos ---
Write-Host "`n$YELLOW[4/4] Limpiando backups antiguos (máximo $MAX_BACKUPS)...$NC"
$backup_files = Get-ChildItem $BACKUP_DIR -Filter "*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
$backup_count = $backup_files.Count
if ($backup_count -gt $MAX_BACKUPS) {
    $files_to_remove = $backup_files | Select-Object -Skip $MAX_BACKUPS
    $files_to_remove | Remove-Item -Force
    Write-Host "  Eliminados $($backup_count - $MAX_BACKUPS) backup(s) antiguos."
}
else {
    Write-Host "  Sin backups que eliminar ($backup_count/$MAX_BACKUPS)."
}

# --- Resumen ---
Write-Host "`n$GREEN Backup completado exitosamente.$NC" -ForegroundColor Green
Write-Host ""
Write-Host "  Para compartir el schema actualizado con el equipo:"
Write-Host "  $YELLOW git add docker/postgres/init.sql && git commit -m 'chore: update db schema'$NC"
Write-Host ""
Write-Host "  Para que otro dev aplique esta version desde cero:"
Write-Host "  $YELLOW docker compose down -v && docker compose up -d$NC"
Write-Host ""
