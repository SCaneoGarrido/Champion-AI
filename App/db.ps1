# Este script realiza la conexion a la base de datos 
# permitiendo usar la terminal PSQL para inspeccion de la BD
# .\db.ps1

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Uso: .\db.ps1" -ForegroundColor Green
    Write-Host ""
    Write-Host "Este script abre una conexión psql interactiva al contenedor PostgreSQL"
    exit 0
}

$CONTAINER_NAME = "postgres_db"

# Verificar si el contenedor existe
$container_exists = docker ps -a --format "{{.Names}}" | Select-String "^${CONTAINER_NAME}$"
if (-Not $container_exists) {
    Write-Host "No existe el contenedor: $CONTAINER_NAME" -ForegroundColor Red
    Write-Host "Primero levanta la BD con:" -ForegroundColor Yellow
    Write-Host "  docker compose up -d"
    exit 1
}

# Verificar si el contenedor está corriendo
$container_running = docker ps --format "{{.Names}}" | Select-String "^${CONTAINER_NAME}$"
if (-Not $container_running) {
    Write-Host "El contenedor existe, pero está detenido. Iniciándolo..." -ForegroundColor Yellow
    docker start $CONTAINER_NAME | Out-Null
}

# Obtener variables de entorno del contenedor
$env_output = docker inspect $CONTAINER_NAME --format='{{range .Config.Env}}{{println .}}{{end}}'
$POSTGRES_USER = ($env_output | Select-String "^POSTGRES_USER=" | ForEach-Object { $_ -replace "^POSTGRES_USER=", "" }) -join ""
$POSTGRES_DB = ($env_output | Select-String "^POSTGRES_DB=" | ForEach-Object { $_ -replace "^POSTGRES_DB=", "" }) -join ""

# Usar valores por defecto si no se encuentran
if ([string]::IsNullOrWhiteSpace($POSTGRES_USER)) {
    $POSTGRES_USER = "postgres"
}

if ([string]::IsNullOrWhiteSpace($POSTGRES_DB)) {
    $POSTGRES_DB = $POSTGRES_USER
}

Write-Host "Conectando a PostgreSQL..." -ForegroundColor Green
Write-Host "Contenedor: $CONTAINER_NAME"
Write-Host "Usuario:    $POSTGRES_USER"
Write-Host "Base datos: $POSTGRES_DB"
Write-Host ""

docker exec -it $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB
