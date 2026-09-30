#!/usr/bin/env bash
# Despliega la copia local del repo en la VPS y reconstruye los contenedores (ADR-003).
# Uso, desde la raíz del repo:  infra/deploy.sh
# Requiere el alias SSH "instanta" y un /opt/instanta/.env en la VPS (ver .env.example).
set -euo pipefail

rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude '.env*' \
  --exclude .cursor --exclude .claude \
  ./ instanta:/opt/instanta/

ssh instanta 'cd /opt/instanta && docker compose --profile deploy up -d --build --remove-orphans && docker image prune -f >/dev/null'
curl -fsS "https://instanta.scuda.es/v1/health" && echo
