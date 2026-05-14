#!/bin/sh
set -e
echo "=== Starting Application ==="
echo "PORT Environment Variable is: $PORT"

cd /app/apps/backend

echo ">>> Running Prisma migrations synchronously..."
npx prisma db push --accept-data-loss

echo ">>> Starting backend..."
exec node dist/index.js
