# Railway: Ghost + MySQL + Bridge

Deploy three services in one Railway project.

## 1. MySQL

1. **+ New → Database → MySQL**
2. Note variable references: `${{MySQL.MYSQLHOST}}`, etc.

## 2. Ghost (custom Resend image)

1. **+ New → Docker Image** → `ghcr.io/beyond925-gmbh/ghost:resend`
2. **Make GHCR package public** (GitHub → Packages → `ghost` → Package settings → Change visibility) so Railway can pull without Pro/private registry credentials
3. **Settings → Source → Configure Auto Updates** → watch `:resend`; use **Anytime** unless you want a maintenance window
4. **Settings → Volume** → mount `/var/lib/ghost/content`
5. **Variables** — copy from [`ghost.env.example`](./ghost.env.example), wire MySQL refs
6. **Networking** → generate domain, set `url=https://<your-domain>`
7. Open `/ghost`, finish setup, create Custom Integration → Admin API key

Railway checks image tags periodically, so a pushed `:resend` image can take a few hours to redeploy. If that delay becomes annoying, add a GitHub Actions step that runs `railway redeploy --service <ghost-service-id>` after the image push.

## 3. HubSpot bridge (cron sync)

Deploy from [Beyond925-GmbH/hubspot-bridge](https://github.com/Beyond925-GmbH/hubspot-bridge) (`Dockerfile` + `railway.toml` with `cronSchedule = "*/15 * * * *"`).

```bash
cd hubspot-bridge
railway link   # ghost-newsletter → hubspot-bridge service
railway up
```

Or run locally before sends: `pnpm sync run`

## Deploy with CLI

The Ghost service is a Railway Docker Image service, not a Railway-built Dockerfile service. From `railway/`:

```bash
railway login
railway init   # or link existing project
```

Create the Ghost service in the dashboard with image `ghcr.io/beyond925-gmbh/ghost:resend`, then use [`deploy.sh`](./deploy.sh) for setup hints.

## Custom domain

1. Add `newsletter.beyond925.de` in Railway Ghost service networking
2. Update Ghost `url` to `https://newsletter.beyond925.de`
3. Complete Resend DNS ([../docs/resend-dns.md](../docs/resend-dns.md))
