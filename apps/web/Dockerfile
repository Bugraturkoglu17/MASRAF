# ─────────────────────────────────────────────────────────────────────────────
# Aşama 1: Bağımlılıkları kur
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22.23.1-alpine3.23 AS deps

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
ARG VITE_APP_NAME="Masraf Uygulaması"
ARG VITE_APP_ENVIRONMENT=production
ARG VITE_APP_VERSION=0.1.0
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_ENVIRONMENT=${VITE_APP_ENVIRONMENT}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /app

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm --filter @masraf/web build

# ─────────────────────────────────────────────────────────────────────────────
# Aşama 3: Nginx — PWA dosyalarını sun, /api isteklerini backend'e proxy et
# Non-root kullanıcı ile çalışır.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.28.3-alpine3.23 AS production

# Non-root için Nginx'in yazma ihtiyacı duyduğu dizinleri hazırla
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

COPY infrastructure/nginx/web.conf /etc/nginx/templates/default.conf.template

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

USER nginx

ENV API_INTERNAL_URL=http://api:4000
ENV NGINX_ENVSUBST_FILTER=^API_INTERNAL_URL$

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
