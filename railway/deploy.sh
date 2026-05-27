#!/usr/bin/env bash
# Railway deployment helper for Ghost + Resend stack.
# Requires: railway CLI logged in, GHCR image published.
set -euo pipefail

echo "Beyond925 Ghost + Resend — Railway deploy helper"
echo ""
echo "Manual steps (Railway dashboard):"
echo "  1. Create project"
echo "  2. Add MySQL database"
echo "  3. Add Ghost service: ghcr.io/beyond925-gmbh/ghost:resend"
echo "  4. Ensure the GHCR package is public"
echo "  5. Enable Image Auto Updates for the :resend tag"
echo "  6. Mount volume at /var/lib/ghost/content"
echo "  7. Set variables from railway/ghost.env.example"
echo "  8. Add RESEND_API_KEY secret"
echo "  9. Generate domain, set url=https://..."
echo " 10. Deploy bridge from hubspot-bridge (cron sync)"
echo ""
echo "Docs: railway/README.md"
echo "DNS:  docs/resend-dns.md"

if command -v railway >/dev/null 2>&1; then
  railway whoami || true
fi
