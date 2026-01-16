# Ingestão de Dados Históricos

Este documento explica como baixar e armazenar dados históricos de todos os parques no banco de dados, permitindo que o sistema trabalhe com dados locais ao invés de fazer chamadas em tempo real para APIs externas.

## Por que usar dados históricos?

- **Performance**: Dados locais são muito mais rápidos que chamadas de API
- **Confiabilidade**: Não depende de APIs externas estarem disponíveis
- **Custo**: Reduz chamadas a APIs externas
- **Consistência**: Dados históricos não mudam, garantindo resultados consistentes

## Como usar

### 1. Ingestão Inicial (Todos os Parques)

Para baixar dados históricos de todos os parques:

```bash
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Parâmetros:
- `months`: Número de meses de calendário para baixar (default: 6)
- `parks`: IDs específicos de parques separados por vírgula (opcional)

### 2. Ingestão de Parques Específicos

Para baixar dados de parques específicos:

```bash
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12&parks=PARK_ID_1,PARK_ID_2" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### 3. O que é baixado?

O processo de ingestão baixa:

1. **Wait Samples (Amostras de Filas)**
   - Dados atuais de filas de todas as atrações
   - Armazenados em `wait_samples`
   - Usados para calcular estatísticas históricas

2. **Calendário (Crowd Calendar)**
   - Percentual de lotação por dia
   - Horários de funcionamento
   - Eventos especiais
   - Armazenados em `park_calendar_days`

### 4. Processamento de Estatísticas

Após a ingestão, execute as agregações:

```bash
# Agregar estatísticas por hora
curl -X GET "http://localhost:3000/api/cron/aggregate_hourly" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Agregar estatísticas diárias
curl -X GET "http://localhost:3000/api/cron/aggregate_daily" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Estrutura de Dados

### Wait Samples
Armazenam amostras históricas de filas:
- `attraction_id`: ID da atração
- `sampled_at`: Timestamp da amostra
- `is_open`: Se a atração estava aberta
- `wait_minutes`: Tempo de espera em minutos

### Park Calendar Days
Armazenam informações do calendário:
- `park_id`: ID do parque
- `date`: Data (YYYY-MM-DD)
- `crowd_percent`: Percentual de lotação (0-100)
- `open_time_local`: Horário de abertura
- `close_time_local`: Horário de fechamento
- Flags: feriados, eventos, etc.

### Attraction Hour Stats
Estatísticas agregadas por hora:
- `attraction_id`: ID da atração
- `month`: Mês (1-12)
- `dow`: Dia da semana (0-6)
- `hour`: Hora (0-23)
- `p50`, `p80`, `p95`: Percentis de tempo de espera
- `open_rate`: Taxa de abertura
- `sample_count`: Número de amostras

## Manutenção

### Atualização Periódica

Recomenda-se executar a ingestão periodicamente:

- **Wait Samples**: Diariamente (já feito pelo cron existente)
- **Calendário**: Semanalmente ou quando necessário
- **Estatísticas**: Após cada ingestão de wait samples

### Limpeza de Dados Antigos

Dados muito antigos podem ser removidos para economizar espaço:

```sql
-- Remove wait samples com mais de 1 ano
DELETE FROM wait_samples 
WHERE sampled_at < NOW() - INTERVAL '1 year';
```

## Troubleshooting

### Erro: "No Queue-Times mapping found"
- Verifique se o parque tem um mapeamento em `source_mappings`
- Execute a sincronização de parques primeiro

### Erro: "Failed to fetch calendar"
- Verifique se o Queue-Times está acessível
- Alguns parques podem não ter calendário disponível

### Dados incompletos
- Execute novamente para parques específicos
- Verifique logs para erros específicos
