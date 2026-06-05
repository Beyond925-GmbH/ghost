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

The image seeds an empty content volume from `base_content/` on startup (see [`docker-entrypoint.sh`](./docker-entrypoint.sh)). The bundled themes (`casper`, `source`, `wave`) and the `s3` storage adapter are baked into the image, so they are restored automatically on every boot — even on a wiped or recreated volume. Uploaded images are stored in a **Railway Bucket** (see [Image storage (Railway Bucket)](#image-storage-railway-bucket)), so they live outside the volume entirely and survive any redeploy. Nothing irreplaceable depends on the content volume anymore.

Railway checks image tags periodically, so a pushed `:resend` image can take a few hours to redeploy. If that delay becomes annoying, add a GitHub Actions step that runs `railway redeploy --service <ghost-service-id>` after the image push.

### Image storage (Railway Bucket)

Uploaded images, media, and files are stored in a **Railway Bucket** (S3-compatible object storage) instead of the Railway content volume. This is the key durability fix: object storage has its own lifecycle, so images can never be lost when the volume is wiped, recreated, or the service is rebuilt. (Any S3-compatible store works with the same adapter — e.g. Cloudflare R2, which has a built-in public URL.)

The `s3` storage adapter ([`ghost-storage-adapter-s3`](https://github.com/colinmeinke/ghost-storage-adapter-s3)) is installed into the image and exposed via the committed shim at `ghost/core/content/adapters/storage/s3/`, so it is always available regardless of volume state.

**Important:** Railway Buckets are **private** — there is no public bucket URL. Uploads work, but Ghost can't render images to visitors until a small public-serving service sits in front of the bucket (below).

**Railway setup:**

1. **+ New → Bucket** — create the bucket service (choose a region; it can't be changed later). Credentials appear under its **Credentials** tab (`ENDPOINT`, `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION`).
2. **+ New → Template → "Public Bucket URLs"** (or deploy [railway.com/deploy/public-bucket-urls](https://railway.com/deploy/public-bucket-urls)). Point its bucket variable references at the bucket from step 1, deploy it, and **generate a domain** for it under its Networking settings. This service redirects each request to a short-lived presigned URL, giving stable public links without public-egress charges.
3. On the **Ghost** service, set the `storage__*` variables from [`ghost.env.example`](./ghost.env.example). Wire the credentials as references to the Bucket service (e.g. `${{Bucket.ACCESS_KEY_ID}}`) and set `storage__s3__assetHost` to the domain from step 2. Keep `storage__s3__forcePathStyle=false` (Railway uses virtual-hosted-style URLs).
4. Redeploy. New uploads write to the bucket; images are served via `assetHost` → presigned redirect → bucket.

**Migrating images that still exist on the old volume:** copy them into the bucket preserving their key paths so existing post URLs keep working after `assetHost` is switched:

```bash
# Example with rclone (configure a remote from the Bucket's Credentials tab;
# endpoint https://storage.railway.app, virtual-hosted style)
rclone copy /home/ghost/content/images <remote>:<bucket>/ --progress
```

Already-lost images (from prior volume wipes) are not recoverable without a backup and must be re-uploaded.

### Content volume troubleshooting

Symptoms: `active theme "…" is missing`, `ENOENT: scandir '/home/ghost/content/themes/'`, image 404s under `/content/images/`.

**Cause:** Railway volumes mount at runtime and overlay the image's baked `content/` directory. A freshly created/empty volume therefore hides the baked themes and adapters until they are seeded. (Images are unaffected now that they live in the Railway Bucket.)

**Automatic fix (current images):** On boot, the entrypoint seeds `base_content/` → `content/` when `content/themes/` is empty, and additionally self-heals existing volumes by restoring the bundled adapters and any missing bundled themes (`casper`, `source`, `wave`) — never deleting user data.

**Manual fix (force a reseed):**

```bash
# Railway Ghost service shell
cp -a /home/ghost/base_content/. /home/ghost/content/
ls /home/ghost/content/themes/             # expect casper, source, wave
ls /home/ghost/content/adapters/storage/   # expect s3
```

### Auth / login troubleshooting

Symptoms: `POST /ghost/api/admin/session` hangs 20–125s then client aborts (499), or returns 403 on `/users/me/` afterward.

**Cause:** Ghost **awaits SMTP** during login to send a staff device verification code. On Railway Hobby/Trial, outbound SMTP is blocked, so the connection times out (~125s). The misleading cookie/403 errors happen because the session never completes.

**Fix (do all three):**

1. Set `security__staffDeviceVerification=false` in Railway and redeploy.
2. Reset password via shell (see below) — logs show `PASSWORD_INCORRECT` when the password is wrong.
3. Themes (`casper`, `source`, `wave`) are bundled and self-healed on boot, so `active_theme` no longer needs a fallback. If a theme dir is somehow missing, force a reseed (see [Content volume troubleshooting](#content-volume-troubleshooting)).

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
- [ ] `content/themes/` contains `casper`, `source`, and `wave`
- [ ] `content/adapters/storage/` contains `s3`
- [ ] Admin login works in a private/incognito window
- [ ] Upload a test image — its URL points at the `assetHost` domain and the object appears in the Railway Bucket
- [ ] Redeploy, confirm the uploaded image still loads (proves bucket independence from the volume)

### Crash troubleshooting

If the Ghost container exits with `RotatingFileStream` errors such as `ENOENT: no such file or directory, rename ...production.log.N`, verify the service uses the logging variables in [`ghost.env.example`](./ghost.env.example). Railway captures stdout/stderr, so Ghost should not use production rotating file logs in this deployment. Repeated `NotFoundError: Page not found` lines are usually 404 noise from probes, bots, or stale URLs; investigate them separately only if a specific route should exist.

## 3. HubSpot bridge (two Railway services)

Deploy from [Beyond925-GmbH/hubspot-bridge](https://github.com/Beyond925-GmbH/hubspot-bridge). Railway cannot run webhooks and cron on one service — use **two** services from the same repo:

| Service | Role | Start command |
|---------|------|---------------|
| **hsbridge** | Ghost webhooks (always-on) | `pnpm exec tsx src/cli.ts serve` |
| **hsbridge-cron** | HubSpot → Ghost inbound sync | `pnpm exec tsx src/cli.ts sync run` |

Private mesh hostname: `hsbridge.railway.internal` (port **8080** on hsbridge).

```bash
cd hubspot-bridge
railway link   # ghost-newsletter → hsbridge service
railway up
```

**hsbridge** env: `PORT=8080`, `HOST=0.0.0.0`, `HUBSPOT_ACCESS_TOKEN`, `GHOST_ADMIN_URL`, `GHOST_ADMIN_API_KEY`, `GHOST_WEBHOOK_SECRET`.

**hsbridge-cron** env: reference hsbridge vars (`${{hsbridge.HUBSPOT_ACCESS_TOKEN}}`, etc.). Cron schedule: `0 5,7,9,11,13,15,17,18 * * *` UTC.

Ghost env (for private webhook delivery): `security__allowWebhookInternalIPs=true` — see [`ghost.env.example`](./ghost.env.example).

Register in Ghost Admin → Integrations → **Member added** and **Member edited** webhooks (literal port — Ghost Admin does not resolve Railway vars):

```
http://hsbridge.railway.internal:8080/webhooks/ghost/member-added
http://hsbridge.railway.internal:8080/webhooks/ghost/member-edited
```

Synced lists (see bridge `sync-config.json`): **Newsletter Subs (36)**, **Aaron's test segment (31)**. Label add/remove in Ghost syncs to HubSpot via webhook; cron prunes labels when contacts leave HubSpot lists.

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
