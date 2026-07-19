# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) base
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---------------------------------------------------------------------------
# 2) deps
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile --filter @masraf/web...

# ---------------------------------------------------------------------------
# 3) build: derleme zamanı VITE_API_URL build arg olarak alınır (Vite,
# ortam değişkenlerini build anında gömer, çalışma zamanında değiştirilemez).
# ---------------------------------------------------------------------------
FROM deps AS build
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @masraf/web build

# ---------------------------------------------------------------------------
# 4) runtime: statik dosyalar nginx ile, non-root
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --chown=nginx:nginx infrastructure/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
