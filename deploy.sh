#!/bin/bash

HOST="vaioserver"
USER="ppvaio"
REMOTE_DIR="/home/$USER/traderos"

echo "================================================"
echo "🚀 INICIANDO DEPLOY DO TRADEROS PARA PRODUÇÃO"
echo "Servidor: $HOST"
echo "================================================"

echo ""
echo "📦 Passo 1: Criando diretório no servidor..."
ssh $HOST "mkdir -p $REMOTE_DIR"

echo ""
echo "📤 Passo 2: Copiando os arquivos do projeto para o servidor..."
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' --exclude '.env*' ./ $HOST:$REMOTE_DIR

echo ""
echo "🐳 Passo 3: Construindo e subindo os containers de Produção..."
ssh $HOST "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d --build"

echo ""
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "O TraderOS já deve estar rodando na máquina de produção!"
echo "Acesse pelo navegador: http://192.168.0.102:3002"
echo "================================================"
