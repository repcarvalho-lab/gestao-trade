#!/bin/bash

# Script para reset do banco de dados do TraderOS (Mantém apenas re.pcarvalho@gmail.com)

echo "--------------------------------------------------------"
echo "⚠️  ATENÇÃO: RESET TOTAL DE BASE DE DADOS!"
echo "Isso irá deletar TODOS os usuários exceto 're.pcarvalho@gmail.com'."
echo "Além disso, TODO o histórico (Trades, Ciclos, Relatórios) será limpo."
echo "As configurações e lista de ativos do admin serão mantidas."
echo "--------------------------------------------------------"
echo "⏳ Iniciando em 5 segundos... (pressione Ctrl+C para cancelar)"
sleep 5

echo "⚙️ Executando limpeza no banco..."

# Executa comandos SQL nativos e diretos usando Heredoc dentro do container
docker exec -i traderos-postgres-dev psql -U traderos -d traderos_dev <<EOF
BEGIN;

-- 1. Remove qualquer outro usuário. Por causa do "onDelete: Cascade" do Prisma,
-- isso removerá todas as configurações e dados dos usuários secundários também.
DELETE FROM "User" WHERE email != 're.pcarvalho@gmail.com';

-- 2. Zera as tabelas operacionais do admin restante
DELETE FROM "Trade";
DELETE FROM "Ciclo";
DELETE FROM "TradingDay";
DELETE FROM "DepositoSaque";
DELETE FROM "WeeklyReport";
DELETE FROM "MonthlyReport";

COMMIT;
EOF

if [ $? -eq 0 ]; then
  echo "--------------------------------------------------------"
  echo "✅ Reset do banco concluído com sucesso!"
  echo "Apenas o usuário 're.pcarvalho@gmail.com' foi mantido na base."
  echo "--------------------------------------------------------"
else
  echo "--------------------------------------------------------"
  echo "❌ Ocorreu um erro ao resetar a base de dados."
  echo "Verifique se o container 'traderos-postgres-dev' está rodando."
  echo "--------------------------------------------------------"
fi
