# ─── STAGE 1: Build Frontend ──────────────────────────────────────
FROM node:22-alpine AS build-front
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=300"
COPY apps/frontend/package*.json ./apps/frontend/
RUN cd apps/frontend && npm install --no-audit --no-fund --maxsockets=1
COPY apps/frontend ./apps/frontend
RUN cd apps/frontend && npm run build

# ─── STAGE 2: Build Backend ───────────────────────────────────────
FROM node:22-alpine AS build-back
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=300"
COPY apps/backend/package*.json ./apps/backend/
RUN cd apps/backend && npm install --no-audit --no-fund --maxsockets=1
COPY apps/backend/prisma ./apps/backend/prisma
RUN cd apps/backend && npx prisma generate
COPY apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/src ./apps/backend/src
RUN cd apps/backend && npm run build

# ─── STAGE 3: Production Runner ───────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Instalar dependências de produção do backend
ENV NODE_OPTIONS="--max-old-space-size=300"
COPY apps/backend/package*.json ./apps/backend/
RUN cd apps/backend && npm install --omit=dev --no-audit --no-fund --maxsockets=1

# Copiar dist e schemas do Prisma do Backend
COPY --from=build-back /app/apps/backend/dist ./apps/backend/dist
COPY --from=build-back /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma
COPY apps/backend/prisma ./apps/backend/prisma

# Copiar os arquivos estáticos compilados do Frontend
# O Index.ts apontará exatamente para esta pasta relativa
COPY --from=build-front /app/apps/frontend/dist ./apps/frontend/dist


COPY apps/backend/start.sh ./apps/backend/start.sh
RUN chmod +x ./apps/backend/start.sh


ENV PORT=4001
EXPOSE 4001

# Executa migrações do banco e starta servidor Node que entrega os dois
CMD ["/app/apps/backend/start.sh"]
