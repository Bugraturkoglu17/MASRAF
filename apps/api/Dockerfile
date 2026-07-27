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
RUN pnpm --filter @masraf/api --prod deploy /prod/api

# @prisma/client/index.js `require('.prisma/client/default')` yapar — Node bu bare
# specifier'ı kendi *realpath*'inden yukarı arar. pnpm symlink kullandığı için hedef,
# deploy içindeki gerçek @prisma/client dizininin node_modules kardeşi olmalıdır.
RUN set -e; \
    CLIENT=$(find /app/node_modules/.pnpm -maxdepth 5 -path "*/node_modules/.prisma/client" -type d | head -1); \
    REAL=$(realpath /prod/api/node_modules/@prisma/client); \
    DEST=$(dirname "$(dirname "$REAL")"); \
    if [ -z "$CLIENT" ] || [ ! -d "$DEST" ]; then \
      echo "HATA: Prisma generated client veya hedef node_modules bulunamadi"; \
      exit 1; \
    fi; \
    mkdir -p "$DEST/.prisma"; \
    cp -r "$CLIENT" "$DEST/.prisma/client"; \
    node -e "const c=require('/prod/api/node_modules/@prisma/client'); if(!c.PermissionAction) { console.error('DOGRULAMA BASARISIZ: PermissionAction export edilmemis'); process.exit(1); } console.log('Prisma client dogrulandi.')"

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 3: Production imajı
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS production

RUN addgroup -S masraf && adduser -S masraf -G masraf

WORKDIR /app

COPY --from=builder /prod/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

RUN chown -R masraf:masraf /app

USER masraf

ENV NODE_ENV=production
ENV APP_ENVIRONMENT=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

CMD ["node", "dist/main.js"]
