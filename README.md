# rebuub

![rebuub: the wordmark with two metallic spheres on a dark background](assets/og-image.png)

The personal website of Rebanta Mandal: projects, a journal, and a shelf of
favourite games. The homepage is a real-time scene. Metallic spheres float in
front of and behind the lettering, change shape when the pointer comes near, and
break into beads when clicked.

It is a static site written in plain HTML, CSS and JavaScript. There is no
framework, no bundler, and nothing to install for visitors or for the build.

## Features

- **Interactive homepage.** WebGL and Canvas 2D render the spheres, droplets,
  lettering and occasional lightning. It works with a pointer, touch, or the
  keyboard: arrow keys pick a sphere and Enter pops it.
- **Fast inner pages.** Only the homepage loads the scene code. Other pages
  fetch it when a visitor heads Home.
- **Proper URLs.** Each project, journal entry and shelf item gets its own
  static page and clean address (for example `/projects/glass`). Moving between
  pages works like a single-page app.
- **Site search.** Press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd>.
- **Accessible.** It has a skip link, visible focus styles, and screen-reader
  announcements. It respects `prefers-reduced-motion`, and a footer toggle
  pauses all motion.
- **Easy to share and find.** Every page has share-preview tags. The build also
  produces canonical links, structured data, `sitemap.xml` and `robots.txt`.
- **Private by default.** There are no analytics, no trackers, and no
  third-party scripts. The Spotify player loads only after a click.

## Run it locally

Opening `index.html` directly in a browser works.

For clean URLs like `/about`, use the included server, which needs Python 3.9 or later:

```sh
python tools/serve.py        # http://127.0.0.1:8000
```

## Edit content

All content is in [`site-config.js`](site-config.js): name, about text, social
links, projects, journal entries and shelf items. A new entry's `id` becomes its
permanent URL. After editing, rebuild the static pages:

```sh
node tools/build_site.js
```

The build regenerates `index.html`, `404.html`, everything in `pages/`,
`vercel.json`, `sitemap.xml` and `robots.txt`. **Don't edit those files by
hand.** Change [`tools/template.html`](tools/template.html) or the config and
rebuild instead.

Two settings to check before publishing:

- `siteUrl` must be the site's real public address. Canonical links, share
  images and the sitemap are built from it. If it is empty, the build skips
  them.
- `socials`: an empty `url` hides that link.

## Deploy

The repository deploys to [Vercel](https://vercel.com) as it is. `vercel.json`
runs the build, sets up clean-URL rewrites and redirects, and adds security
headers. Any other static host will also work, as long as it can rewrite `/about`
to `/pages/about.html`.

## Project layout

| Path | What it is |
| --- | --- |
| `site-config.js` | All site content |
| `content.js` | Escaped HTML templates, shared by the browser and the build |
| `app.js` | Routing, search, filters, metadata, on-demand scene loading |
| `interiors.js` | Navigation lens and glass-surface highlights |
| `atmosphere.js` | The slowly shifting background shared by every page |
| `scene.js`, `spheres.js`, `sculpture.js`, `optics.js`, `wordmark.js`, `interaction.js` | The homepage scene and its input handling |
| `styles.css`, `interiors.css` | Base styles; shared glass material, type scale and layout tokens |
| `tools/template.html` | Markup source for every generated page |
| `tools/build_site.js` | Static page, sitemap and `vercel.json` generator |
| `tools/build_preview.py` | Builds a single self-contained preview HTML file |
| `assets/` | Artwork, wordmark and the share image |

Design tokens and material rules are documented in
[`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

## Tests

```sh
node tools/test_physics.js     # sphere and droplet physics
node tools/test_nocturne.js    # renderer state and motion behaviour
```

Browser tests in `tools/test_*.py` need Python with Playwright and Chromium.
[`TESTING.md`](TESTING.md) explains how to run them.
