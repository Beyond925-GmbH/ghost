#!/bin/sh
set -eu

CONTENT_DIR="/home/ghost/content"
SEED_DIR="/home/ghost/base_content"
THEMES_DIR="${CONTENT_DIR}/themes"

# Railway mounts a volume at /home/ghost/content at runtime, which hides the
# image-baked content tree. Seed default themes and content scaffolding when
# the volume is empty (first deploy or wiped volume).
if [ ! -d "${THEMES_DIR}" ] || [ -z "$(ls -A "${THEMES_DIR}" 2>/dev/null || true)" ]; then
    echo "[entrypoint] Seeding content volume from base_content..."
    mkdir -p "${CONTENT_DIR}"
    cp -a "${SEED_DIR}/." "${CONTENT_DIR}/"
    echo "[entrypoint] Content volume seeded (themes: $(ls "${THEMES_DIR}" 2>/dev/null | tr '\n' ' '))"
else
    echo "[entrypoint] Content volume already has themes, skipping seed."
fi

exec "$@"
