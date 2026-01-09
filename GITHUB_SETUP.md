# Instruções para Publicar no GitHub

## Passo 1: Criar o Repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `otimizator`
3. Descrição: "Planejador Inteligente de Viagens a Parques Temáticos"
4. Escolha se será público ou privado
5. **NÃO** marque "Initialize this repository with a README" (já temos um)
6. Clique em "Create repository"

## Passo 2: Conectar e Fazer Push

Após criar o repositório, execute os seguintes comandos no terminal (já no diretório do projeto):

```bash
git remote add origin https://github.com/SEU_USUARIO/otimizator.git
git branch -M main
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu username do GitHub.

## Alternativa: Usar SSH

Se preferir usar SSH (recomendado):

```bash
git remote add origin git@github.com:SEU_USUARIO/otimizator.git
git branch -M main
git push -u origin main
```
