# ─────────────────────────────────────────────────────────────────────────────
# Aşama 1: Bağımlılıkları kur
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json                 ./apps/api/
COPY packages/shared-types/package.json    ./packages/shared-types/
COPY packages/shared-validation/package.json ./packages/shared-validation/
COPY packages/eslint-config/package.json   ./packages/eslint-config/
COPY packages/tsconfig/package.json        ./packages/tsconfig/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 2: Build
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @masraf/shared-types build && pnpm --filter @masraf/shared-validation build
RUN pnpm --filter @masraf/api db:generate
RUN pnpm --filter @masraf/api build

# `pnpm deploy --prod` izole bir node_modules üretir, ancak @prisma/client'ın
# `require('.prisma/client/default')` çağrısı generate edilmiş client'a ulaşamaz.
# Bu yüzden builder ağacı olduğu gibi taşınır; generate'in yazdığı yapı korunur.
RUN node -e "const c=require('@prisma/client'); if(!c.PermissionAction) { console.error('DOGRULAMA BASARISIZ: Prisma enum export edilmemis'); process.exit(1); } console.log('Prisma client dogrulandi.')"

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 3: Production imajı
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS production

RUN addgroup -S masraf && adduser -S masraf -G masraf

# Symlink yapısı pnpm için kritik: ağaç bir bütün olarak kopyalanır.
COPY --from=builder /app /app

RUN chown -R masraf:masraf /app

WORKDIR /app/apps/api

USER masraf

ENV NODE_ENV=production
ENV APP_ENVIRONMENT=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

CMD ["node", "dist/main.js"]
