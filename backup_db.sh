#!/bin/bash

# Script para gerar backup do banco de dados do TraderOS

BACKUP_DIR="/Users/renata/Desktop/Projetos/gestao-trade-dbbkp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/traderos_db_$TIMESTAMP.sql"

# Cria a pasta de backups se ela não existir
mkdir -p "$BACKUP_DIR"

echo "📦 Iniciando backup do banco de dados traderos_dev..."

DOCKER_CMD=$(which docker 2>/dev/null || echo "/Applications/Docker.app/Contents/Resources/bin/docker")

# Executa o pg_dump. 
# Importante: não usar '-t' no docker exec para não corromper o dump com caracteres de controle do terminal
$DOCKER_CMD exec traderos-postgres-dev pg_dump -U traderos -d traderos_dev -c > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "--------------------------------------------------------"
  echo "✅ Backup realizado com sucesso!"
  echo "📂 Arquivo salvo em: $FILENAME"
  echo "--------------------------------------------------------"
else
  echo "--------------------------------------------------------"
  echo "❌ Erro ao criar o backup!"
  echo "Verifique se o container 'traderos-postgres-dev' está rodando."
  echo "--------------------------------------------------------"
  # Remove o arquivo em caso de falha para não deixar lixo
  rm -f "$FILENAME"
fi
