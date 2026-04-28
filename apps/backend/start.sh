#!/bin/sh
echo "=== Starting Application ==="
echo "PORT Environment Variable is: $PORT"

cd /app/apps/backend

echo ">>> Running Prisma migrations in the background..."
npx --yes prisma db push --accept-data-loss &

echo ">>> Starting backend..."
exec node dist/index.js
