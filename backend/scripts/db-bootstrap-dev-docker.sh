#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"

POSTGRES_PASSWORD_VALUE="${POSTGRES_PASSWORD:-simplifica123}"
POSTGRES_USER_VALUE="${POSTGRES_USER:-simplifica}"
POSTGRES_DB_VALUE="${POSTGRES_DB:-simplifica_dev}"
DB_HOST_VALUE="${DB_HOST:-localhost}"
DB_PORT_VALUE="${DB_PORT:-5433}"
OPS_ADMIN_EMAILS_VALUE="${OPS_ADMIN_EMAILS:-}"

DATABASE_URL_VALUE="postgresql://${POSTGRES_USER_VALUE}:${POSTGRES_PASSWORD_VALUE}@${DB_HOST_VALUE}:${DB_PORT_VALUE}/${POSTGRES_DB_VALUE}"

echo "[bootstrap-docker] Iniciando postgres dev via docker compose..."
cd "${DOCKER_DIR}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD_VALUE}" docker compose -f docker-compose.dev.yml up -d postgres

echo "[bootstrap-docker] Aguardando postgres ficar pronto..."
until docker exec simplifica-postgres-dev pg_isready -U "${POSTGRES_USER_VALUE}" >/dev/null 2>&1; do
  sleep 1
done

echo "[bootstrap-docker] Executando bootstrap no backend..."
cd "${BACKEND_DIR}"
DATABASE_URL="${DATABASE_URL_VALUE}" OPS_ADMIN_EMAILS="${OPS_ADMIN_EMAILS_VALUE}" npm run db:bootstrap:dev

echo "[bootstrap-docker] Concluido com sucesso."
