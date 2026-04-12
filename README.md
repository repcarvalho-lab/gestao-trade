# TraderOS

Sistema web de gestão de trades para substituição da planilha Excel.
Painel de controle em tempo real para operações de opções binárias com estratégia Martingale.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Banco de dados:** PostgreSQL 16
- **Infra:** Docker + Docker Compose + Nginx

## Ambientes

| Ambiente | Branch | Portas | Comando |
|----------|--------|--------|---------|
| Dev | `develop` | Frontend: 3000, Backend: 4000, DB: 5433 | `docker compose -f docker-compose.dev.yml up` |
| QA | `main` | Nginx: 3001, DB: 5434 | `docker compose -f docker-compose.qa.yml up` |

## Início Rápido (Dev)

```bash
# Subir tudo em Docker
docker compose -f docker-compose.dev.yml up --build

# Rodar migration + seed (primeira vez)
docker exec traderos-backend-dev npx prisma migrate dev
docker exec traderos-backend-dev npx prisma db seed
```

## Desenvolvimento Local (sem Docker para os apps)

```bash
# 1. Subir apenas o banco
docker compose -f docker-compose.dev.yml up postgres-dev

# 2. Backend (outro terminal)
cd apps/backend
cp ../../.env.dev .env.local   # ajustar DATABASE_URL para localhost:5433
npm install
npm run db:migrate
npm run db:seed
npm run dev

# 3. Frontend (outro terminal)
cd apps/frontend
npm install
npm run dev
```

## Estrutura

```
gestao-trade/
├── apps/
│   ├── frontend/     # React 18 + Vite
│   └── backend/      # Node.js + Express + Prisma
├── infra/
│   └── nginx/
├── docker-compose.dev.yml
├── docker-compose.qa.yml
├── .env.dev
└── .env.qa
```

## Credenciais de Acesso (Dev/QA)

- **Email:** re.pcarvalho@gmail.com
- **Senha:** (definida no seed)
