# Beyond925 Ghost + Resend deployment

Self-hosted Ghost fork with **Resend bulk email**, deployed on Railway.

## Image

After CI runs on branch `beyond925-resend`, Railway uses the public GHCR image:

- Moving tag: `ghcr.io/beyond925-gmbh/ghost:resend`
- Immutable audit tag: `ghcr.io/beyond925-gmbh/ghost:sha-<commit-sha>`

Fork: https://github.com/Beyond925-GmbH/ghost (branch `beyond925-resend`)

Railway project: https://railway.com/project/b6b6193e-ed4b-418c-b301-65799e315961

## Railway

See [railway/README.md](../railway/README.md).

Configure the Ghost service as a **Docker Image** that pulls `ghcr.io/beyond925-gmbh/ghost:resend` directly. Do not use overlay images, digest-pinned wrappers, or legacy `:resend-full` tags.

HubSpot sync runs from [hubspot-bridge](https://github.com/Beyond925-GmbH/hubspot-bridge).

## Resend configuration

Ghost env vars (double underscore):

```bash
bulkEmail__provider=resend
bulkEmail__resend__apiKey=re_...

mail__transport=SMTP
mail__options__host=smtp.resend.com
mail__options__port=465
mail__options__secure=true
mail__options__auth__user=resend
mail__options__auth__pass=re_...
mail__from="Team beyond925 <newsletter@beyond925.de>"
```

## DNS

See [resend-dns.md](./resend-dns.md).

## Cutover test

See [cutover-test.md](./cutover-test.md).
