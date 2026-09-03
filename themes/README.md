# Beyond925 Ghost themes

Custom themes for [news.beyond925.de](https://news.beyond925.de), aligned with the Beyond925 marketing design system and Ghost platform features (Portal, search, announcement bar, members, comments, archives).

## Variants

| Folder | Zip | Notes |
|--------|-----|--------|
| `beyond925-newsletter/` | older clean variant | Cream hero |
| `beyond925-newsletter-video/` | `~/Downloads/beyond925-newsletter-video-v1.4.zip` | **Current** — video hero + full Ghost feature support |

## Ghost features (video theme)

These work through Ghost Admin + theme hooks (no second-class fork):

| Feature | Where |
|---------|--------|
| Announcement bar | Settings → Announcement bar (auto via `ghost_head`) |
| Primary navigation | Settings → Navigation (header) |
| Secondary navigation | Settings → Navigation secondary (footer) |
| Members / Portal | Header Anmelden/Abonnieren/Konto + signup forms |
| Search | Header search button (`data-ghost-search`) |
| Comments | Post pages when comments enabled |
| Tag / author archives | `tag.hbs` / `author.hbs` |
| 404 / errors | `error-404.hbs` / `error.hbs` |
| Newsletter signup | Members form + Portal |

## Navigation setup

**Primary** (header): Artikel, Website, custom pages…  
**Secondary** (footer): Website, LinkedIn, Impressum (`https://docs.beyond925.de/impressum`), Datenschutz (`https://docs.beyond925.de/landing-datenschutz`)

## Upload

```bash
cd beyond925-newsletter-video
zip -r ~/Downloads/beyond925-custom-v1.4.zip \
  assets partials default.hbs home.hbs index.hbs page.hbs post.hbs \
  tag.hbs author.hbs error.hbs error-404.hbs package.json
```

## Theme settings

- `consultation_url` — e.g. `https://beyond925.de/call` (hero + dark CTA band, not in nav)
- `portrait_one_image` / `portrait_two_image` — optional founder photo overrides
