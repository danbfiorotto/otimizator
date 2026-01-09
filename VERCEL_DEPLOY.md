# Guia de Deploy no Vercel

## ✅ Checklist de Variáveis de Ambiente

Certifique-se de que todas as seguintes variáveis estão configuradas no painel da Vercel:

### Obrigatórias para Build e Runtime

1. **Supabase (Obrigatórias)**
   - `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Chave de service role (para cron jobs)

2. **Vercel KV (Obrigatórias para cache e rate limiting)**
   - `KV_REST_API_URL` - URL da API REST do Vercel KV
   - `KV_REST_API_TOKEN` - Token da API REST do Vercel KV

3. **Cron Jobs (Obrigatória)**
   - `CRON_SECRET` - Secret para proteger endpoints de cron

### Opcionais (com valores padrão)

4. **APIs Externas**
   - `QUEUE_TIMES_ATTRIBUTION_URL` - Padrão: `https://queue-times.com`
   - `THEMEPARKS_BASE_URL` - Padrão: `https://api.themeparks.wiki/v1`

## 🔧 Como Configurar no Vercel

1. Acesse o painel do Vercel: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável acima
5. Selecione os ambientes (Production, Preview, Development)
6. Salve e faça um novo deploy

## 🚨 Problemas Comuns

### Build falha com "Missing Supabase environment variables"

**Solução**: Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel.

### Erro de conexão com KV

**Solução**: 
- Verifique se `KV_REST_API_URL` e `KV_REST_API_TOKEN` estão configurados
- Certifique-se de que o Vercel KV está conectado ao projeto no painel da Vercel

### Cron jobs não executam

**Solução**:
- Verifique se `CRON_SECRET` está configurado
- Verifique se os cron jobs estão habilitados em `vercel.json`
- Confirme que os paths em `vercel.json` correspondem aos routes handlers

## 📝 Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ Build completa sem erros
2. ✅ Aplicação acessível na URL fornecida
3. ✅ Health check: `https://seu-dominio.vercel.app/api/health`
4. ✅ Login funciona corretamente
5. ✅ Cron jobs aparecem no painel da Vercel (Cron Jobs tab)

## 🔍 Debugging

Se o build falhar:

1. Verifique os logs completos no Vercel
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Verifique se não há erros de TypeScript localmente:
   ```bash
   npm run type-check
   ```
4. Teste o build localmente:
   ```bash
   npm run build
   ```
