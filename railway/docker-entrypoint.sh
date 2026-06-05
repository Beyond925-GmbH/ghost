#!/bin/sh
set -eu

CONTENT_DIR="/home/ghost/content"
SEED_DIR="/home/ghost/base_content"
THEMES_DIR="${CONTENT_DIR}/themes"
ADAPTERS_DIR="${CONTENT_DIR}/adapters"

# Railway mounts a volume at /home/ghost/content at runtime, which hides the
# image-baked content tree. Seed default themes and content scaffolding when
# the volume is empty (first deploy or wiped volume).
if [ ! -d "${THEMES_DIR}" ] || [ -z "$(ls -A "${THEMES_DIR}" 2>/dev/null || true)" ]; then
    echo "[entrypoint] Seeding content volume from base_content..."
    mkdir -p "${CONTENT_DIR}"
    cp -a "${SEED_DIR}/." "${CONTENT_DIR}/"
    echo "[entrypoint] Content volume seeded (themes: $(ls "${THEMES_DIR}" 2>/dev/null | tr '\n' ' '))"
else
    echo "[entrypoint] Content volume already has themes, skipping full seed."
fi

# Self-heal existing (non-empty) volumes that predate the storage adapter or the
# baked Wave theme. These restores are idempotent and never delete user data:
#   - The S3 storage adapter shim must always be present so image uploads keep
#     working independent of the volume.
#   - Bundled themes (casper, source, wave) must always exist on disk so the DB's
#     active_theme can never point at a missing theme directory.
if [ -d "${SEED_DIR}/adapters" ]; then
    echo "[entrypoint] Restoring bundled adapters into content volume..."
    mkdir -p "${ADAPTERS_DIR}"
    cp -a "${SEED_DIR}/adapters/." "${ADAPTERS_DIR}/"
fi

for theme in casper source wave solo; do
    if [ -d "${SEED_DIR}/themes/${theme}" ] && [ ! -d "${THEMES_DIR}/${theme}" ]; then
        echo "[entrypoint] Restoring missing bundled theme: ${theme}"
        mkdir -p "${THEMES_DIR}"
        cp -a "${SEED_DIR}/themes/${theme}" "${THEMES_DIR}/"
    fi
done

exec "$@"
