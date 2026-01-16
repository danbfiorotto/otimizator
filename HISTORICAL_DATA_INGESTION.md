# Sistema de Ingestão de Dados Históricos

## Visão Geral

O sistema foi modificado para trabalhar com dados históricos armazenados localmente no banco de dados, ao invés de fazer chamadas em tempo real para APIs externas. Isso melhora significativamente a performance e confiabilidade.

## O que foi implementado

### 1. Endpoint de Ingestão
**`POST /api/admin/ingest-historical-data`**

Endpoint para baixar e armazenar dados históricos de todos os parques.

**Uso:**
```bash
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Parâmetros:**
- `months`: Número de meses de calendário para baixar (default: 6)
- `parks`: IDs específicos de parques separados por vírgula (opcional)

### 2. Script de Ingestão
**`scripts/ingest.sh`**

Script bash para facilitar a execução da ingestão.

**Uso:**
```bash
export CRON_SECRET="seu-secret"
chmod +x scripts/ingest.sh
./scripts/ingest.sh 12  # 12 meses de histórico
```

### 3. Documentação
**`scripts/ingest-historical-data.md`**

Documentação completa sobre como usar o sistema de ingestão.

## Como funciona

### Dados Baixados

1. **Wait Samples (Amostras de Filas)**
   - Dados atuais de filas de todas as atrações
   - Armazenados em `wait_samples`
   - Usados para calcular estatísticas históricas

2. **Calendário (Crowd Calendar)**
   - Percentual de lotação por dia
   - Horários de funcionamento
   - Eventos especiais
   - Armazenados em `park_calendar_days`

### Fluxo de Dados

```
APIs Externas (Queue-Times)
    ↓
Ingestão (endpoint/script)
    ↓
Banco de Dados Local
    ↓
Sistema (usa dados locais)
```

## Como usar

### Passo 1: Executar Ingestão Inicial

Execute a ingestão para baixar dados históricos:

```bash
# Todos os parques, 12 meses
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Parques específicos
curl -X POST "http://localhost:3000/api/admin/ingest-historical-data?months=12&parks=PARK_ID_1,PARK_ID_2" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Passo 2: Processar Estatísticas

Após a ingestão, execute as agregações:

```bash
# Estatísticas por hora
curl -X GET "http://localhost:3000/api/cron/aggregate_hourly" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Estatísticas diárias
curl -X GET "http://localhost:3000/api/cron/aggregate_daily" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Passo 3: Sistema Usa Dados Locais

O sistema automaticamente usa dados do banco local:
- `/api/parks/[parkId]/calendar` - usa `park_calendar_days`
- Sistema de scoring - usa `park_day_scores` e `attraction_hour_stats`
- Otimização - usa dados locais para cálculos

## Benefícios

1. **Performance**: Dados locais são muito mais rápidos
2. **Confiabilidade**: Não depende de APIs externas
3. **Custo**: Reduz chamadas a APIs externas
4. **Consistência**: Dados históricos não mudam

## Manutenção

### Atualização Periódica

Recomenda-se executar a ingestão periodicamente:
- **Wait Samples**: Diariamente (já feito pelo cron existente)
- **Calendário**: Semanalmente ou quando necessário
- **Estatísticas**: Após cada ingestão de wait samples

### Limpeza de Dados Antigos

Dados muito antigos podem ser removidos:

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

## Próximos Passos

1. ✅ Endpoint de ingestão criado
2. ✅ Script de ingestão criado
3. ✅ Documentação criada
4. ⏳ Modificar sistema para usar dados locais primeiro (já implementado)
5. ⏳ Adicionar fallback para APIs externas quando dados não disponíveis
