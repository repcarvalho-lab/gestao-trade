#!/bin/bash

# Script para subir o sistema TraderOS em ambiente de desenvolvimento

echo "🚀 Iniciando os containers do TraderOS..."
/Applications/Docker.app/Contents/Resources/bin/docker compose -f docker-compose.dev.yml up -d

echo "--------------------------------------------------------"
echo "✅ Sistema iniciado com sucesso em background!"
echo "🌐 Frontend (Interface): http://localhost:3000"
echo "🔌 Backend (API):        http://localhost:4000"
echo "🗄️  Banco de Dados:      localhost:5433"
echo "--------------------------------------------------------"
echo "Para visualizar os logs, digite: docker compose -f docker-compose.dev.yml logs -f"
