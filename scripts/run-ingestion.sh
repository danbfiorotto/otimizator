#!/bin/bash

# Script para executar ingestão de dados históricos
# Aguarda o servidor estar pronto antes de executar

CRON_SECRET="${CRON_SECRET:-your-secret-here}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
MONTHS="${1:-12}"
PARKS="${2:-}"

if [ -z "$CRON_SECRET" ] || [ "$CRON_SECRET" = "your-secret-here" ]; then
  echo "Erro: CRON_SECRET não definido"
  echo "Defina a variável de ambiente CRON_SECRET:"
  echo "  export CRON_SECRET='seu-secret-aqui'"
  exit 1
fi

echo "Aguardando servidor estar pronto..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s -f "${BASE_URL}/api/health" > /dev/null 2>&1; then
    echo "Servidor está pronto!"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "Tentativa $ATTEMPT/$MAX_ATTEMPTS - aguardando servidor..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Erro: Servidor não está respondendo após $MAX_ATTEMPTS tentativas"
  echo "Certifique-se de que o servidor está rodando: npm run dev"
  exit 1
fi

URL="${BASE_URL}/api/admin/ingest-historical-data?months=${MONTHS}"
if [ -n "$PARKS" ]; then
  URL="${URL}&parks=${PARKS}"
fi

echo ""
echo "Iniciando ingestão de dados históricos..."
echo "URL: ${URL}"
echo "Meses: ${MONTHS}"
if [ -n "$PARKS" ]; then
  echo "Parques: ${PARKS}"
else
  echo "Parques: Todos"
fi
echo ""

# Executa ingestão
INGESTION_RESULT=$(curl -s -X POST "${URL}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

echo "Resultado da ingestão:"
echo "$INGESTION_RESULT" | jq '.' 2>/dev/null || echo "$INGESTION_RESULT"

echo ""
echo "Aguardando 5 segundos antes de processar estatísticas..."
sleep 5

# Processa estatísticas por hora
echo ""
echo "Processando estatísticas por hora..."
HOURLY_RESULT=$(curl -s -X GET "${BASE_URL}/api/cron/aggregate_hourly" \
  -H "Authorization: Bearer ${CRON_SECRET}")

echo "Resultado das estatísticas por hora:"
echo "$HOURLY_RESULT" | jq '.' 2>/dev/null || echo "$HOURLY_RESULT"

echo ""
echo "Aguardando 5 segundos antes de processar estatísticas diárias..."
sleep 5

# Processa estatísticas diárias
echo ""
echo "Processando estatísticas diárias..."
DAILY_RESULT=$(curl -s -X GET "${BASE_URL}/api/cron/aggregate_daily" \
  -H "Authorization: Bearer ${CRON_SECRET}")

echo "Resultado das estatísticas diárias:"
echo "$DAILY_RESULT" | jq '.' 2>/dev/null || echo "$DAILY_RESULT"

echo ""
echo "Processo concluído!"
