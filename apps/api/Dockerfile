# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) base: pnpm kurulu, ortak temel katman
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---------------------------------------------------------------------------
# 2) deps: yalnızca manifest dosyaları ile bağımlılıkları kur (cache dostu)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile --filter @masraf/api...

# ---------------------------------------------------------------------------
# 3) build: kaynak kodu ekle, Prisma client üret, derle
# ---------------------------------------------------------------------------
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
# @masraf/shared-types ve @masraf/shared-validation ham TypeScript kaynağı
# değil, derlenmiş JS/d.ts (dist/) sunar; apps/api bunlara node_modules
# üzerinden çalışma zamanında (düz `node`, bundler yok) bağımlı olduğu için
# önce onların derlenmesi gerekir.
RUN pnpm --filter @masraf/shared-types build
RUN pnpm --filter @masraf/shared-validation build
RUN pnpm --filter @masraf/api db:generate
RUN pnpm --filter @masraf/api build
RUN pnpm deploy --filter @masraf/api --prod /repo/deploy/api

# ---------------------------------------------------------------------------
# 4) runtime: küçük, non-root, yalnızca üretim bağımlılıkları
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S masraf && adduser -S masraf -G masraf

COPY --from=build /repo/deploy/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json

USER masraf

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:4000/health/live',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
