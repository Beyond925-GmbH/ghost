# Railway: Ghost + MySQL + Bridge

Deploy three services in one Railway project.

## 1. MySQL

1. **+ New → Database → MySQL**
2. Note variable references: `${{MySQL.MYSQLHOST}}`, etc.

## 2. Ghost (custom Resend image)

1. **+ New → Docker Image** → `ghcr.io/beyond925-gmbh/ghost:resend`
2. **Make GHCR package public** (GitHub → Packages → `ghost` → Package settings → Change visibility) so Railway can pull without Pro/private registry credentials
3. **Settings → Source → Configure Auto Updates** → watch `:resend`; use **Anytime** unless you want a maintenance window
4. **Settings → Volume** → mount `/home/ghost/content`
5. **Variables** — copy from [`ghost.env.example`](./ghost.env.example), wire MySQL refs
6. **Networking** → generate domain, set `url=https://<your-domain>` (must match the browser URL exactly, e.g. `https://news.beyond925.de`)
7. Open `/ghost`, finish setup, create Custom Integration → Admin API key

The image seeds an empty content volume from `base_content/` on startup (see [`docker-entrypoint.sh`](./docker-entrypoint.sh)). Default themes (`casper`, `source`) are restored automatically; custom themes (e.g. **Wave**) and uploaded images must be reinstalled after a wiped volume.

Railway checks image tags periodically, so a pushed `:resend` image can take a few hours to redeploy. If that delay becomes annoying, add a GitHub Actions step that runs `railway redeploy --service <ghost-service-id>` after the image push.

### Content volume troubleshooting

Symptoms: `active theme "…" is missing`, `ENOENT: scandir '/home/ghost/content/themes/'`, image 404s under `/content/images/`.

**Cause:** Railway volumes mount at runtime and replace the image's `content/` directory. Without seeding, the volume starts empty even though MySQL still references themes and media.

**Automatic fix (new images):** On boot, the entrypoint copies `base_content/` → `content/` when `content/themes/` is missing or empty.

**Manual fix (existing empty volume before redeploy):**

```bash
# Railway Ghost service shell
cp -a /home/ghost/base_content/. /home/ghost/content/
ls /home/ghost/content/themes/   # expect casper, source
```

Then reinstall custom themes via Admin → Design and re-upload site images.

### Auth / login troubleshooting

Symptoms: `POST /ghost/api/admin/session` hangs 20–125s then client aborts (499), or returns 403 on `/users/me/` afterward.

**Cause:** Ghost **awaits SMTP** during login to send a staff device verification code. On Railway Hobby/Trial, outbound SMTP is blocked, so the connection times out (~125s). The misleading cookie/403 errors happen because the session never completes.

**Fix (do all three):**

1. Set `security__staffDeviceVerification=false` in Railway and redeploy.
2. Reset password via shell (see below) — logs show `PASSWORD_INCORRECT` when the password is wrong.
3. Seed content volume and set `active_theme` to `source` if `wave` is missing.

```bash
# Railway Ghost service shell (works on current image via one-liner, or after redeploy via script)
cp -a /home/ghost/base_content/. /home/ghost/content/

node -e "
const mysql=require('mysql2/promise');
const sec=require('@tryghost/security');
(async()=>{
  const email='aaron@beyond925.de';
  const pass='PickASecurePass1!';
  const hash=await sec.password.hash(pass);
  const c=await mysql.createConnection({
    host:process.env.database__connection__host,
    port:Number(process.env.database__connection__port||3306),
    user:process.env.database__connection__user,
    "password":process.env.database__connection__password,
    database:process.env.database__connection__database
  });
  await c.execute(\"UPDATE users SET password=?, status='active' WHERE email=?\",[hash,email]);
  await c.execute('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=?)',[email]);
  await c.execute(\"UPDATE settings SET value='source' WHERE \\\`key\\\`='active_theme'\");
  console.log('done');
  await c.end();
})();
"
```

After redeploy with the new image:

```bash
node scripts/reset-admin-password.js reset aaron@beyond925.de 'YourNewSecurePass1!'
node scripts/reset-admin-password.js set-theme source
```

### Emergency admin password reset (no email required)

When SMTP is blocked and you cannot use forgot-password or login verification codes, reset a password directly in MySQL from the Ghost container:

```bash
# Railway → Ghost service → Shell
node scripts/reset-admin-password.js reset aaron@beyond925.de 'YourNewSecurePass1!'
```

Or create a temporary Administrator if the account does not exist:

```bash
node scripts/reset-admin-password.js create temp-admin@beyond925.de 'YourNewSecurePass1!' "Temp Admin"
```

Requirements:
- Password at least 10 characters; must not contain `password` or `ghost`.
- Set `security__staffDeviceVerification=false` in Railway before logging in.
- Change the password in Admin after login; re-enable device verification once mail works.

Script source: [`scripts/reset-admin-password.js`](./scripts/reset-admin-password.js) (included in the Docker image).

### Post-deploy smoke test

- [ ] Logs show `[entrypoint] Content volume seeded` or `already has themes`
- [ ] `content/themes/` contains at least `casper` and `source`
- [ ] Custom theme (e.g. Wave) installed if DB `active_theme` requires it
- [ ] Admin login works in a private/incognito window
- [ ] Upload a test image, redeploy, confirm image still loads

### Crash troubleshooting

If the Ghost container exits with `RotatingFileStream` errors such as `ENOENT: no such file or directory, rename ...production.log.N`, verify the service uses the logging variables in [`ghost.env.example`](./ghost.env.example). Railway captures stdout/stderr, so Ghost should not use production rotating file logs in this deployment. Repeated `NotFoundError: Page not found` lines are usually 404 noise from probes, bots, or stale URLs; investigate them separately only if a specific route should exist.

## 3. HubSpot bridge (webhook + cron sync)

Deploy from [Beyond925-GmbH/hubspot-bridge](https://github.com/Beyond925-GmbH/hubspot-bridge). Railway service name: **`bridge`**.

- **Default process:** `pnpm serve` — receives Ghost `member.added` webhooks (Ghost signup → HubSpot)
- **Cron:** `pnpm sync run` every 2h, 07:00–20:00 Europe/Berlin — HubSpot lists → Ghost labels

```bash
cd hubspot-bridge
railway link   # ghost-newsletter → bridge service
railway up
```

Bridge env: `HUBSPOT_ACCESS_TOKEN`, `GHOST_ADMIN_URL`, `GHOST_ADMIN_API_KEY`, `GHOST_WEBHOOK_SECRET`.

Ghost env (for private webhook delivery): `security__allowWebhookInternalIPs=true` — see [`ghost.env.example`](./ghost.env.example).

Register in Ghost Admin → Integrations → **Member added** webhook:

```
http://bridge.railway.internal:${{bridge.PORT}}/webhooks/ghost/member-added
```

Set `signup.defaultHubspotListId` in bridge `sync-config.json`. See [hubspot-bridge README](https://github.com/Beyond925-GmbH/hubspot-bridge#ghost-signup--hubspot).

Or run inbound sync locally before sends: `pnpm sync run`

## Deploy with CLI

The Ghost service is a Railway Docker Image service, not a Railway-built Dockerfile service. From `railway/`:

```bash
railway login
railway init   # or link existing project
```

Create the Ghost service in the dashboard with image `ghcr.io/beyond925-gmbh/ghost:resend`, then use [`deploy.sh`](./deploy.sh) for setup hints.

## Custom domain

1. Add your domain (e.g. `news.beyond925.de`) in Railway Ghost service networking
2. Update Ghost `url` to `https://news.beyond925.de` (must match exactly)
3. Complete Resend DNS ([../docs/resend-dns.md](../docs/resend-dns.md))
