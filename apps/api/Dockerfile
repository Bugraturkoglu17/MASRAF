# ─────────────────────────────────────────────────────────────────────────────
# Aşama 1: Bağımlılıkları kur (workspace symlink'leri dahil)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Workspace manifest'lerini kopyala (önbellek katmanını maksimize eder)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json                 ./apps/api/
COPY packages/shared-types/package.json    ./packages/shared-types/
COPY packages/shared-validation/package.json ./packages/shared-validation/
COPY packages/eslint-config/package.json   ./packages/eslint-config/
COPY packages/tsconfig/package.json        ./packages/tsconfig/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 2: Prisma client üret + TypeScript derle + prod deploy
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Prisma şemasını generate et
RUN pnpm --filter @masraf/api db:generate

# NestJS build
RUN pnpm --filter @masraf/api build

# Üretim bağımlılıklarını izole et (pnpm deploy, workspace symlink'lerini çözer)
RUN pnpm --filter @masraf/api --prod deploy /prod/api

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 3: Üretim imajı (minimal, non-root)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS production

RUN addgroup -S masraf && adduser -S masraf -G masraf

WORKDIR /app

# Üretim node_modules (pnpm deploy çıktısı)
COPY --from=builder /prod/api/node_modules ./node_modules

# Derleme çıktısı
COPY --from=builder /app/apps/api/dist ./dist

# Prisma migration dosyaları (production'da migrate deploy için gerekli)
COPY --from=builder /app/apps/api/prisma ./prisma

RUN chown -R masraf:masraf /app

USER masraf

ENV NODE_ENV=production
ENV APP_ENVIRONMENT=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

CMD ["node", "dist/main.js"]
