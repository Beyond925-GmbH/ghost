# Resend DNS for newsletter.beyond925.de

Verify your sending domain in the [Resend dashboard](https://resend.com/domains) before production sends.

## Checklist

- [ ] Add domain `beyond925.de` (or subdomain `newsletter.beyond925.de`) in Resend
- [ ] Add **SPF** TXT record Resend provides
- [ ] Add **DKIM** CNAME/TXT records Resend provides
- [ ] Add **DMARC** TXT record (start with `p=none` for monitoring, tighten later)
- [ ] Wait for Resend status: **Verified**
- [ ] Set `mail__from` to an address on the verified domain (e.g. `newsletter@beyond925.de`)

## Verify

```bash
dig TXT beyond925.de +short
dig TXT _dmarc.beyond925.de +short
# DKIM: check Resend dashboard for selector name
```

## Railway Ghost env

Once verified, set on the Ghost Railway service:

```
mail__from=Team beyond925 <newsletter@beyond925.de>
bulkEmail__provider=resend
bulkEmail__resend__apiKey=<from Railway secrets>
```

Send a test from Ghost Admin → Settings → Email → Send test, then a 2–3 recipient newsletter segment.
