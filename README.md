# Otimizator

Planejador Inteligente de Viagens a Parques Temáticos

Otimizator é uma aplicação web completa para otimizar viagens a parques temáticos, resolvendo dois problemas principais:

1. **"Qual parque em qual dia?"** - Planejamento multi-parques baseado em crowd calendar e estatísticas históricas
2. **"Qual atração em qual momento?"** - Itinerário intra-parque otimizado com replano em tempo real

## 🚀 Features

- **Planejamento Inteligente de Parques**: Sugestão automática de distribuição de parques por dia baseada em crowd calendar
- **Otimização de Itinerário**: Geração de roteiro otimizado por atração com horários, deslocamentos e risco de downtime
- **Modo Ao Vivo**: Replano automático baseado em dados de fila em tempo real (atualizado a cada 5 minutos)
- **Estatísticas Avançadas**: Heatmaps, rankings de melhores horários e análise de confiabilidade de atrações
- **Colaboração em Grupo**: Compartilhamento de viagens com múltiplos usuários

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 14+ (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js Route Handlers, Server Actions
- **Database**: Supabase Postgres
- **Cache**: Vercel KV (Upstash)
- **Auth**: Supabase Auth (magic link)
- **APIs Externas**: Queue-Times, ThemeParks.wiki

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta Vercel (para deploy)
- Vercel KV (Upstash) - opcional para desenvolvimento local

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd Otimizator
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://uuegmabnvarstgemflch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZWdtYWJudmFyc3RnZW1mbGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDU3ODksImV4cCI6MjA4MzQ4MTc4OX0.8Dcw20b0JN6Q2f5zGBKn47IresJ3Q8bSMVu0Tldf-Do
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZWdtYWJudmFyc3RnZW1mbGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNTc4OSwiZXhwIjoyMDgzNDgxNzg5fQ.vHwCShBbcHpkEsXskZqGg9sEun1xsQjKE6_QzWe5xDc

# Vercel KV (Upstash)
KV_REST_API_URL="https://rational-mako-33199.upstash.io"
KV_REST_API_TOKEN="AYGvAAIncDI3MmY2ZGExMmMzZWM0OTQ2ODBmMTgyZGI3MDRjMGJlOXAyMzMxOTk"

# Cron Secret
CRON_SECRET=b2c22d4855e07e4eead3c03496e757b48e2028b1ba6b06058beeabfb5adaf290

# Queue-Times Attribution (compliance)
QUEUE_TIMES_ATTRIBUTION_URL=https://queue-times.com

# ThemeParks.wiki
THEMEPARKS_BASE_URL=https://api.themeparks.wiki/v1
```

4. Configure o banco de dados:
   - Crie um projeto no Supabase
   - Execute as migrations em `supabase/migrations/001_initial_schema.sql`
   - Configure as RLS policies (já incluídas na migration)

5. Execute o projeto:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
/app
  /(public)          # Páginas públicas
  /(auth)            # Login/callback
  /app               # App autenticado
    /trips           # Gestão de viagens
    /dashboard       # Dashboard principal
  /api               # Route handlers
    /cron            # Cron jobs
/lib
  /connectors        # Integrações APIs externas
  /planner           # Algoritmos de otimização
  /aggregations      # Jobs de agregação estatística
  /db                # Database (Supabase)
  /dto               # DTOs e validação
  /utils             # Utilitários
/supabase/migrations # SQL migrations
```

## 🔄 Cron Jobs

O projeto utiliza **2 cron jobs orquestradores** (otimizado para plano Hobby da Vercel - limite de 2 cron jobs diários):

### 1. Periodic Cron (`/api/cron/frequent`)
Roda **1x por dia às 2h** e executa:
- **Aggregate Hourly**: Calcula estatísticas por hora (p50/p80/p95)
- **Queue-Times Calendar**: Atualiza crowd calendar (próximos 6 meses)

### 2. Daily Cron (`/api/cron/daily`)
Roda **1x por dia às 3h** e executa todas as tarefas diárias em sequência:
- **Queue-Times Stats**: Atualiza estatísticas históricas
- **ThemeParks Schedule**: Atualiza horários de funcionamento
- **Aggregate Daily**: Calcula park_day_scores

### Queue-Times Live (Update On-Demand)

Devido à limitação do plano Hobby (apenas cron jobs diários permitidos), os **dados ao vivo são atualizados on-demand** quando o endpoint `/api/parks/[parkId]/live` é chamado:

- **Cache**: Dados são cacheados por 120 segundos
- **Auto-Update**: Se os dados estão desatualizados (>5min), atualiza automaticamente em background
- **Rate Limiting**: Máximo 1 update por parque a cada 5 minutos para evitar sobrecarga
- **Não-bloqueante**: A resposta retorna imediatamente com dados do cache, atualização ocorre em background

**Alternativa**: Para atualização automática a cada 5 minutos, você pode usar um serviço externo gratuito (ex: cron-job.org, EasyCron) para chamar `/api/cron/queuetimes_live` com o header `Authorization: Bearer ${CRON_SECRET}`.

**Nota**: Cada tarefa dentro dos orquestradores usa locks individuais para evitar execuções concorrentes.

## 📊 APIs

### Parks

- `GET /api/parks` - Lista todos os parques
- `GET /api/parks/[parkId]` - Detalhes de um parque
- `GET /api/parks/[parkId]/live` - Dados ao vivo (cache 120s)
- `GET /api/parks/[parkId]/calendar` - Calendar days com crowd%
- `GET /api/parks/[parkId]/stats` - Estatísticas agregadas

### Trips

- `GET /api/trips` - Lista viagens do usuário
- `POST /api/trips` - Cria nova viagem
- `GET /api/trips/[tripId]` - Detalhes da viagem
- `POST /api/trips/[tripId]/optimize` - Otimiza parques por dia
- `POST /api/trips/[tripId]/days/[date]/plan` - Gera plano do dia
- `POST /api/trips/[tripId]/days/[date]/replan` - Replano com dados ao vivo

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e
```

## 🚢 Deploy

### Vercel

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no painel da Vercel
3. O deploy será automático a cada push

**📖 Para instruções detalhadas, consulte [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)**

### Migrations

Execute as migrations no Supabase antes do primeiro deploy:

```sql
-- Execute o conteúdo de supabase/migrations/001_initial_schema.sql
-- no SQL Editor do Supabase
```

## 📝 Compliance

Este projeto usa dados da Queue-Times API, que exige exibição de atribuição. O footer "Powered by Queue-Times.com" está incluído em todas as páginas conforme requerido.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🔗 Links Úteis

- [Queue-Times API](https://queue-times.com)
- [ThemeParks.wiki API](https://api.themeparks.wiki)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## 🐛 Troubleshooting

### Erro de conexão com Supabase

Verifique se as variáveis de ambiente estão configuradas corretamente e se o projeto Supabase está ativo.

### Cron jobs não executam

Verifique se o `CRON_SECRET` está configurado e se os cron jobs estão habilitados no Vercel.

### Cache não funciona

Verifique se o Vercel KV está configurado e as credenciais estão corretas.

## 📞 Suporte

Para questões e suporte, abra uma issue no repositório.
