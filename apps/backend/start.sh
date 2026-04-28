#!/bin/sh
echo "=== Starting Application ==="
echo "PORT Environment Variable is: $PORT"

cd /app/apps/backend

echo ">>> Running Prisma migrations..."
npx --yes prisma db push --accept-data-loss
PRISMA_EXIT_CODE=$?

if [ $PRISMA_EXIT_CODE -ne 0 ]; then
  echo ">>> Prisma db push FAILED with code $PRISMA_EXIT_CODE"
  echo ">>> We will start the Node server anyway so you don't get the 'failed to respond' error."
else
  echo ">>> Prisma migration SUCCESS!"
fi

echo ">>> Starting backend..."
exec node dist/index.js
