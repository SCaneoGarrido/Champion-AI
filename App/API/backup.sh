#!/bin/bash 

# 1.- Cargo variables de entorno
if [ -f .env]; then
    set -a 
    source .env
    set +a
    echo "Variables de entorno cargadas con exito."
else
    echo "Error: el archivo .env no existe"


# 2.- Defino las variables
DATE_NOW = $(date "+%Y-%m-%d %H:%M:%S")
CONTAINER_NAME = ""
DB_USER = "$DBUSER"
DB_NAME = "$DATABASE"
OUTPUT_FILE = "$DATE_NOW_championdb_bk.sql"