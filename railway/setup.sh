#!/usr/bin/env bash
# Provision Railway ghost-newsletter stack (MySQL + Ghost + bridge cron).
set -euo pipefail

echo "Ghost newsletter Railway setup"
echo "Project: ghost-newsletter (link with: cd railway && railway link)"
echo ""

if ! railway status >/dev/null 2>&1; then
  echo "Link this directory first:"
  echo "  cd railway && railway link"
  exit 1
fi

echo "1. Add MySQL in Railway dashboard: + New → Database → MySQL"
echo "2. Add Ghost service as Docker Image: ghcr.io/beyond925-gmbh/ghost:resend"
echo "3. Make the GHCR package public and enable Railway Image Auto Updates"
echo "4. Mount volume /var/lib/ghost/content on Ghost service"
echo "5. Set variables from railway/ghost.env.example"
echo "6. Deploy bridge from hubspot-bridge with cron */15 * * * *"
echo ""
echo "Bridge repo: https://github.com/Beyond925-GmbH/hubspot-bridge"
echo "Docs: railway/README.md"
