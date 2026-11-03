# Voirtales

A full-stack magazine website and editorial CMS. The layout and information architecture follow a classic glossy-monthly website (lead story with side rails, section showcases, a dark video band, the magazine cover promo, newsletters and subscriptions); the visual identity is Voirtales's own.

- **Public site.** Homepage, six sections, articles, contributors, topics, video, podcasts, magazine issues, newsletters, subscribe and checkout, reader accounts, search, archive, masthead, contact, static pages, sitemap, RSS and a 404 page.
- **Admin panel** at `/admin`. Everything on the site can be edited here: articles (rich-text editor), sections, tags, contributors, issues, videos, podcasts and episodes, pages, the media library, the homepage builder, navigation menus, newsletters and subscribers, plans and subscriptions, readers, the contact inbox, site settings (theme colors, announcement bar, ticker, feature toggles, SEO, footer, social links, cookie banner), users and roles, your profile and the activity log.
- **Stack.** Next.js 16 (App Router, React Server Components and Server Actions), React 19 and TypeScript. Data is stored in SQLite: locally through Node's built-in `node:sqlite`, and in production through Turso (libSQL). Uploads go to the local disk or to Vercel Blob. Rich text uses TipTap.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

On first start, the database (`data/voirtales.db`) is created and filled with a complete demo magazine: 48 stories, 6 print issues, videos, podcasts, newsletters, plans and static pages. Node **22.13 or newer** is required.

| Where | Login |
| --- | --- |
| Admin panel `/admin` | `admin@voirtales.com` / `admin123` (admin) |
| | `editor@voirtales.com` / `editor123` (editor) |
| | `writer@voirtales.com` / `writer123` (writer) |
| Reader account `/account` | `reader@voirtales.com` / `reader123` |

**Change these passwords before deploying** (Admin, then Users / Profile).

Production:

```bash
npm run build && npm start
```

Reset the demo data. This deletes the database; add `-- --uploads` to also delete uploaded files:

```bash
npm run reset
```

## Deploying to Vercel

Vercel's file system is read-only and short-lived, so a production deploy needs two managed services. Both are in the Vercel Marketplace and have free tiers:

1. **Database: Turso (hosted, SQLite-compatible).** In the Vercel project, open **Storage**, then **Create / Connect Database**, choose **Turso**, and connect it to the project. This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Or, with the Turso CLI: `turso db create voirtales`, then `turso db show voirtales --url` and `turso db tokens create voirtales`, and add both values as environment variables.
2. **Uploads: Vercel Blob.** In **Storage**, choose **Create Blob store** and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
3. Optionally set `SITE_URL` (for example `https://voir-magazine.vercel.app`) so canonical links, the sitemap and RSS use your domain.
4. **Redeploy.** On the first request the database schema is created and the demo content is seeded automatically.

Without these variables the site still boots on Vercel, in **demo mode**: each server instance uses its own temporary SQLite copy in `/tmp`. Admin changes and logins are therefore **not persistent and not shared between instances**, and the admin panel shows a warning banner.

Vercel limits request bodies to about 4.5 MB, so keep uploads on Vercel under that size.

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | unset | Use a remote libSQL / Turso database (required for Vercel or any serverless host). `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` also work. |
| `BLOB_READ_WRITE_TOKEN` | unset | Store uploads in Vercel Blob instead of the local disk |
| `DATA_DIR` | `./data` (or `/tmp/voirtales` on Vercel) | Where the local SQLite DB and uploads live (mount a volume here on a VPS or Docker) |
| `DATABASE_PATH` | `$DATA_DIR/voirtales.db` | Custom local DB file path |
| `SITE_URL` | `http://localhost:3000` | Absolute URL used for canonical links, sitemap and RSS |
| `INSECURE_COOKIES` | unset | Set to `1` to allow login over plain HTTP in production builds |

Locally (and on a VPS, Docker, Railway, Render or Fly.io with a persistent disk) no services are needed. The database is a SQLite file read through Node's built-in `node:sqlite`, and uploads are stored in `$DATA_DIR/uploads` and served from `/media/...`.

## Roles

| Capability | Admin | Editor | Writer |
| --- | :-: | :-: | :-: |
| Write and edit own drafts, submit for review, upload media | ✓ | ✓ | ✓ |
| Edit everyone's stories, publish, schedule, feature | ✓ | ✓ | |
| Sections, tags, contributors, issues, video, podcasts, pages | ✓ | ✓ | |
| Homepage builder and navigation | ✓ | ✓ | |
| Newsletters, subscribers, subscriptions, readers, messages | ✓ | ✓ | |
| Site settings and users | ✓ | | |

## Project layout

```
src/
  app/
    (site)/        public website (layout, pages, server actions, site.css)
    admin/         admin panel (login + (panel) route group, admin.css)
    api/           search, load-more, view tracking, admin upload/export
    media/         serves uploaded files
    rss.xml/ sitemap.ts robots.ts
  components/
    site/          header, footer, cards, home blocks, forms, players, effects
    admin/         admin UI components (editor, media picker, …)
  lib/
    db.ts schema.ts settings.ts auth.ts uploads.ts utils.ts html.ts types.ts
    data/          data-access layer (articles, taxonomy, content, site)
    seed/          demo content used to initialise a new database
```

## Features at a glance

- Homepage blocks are configurable: hero (lead story with top-stories rail), the latest river with a sticky rail, section showcases in four layouts (grid, feature, mosaic, carousel), most popular, a dark video band, a magazine-issue promo, a newsletter band, editors' picks, podcasts and topic blocks. Blocks can be reordered and toggled in the admin.
- Articles support three hero layouts (standard, full-bleed overlay, split), a drop cap, pull quotes, figures with captions, a reading-progress bar, share buttons, saving to a reader account, tags, author bios, related and most-popular stories, JSON-LD, Open Graph metadata, scheduled publishing, admin previews of drafts and an optional subscriber paywall teaser.
- Motion: scroll-reveal animations, a sticky compact header that slides in on scroll, a trending ticker, slow-zoom ("Ken Burns") hero images, card hover effects, carousels, a back-to-top button, a full-screen search overlay with live suggestions, and a slide-in menu drawer. All of it respects `prefers-reduced-motion`.
- Analytics: per-article view counts and daily views, used by "Most Popular" and the admin dashboard chart.
- Security: an allowlist HTML sanitizer (sanitize-html) runs when content is saved and again when it is rendered. Passwords are hashed with scrypt, sessions are httpOnly, and changing a password ends the account's other sessions. Login is throttled, permissions are checked on the server for every admin action, and redirects are checked to stay on this site.
- SEO: metadata per page, canonical links, `sitemap.xml`, `robots.txt` and an RSS feed (`/rss.xml?section=hollywood` for a single section).

All people, organisations and events in the demo content are fictional. Placeholder photography loads from picsum.photos and can be replaced from the admin.
