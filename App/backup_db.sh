#!/bin/bash

# Este script realiza una copia de seguridad de la Base de datos
# si se realiza algun cambio en la BD antes de subir los cambios
# ejecute este script para subir la ultima version de la BD al repositorio.
# ./backup_db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
CONTAINER_NAME="postgres_db"
BACKUP_DIR="$SCRIPT_DIR/backups"
INIT_SQL="$SCRIPT_DIR/docker/postgres/init.sql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MAX_BACKUPS=10

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}=== Champion DB - Backup & Sync ===${NC}"

# --- Cargar variables de entorno ---
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: no se encontró .env en $SCRIPT_DIR${NC}"
    exit 1
fi
set -a; source "$ENV_FILE"; set +a

DB_USER="${POSTGRES_USER:-champion_db_user}"
DB_NAME="${POSTGRES_DB:-champion_db}"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

# --- [1/4] Verificar contenedor ---
echo -e "\n${YELLOW}[1/4] Verificando contenedor '$CONTAINER_NAME'...${NC}"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}  El contenedor no está corriendo.${NC}"
    echo -e "  Ejecuta primero: ${YELLOW}docker compose up -d${NC}"
    exit 1
fi
echo "  Contenedor activo."

# --- [2/4] Generar dump (solo schema, sin datos) ---
echo -e "\n${YELLOW}[2/4] Generando pg_dump de '$DB_NAME' (schema sin datos)...${NC}"
mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-acl \
    --schema-only \
    > "$BACKUP_FILE"

echo "  Backup guardado en: $BACKUP_FILE"

# --- [3/4] Actualizar init.sql ---
echo -e "\n${YELLOW}[3/4] Actualizando docker/postgres/init.sql...${NC}"
cp "$BACKUP_FILE" "$INIT_SQL"
echo "  init.sql sincronizado con el estado actual de la BD."

# --- [4/4] Limpiar backups antiguos ---
echo -e "\n${YELLOW}[4/4] Limpiando backups antiguos (máximo $MAX_BACKUPS)...${NC}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    ls -t "$BACKUP_DIR"/*.sql | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "  Eliminados $((BACKUP_COUNT - MAX_BACKUPS)) backup(s) antiguos."
else
    echo "  Sin backups que eliminar ($BACKUP_COUNT/$MAX_BACKUPS)."
fi

# --- Resumen ---
echo -e "\n${GREEN}Backup completado exitosamente.${NC}"
echo ""
echo -e "  Para compartir el schema actualizado con el equipo:"
echo -e "  ${YELLOW}git add docker/postgres/init.sql && git commit -m 'chore: update db schema'${NC}"
echo ""
echo -e "  Para que otro dev aplique esta version desde cero:"
echo -e "  ${YELLOW}docker compose down -v && docker compose up -d${NC}"
