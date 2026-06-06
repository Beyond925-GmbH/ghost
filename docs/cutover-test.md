# Cutover checklist: HubSpot send → Ghost → Resend

## Prerequisites

- [ ] GHCR image published: `ghcr.io/beyond925-gmbh/ghost:resend`
- [ ] GHCR package visibility is public
- [ ] Railway Ghost service source is Docker Image `ghcr.io/beyond925-gmbh/ghost:resend`
- [ ] Railway Image Auto Updates enabled for the `:resend` tag
- [ ] Ghost Railway service running with MySQL + volume at `/home/ghost/content`
- [ ] Ghost `url` matches live domain (`https://news.beyond925.de`)
- [ ] Admin login works (incognito); transactional mail delivers if device verification enabled
- [ ] `RESEND_API_KEY` set on Ghost service (shared variable)
- [ ] Resend domain verified — see [resend-dns.md](./resend-dns.md)
- [ ] HubSpot bridge deployed with `HUBSPOT_ACCESS_TOKEN`, `GHOST_ADMIN_URL`, `GHOST_ADMIN_API_KEY`, and `GHOST_WEBHOOK_SECRET`
- [ ] HubSpot Private App has write scopes: `crm.objects.contacts.write`, `crm.lists.write`
- [ ] Bridge `sync-config.json` includes `signup.defaultHubspotListId`
- [ ] Ghost `security__allowWebhookInternalIPs=true` (private mesh webhooks to `bridge`)
- [ ] Ghost `member.added` + `member.edited` webhooks → bridge private mesh URLs

## Test signup sync (Ghost → HubSpot)

1. Complete a test signup on the live Ghost site (Portal or signup embed).
2. HubSpot → Contacts: verify new contact by email.
3. Verify contact is on the default HubSpot list (or override list if signup used a label).
4. Ghost Admin → member has label `HS: Newsletter Subs` and note `hubspot:<contactId>`

## Test label sync (Ghost ↔ HubSpot)

1. Add label `Aaron's fanatisches Testsegment` to a member in Ghost Admin
2. HubSpot → contact added to list 31
3. Remove label in Ghost → contact removed from list 31
4. Remove contact from HubSpot list 36 → next cron run removes `HS: Newsletter Subs` label in Ghost

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
