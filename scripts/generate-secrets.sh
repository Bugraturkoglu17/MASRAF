#!/usr/bin/env bash
# Masraf Yönetim Sistemi — Güvenli ortam değişkeni üretici
# Kullanım: bash scripts/generate-secrets.sh
# Çıktıyı .env dosyanıza yapıştırın; değerleri değiştirmeyin.

set -euo pipefail

echo "# ── Üretilen Secret Değerleri ($(date -u '+%Y-%m-%dT%H:%M:%SZ')) ──"
echo "# Aşağıdaki değerleri .env dosyanıza yapıştırın."
echo ""
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
echo "COOKIE_SECRET=$(openssl rand -base64 48)"
echo ""
echo "# Northflank Secret Group için şu değerleri kullanın:"
echo "# - JWT_ACCESS_SECRET"
echo "# - JWT_REFRESH_SECRET"
echo "# - COOKIE_SECRET"
echo "# - DATABASE_URL"
echo "# - DIRECT_URL"
echo "# - R2_ACCESS_KEY_ID"
echo "# - R2_SECRET_ACCESS_KEY"
