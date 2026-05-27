# Cutover checklist: HubSpot send → Ghost → Resend

## Prerequisites

- [ ] GHCR image published: `ghcr.io/beyond925-gmbh/ghost:resend`
- [ ] GHCR package visibility is public
- [ ] Railway Ghost service source is Docker Image `ghcr.io/beyond925-gmbh/ghost:resend`
- [ ] Railway Image Auto Updates enabled for the `:resend` tag
- [ ] Ghost Railway service running with MySQL + volume
- [ ] `RESEND_API_KEY` set on Ghost service (shared variable)
- [ ] Resend domain verified — see [resend-dns.md](./resend-dns.md)
- [ ] HubSpot bridge deployed with `HUBSPOT_ACCESS_TOKEN`, `GHOST_ADMIN_URL`, and `GHOST_ADMIN_API_KEY`

## Test send (small segment)

Use the [hubspot-bridge](https://github.com/Beyond925-GmbH/hubspot-bridge) repo:

```bash
# 1. Sync test list
pnpm sync run --lists "Aaron's fanatisches Testsegment"

# 2. Dry run
pnpm send --post-id <ghost-post-id> \
  --list "Aaron's fanatisches Testsegment" \
  --provider ghost --dry-run

# 3. Send
./scripts/send-test.sh <ghost-post-id> "Aaron's fanatisches Testsegment"
```

## Verify

- Ghost Admin → Posts → email status `submitted` / `delivered`
- Resend dashboard → Emails → delivery logs
- Inbox: styling uses Ghost email theme (not raw HubSpot HTML)

## Deprecate HubSpot send

Once validated, stop using:

```bash
pnpm send ... --provider hubspot
```

HubSpot remains CRM-only (lists + contacts). Optional follow-up: Resend webhooks → HubSpot contact properties for bounces/unsubs.
