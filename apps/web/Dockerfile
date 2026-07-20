# ─────────────────────────────────────────────────────────────────────────────
# Aşama 1: Bağımlılıkları kur
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json                   ./apps/web/
COPY packages/shared-types/package.json      ./packages/shared-types/
COPY packages/shared-validation/package.json ./packages/shared-validation/
COPY packages/eslint-config/package.json     ./packages/eslint-config/
COPY packages/tsconfig/package.json          ./packages/tsconfig/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 2: Vite build
# VITE_API_URL build-time ARG olarak alınır; tarayıcıya gömülür.
# Northflank'te bu değer Build Arguments olarak verilir.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

# Northflank / Prod: VITE_API_URL=/api/v1 (relative — Nginx proxy üzerinden)
# Lokal dev: VITE_API_URL=http://localhost:4000/api/v1
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm --filter @masraf/web build

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 3: Nginx — PWA dosyalarını sun, /api isteklerini backend'e proxy et
# Non-root kullanıcı ile çalışır.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Non-root için Nginx'in yazma ihtiyacı duyduğu dizinleri hazırla
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

COPY infrastructure/nginx/web.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
