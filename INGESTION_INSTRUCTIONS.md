# Instruções para Executar Ingestão de Dados Históricos

## Pré-requisitos

1. Servidor Next.js rodando (`npm run dev`)
2. Variável de ambiente `CRON_SECRET` configurada
3. Banco de dados Supabase configurado e acessível

## Opção 1: Executar no WSL (Linux)

Se você está usando WSL, execute:

```bash
# 1. Defina o CRON_SECRET
export CRON_SECRET="seu-secret-aqui"

# 2. Certifique-se de que o servidor está rodando
# Em outro terminal: npm run dev

# 3. Execute o script
chmod +x scripts/run-ingestion.sh
./scripts/run-ingestion.sh 12
```

## Opção 2: Executar no PowerShell (Windows)

Se você está usando PowerShell do Windows:

```powershell
# 1. Defina o CRON_SECRET
$env:CRON_SECRET = "seu-secret-aqui"

# 2. Certifique-se de que o servidor está rodando
# Em outro terminal: npm run dev

# 3. Execute o script
.\scripts\run-ingestion.ps1 -Months 12
```

## Opção 3: Executar Manualmente

Se preferir executar os comandos manualmente:

### 1. Verificar se o servidor está rodando

```bash
curl http://localhost:3000/api/health
```

### 2. Executar ingestão

```bash
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### 3. Processar estatísticas

```bash
# Estatísticas por hora
curl -X GET "http://localhost:3000/api/cron/aggregate_hourly" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Estatísticas diárias
curl -X GET "http://localhost:3000/api/cron/aggregate_daily" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Parâmetros

### Ingestão

- `months`: Número de meses de calendário para baixar (default: 12)
- `parks`: IDs específicos de parques separados por vírgula (opcional)

Exemplos:

```bash
# 6 meses de histórico
./scripts/run-ingestion.sh 6

# 12 meses para parques específicos
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12&parks=PARK_ID_1,PARK_ID_2" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Verificar Resultados

Após a execução, você pode verificar os dados no banco:

```sql
-- Verificar calendário baixado
SELECT COUNT(*) FROM park_calendar_days;

-- Verificar wait samples
SELECT COUNT(*) FROM wait_samples;

-- Verificar estatísticas agregadas
SELECT COUNT(*) FROM attraction_hour_stats;
```

## Troubleshooting

### Servidor não está respondendo

Certifique-se de que o servidor está rodando:
```bash
npm run dev
```

### Erro de autenticação

Verifique se o `CRON_SECRET` está correto e corresponde ao valor em `.env.local`:
```bash
echo $CRON_SECRET  # Linux/WSL
echo $env:CRON_SECRET  # PowerShell
```

### Erro de conexão com banco

Verifique as variáveis de ambiente do Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Dados não aparecem

- Verifique os logs do servidor para erros
- Verifique se os parques têm mapeamentos em `source_mappings`
- Execute novamente para parques específicos se necessário
