#!/usr/bin/env bash
# Este script realiza la conexion a la base de datos 
# permitiendo usar la terminal PSQL para inspeccion de la BD
# ./db.sh
CONTAINER_NAME="postgres_db"

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "No existe el contenedor: $CONTAINER_NAME"
  echo "Primero levanta la BD con:"
  echo "  docker compose up -d"
  exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" != "true" ]; then
  echo "El contenedor existe, pero está detenido. Iniciándolo..."
  docker start "$CONTAINER_NAME" > /dev/null
fi

POSTGRES_USER=$(docker inspect "$CONTAINER_NAME" --format='{{range .Config.Env}}{{println .}}{{end}}' \
  | awk -F= '$1=="POSTGRES_USER" {print substr($0,index($0,"=")+1)}')

POSTGRES_DB=$(docker inspect "$CONTAINER_NAME" --format='{{range .Config.Env}}{{println .}}{{end}}' \
  | awk -F= '$1=="POSTGRES_DB" {print substr($0,index($0,"=")+1)}')

if [ -z "$POSTGRES_USER" ]; then
  POSTGRES_USER="postgres"
fi

if [ -z "$POSTGRES_DB" ]; then
  POSTGRES_DB="$POSTGRES_USER"
fi

echo "Conectando a PostgreSQL..."
echo "Contenedor: $CONTAINER_NAME"
echo "Usuario:    $POSTGRES_USER"
echo "Base datos: $POSTGRES_DB"
echo ""

docker exec -it "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
