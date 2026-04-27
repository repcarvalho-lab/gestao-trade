#!/bin/bash

# Script para derrubar o sistema TraderOS em ambiente de desenvolvimento

echo "🛑 Encerrando e removendo os containers do TraderOS..."
/Applications/Docker.app/Contents/Resources/bin/docker compose -f docker-compose.dev.yml down

echo "--------------------------------------------------------"
echo "✅ Sistema desligado com sucesso!"
echo "--------------------------------------------------------"
