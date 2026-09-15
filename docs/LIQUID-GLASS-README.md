# rebuub / Liquid glass

A redesign of the Nocturne interior pages. The homepage retains its original
appearance, rain, metallic spheres, lettering, interaction code and atmosphere.

## Open the site

The separately supplied `rebuub-liquid-glass-preview.html` is a standalone file:
open it in a browser. Its images, CSS and scripts are embedded. No installation
is required. The optional Inter stylesheet falls back to a system font offline.
No font files are packaged.

For the full source folder, open `index.html` with all assets beside it, or run:

```sh
python tools/serve.py
```

Then open `http://127.0.0.1:8000`. The local server supports `/projects`,
`/journal`, `/shelf`, `/about`, and individual item addresses. The included Vercel
configuration maps the same routes when deployed. No deployment has been made
by this revision.

## What changed

Projects is an asymmetrical display gallery with transparent framing, a browser
study and a droplet study. Journal is a split notebook layout with layered glass
pages; it still contains no published entries. The shelf uses cinematic original
cover studies and inset glass captions. About uses a layered identity object,
the existing introduction, and routes into the work and collection.

Individual project pages, game pages, future journal-entry layouts, search and
the 404 page share the new material but have their own compositions. Interior
navigation is a glass capsule with a sliding selected-page lens. Breadcrumbs,
next-item links, search, keyboard focus and motion reduction remain available.

The material uses translucent fills, backdrop blur, layered specular rims,
optical-style lenses, and pointer-position highlights. It is an art-directed
CSS treatment, not a physically accurate glass simulation. Unsupported backdrop
filters fall back to more solid, readable surfaces. Reduced-motion and
reduced-transparency preferences have dedicated styles.

## Edit and rebuild

- `site-config.js`: the original editable content, unchanged by the redesign.
- `interiors.css`: the new interior visual system and responsive layouts.
- `interiors.js`: interior navigation lens, light response, and search dismissal.
- `content.js`: escaped collection and detail markup.
- `tools/template.html`: page structure.
- `styles.css` and all original homepage renderer/interaction scripts: unchanged.

```sh
node tools/build_site.js
python tools/build_preview.py
```

The first command regenerates the static routes and Vercel configuration. The
second writes the standalone preview beside the source folder. Rebuild both
after changing content or layout. There are no runtime package dependencies.

Journal fixtures used for testing are not published. Empty social links and the
unconfigured Spotify player remain hidden. The game covers are original abstract
studies, not official promotional artwork. Existing public text has been retained;
no personal biography, contacts, ratings, or publication history were invented.

## Verification

See `TESTING.md` for this revision's results. The prior Nocturne notes and test
outputs are archived in `docs/` and `tests/previous-nocturne/` respectively.
