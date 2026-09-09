#!/usr/bin/env bash
# Respaldo de la base de oktienda.cl.
#
# Guarda un volcado comprimido con la fecha en el nombre y borra los que pasen
# de DIAS_A_CONSERVAR. Pensado para correr una vez al día desde cron:
#
#   0 3 * * * /ruta/al/proyecto/scripts/respaldo.sh >> /var/log/oktienda-respaldo.log 2>&1
#
# Para restaurar (ojo: reemplaza los datos actuales):
#
#   gunzip -c respaldos/oktienda-2026-09-09.sql.gz | psql "$DATABASE_URL"
#
# Un respaldo que nunca se restauró no es un respaldo: prueba la restauración
# en una base aparte al menos una vez, y repítelo cada cierto tiempo.

set -euo pipefail

DESTINO="${DESTINO:-$(cd "$(dirname "$0")/.." && pwd)/respaldos}"
DIAS_A_CONSERVAR="${DIAS_A_CONSERVAR:-14}"

if [ -z "${DATABASE_URL:-}" ]; then
  # Toma la URL del .env del proyecto si no viene en el entorno.
  ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
  if [ -f "$ENV_FILE" ]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL: no sé qué base respaldar." >&2
  exit 1
fi

mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/oktienda-$(date +%Y-%m-%d-%H%M).sql.gz"

pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$ARCHIVO"

# Un volcado vacío suele significar que pg_dump falló sin devolver error.
TAMANO=$(wc -c < "$ARCHIVO")
if [ "$TAMANO" -lt 1024 ]; then
  echo "El respaldo quedó en $TAMANO bytes: algo salió mal." >&2
  exit 1
fi

find "$DESTINO" -name 'oktienda-*.sql.gz' -mtime "+$DIAS_A_CONSERVAR" -delete

echo "Respaldo listo: $ARCHIVO ($((TAMANO / 1024)) KB)"
