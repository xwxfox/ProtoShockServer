#!/bin/sh
set -e

echo "[entrypoint] Starting container: $HOSTNAME"

# Ensure shared directory exists
mkdir -p /app/shared

# Seed migrations into mounted shared volume if absent
if [ -d /app/shared-drizzle-src ] && [ ! -d /app/shared/drizzle ]; then
  echo "[entrypoint] Seeding drizzle migrations into shared volume..."
  cp -r /app/shared-drizzle-src /app/shared/drizzle || true
fi

exec "$@"
