#!/bin/bash

# Script para executar ingestão de dados históricos
# Uso: ./scripts/ingest.sh [months] [park_ids]

CRON_SECRET="${CRON_SECRET:-your-secret-here}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
MONTHS="${1:-12}"
PARKS="${2:-}"

if [ -z "$CRON_SECRET" ] || [ "$CRON_SECRET" = "your-secret-here" ]; then
  echo "Erro: CRON_SECRET não definido"
  echo "Defina a variável de ambiente CRON_SECRET ou edite o script"
  exit 1
fi

URL="${BASE_URL}/api/admin/ingest-historical-data?months=${MONTHS}"
if [ -n "$PARKS" ]; then
  URL="${URL}&parks=${PARKS}"
fi

echo "Iniciando ingestão de dados históricos..."
echo "URL: ${URL}"
echo "Meses: ${MONTHS}"
if [ -n "$PARKS" ]; then
  echo "Parques: ${PARKS}"
else
  echo "Parques: Todos"
fi
echo ""

curl -X POST "${URL}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "Ingestão concluída!"
