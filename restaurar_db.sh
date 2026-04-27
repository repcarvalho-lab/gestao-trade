#!/bin/bash

# Script para restaurar backup do banco de dados do TraderOS

BACKUP_DIR="/Users/renata/Desktop/Projetos/gestao-trade-dbbkp"

if [ -z "$1" ]; then
  echo "--------------------------------------------------------"
  echo "❌ Erro: Caminho do arquivo de backup não informado."
  echo "Uso correto: ./restaurar_db.sh <caminho_do_arquivo.sql>"
  echo ""
  echo "Dica: Os seus backups geralmente ficam na pasta:"
  echo "$BACKUP_DIR/"
  echo "--------------------------------------------------------"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "--------------------------------------------------------"
  echo "❌ Erro: Arquivo '$FILE' não encontrado."
  echo "Por favor, verifique se o caminho digitado está correto."
  echo "--------------------------------------------------------"
  exit 1
fi

echo "--------------------------------------------------------"
echo "⚠️  ATENÇÃO: Substituição de Dados!"
echo "Isso iniciará um processo que irá restaurar e sobrescrever os dados na base atual."
echo "Restaurando a partir de: $FILE"
echo ""
echo "⏳ Iniciando em 3 segundos... (pressione Ctrl+C para cancelar)"
echo "--------------------------------------------------------"
sleep 3

echo "⚙️ Importando os dados..."
DOCKER_CMD=$(which docker 2>/dev/null || echo "/Applications/Docker.app/Contents/Resources/bin/docker")

echo "⏳ Limpando o banco de dados atual..."
# Drop and recreate schema inside docker without TTY
$DOCKER_CMD exec traderos-postgres-dev psql -U traderos -d traderos_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "⏳ Restaurando o arquivo: $FILE..."
# Restaura o dump sem TTY
cat "$FILE" | $DOCKER_CMD exec -i traderos-postgres-dev psql -U traderos -d traderos_dev

if [ $? -eq 0 ]; then
  echo "🔄 Sincronizando e atualizando as tabelas para a versão mais recente do sistema..."
  docker exec -i traderos-backend-dev npx prisma db push --accept-data-loss
  
  echo "--------------------------------------------------------"
  echo "✅ Restauração do banco concluída com sucesso!"
  echo "--------------------------------------------------------"
else
  echo "--------------------------------------------------------"
  echo "❌ Ocorreu um erro durante a restauração."
  echo "Verifique se o container 'traderos-postgres-dev' está rodando"
  echo "e se o arquivo SQL contém os dados corretos do pg_dump."
  echo "--------------------------------------------------------"
fi
