# rebuub / Home + sitewide liquid glass

Home now uses the same material system as the interior pages. Its navigation
capsule, active-page lens and search control no longer fall back to the old
plain treatment. The name keeps its original unboxed treatment and position. Repeated bottom
shortcuts are removed: the homepage project link, section-end navigation,
About shortcuts, and detail-page next/back rows. Main navigation, search,
content cards, top breadcrumbs, and the 404 recovery link are retained. The footer motion
button has one shared glass style on every page.

The lettering, rain, spheres, shaders, physics, interaction source and original
artwork assets are unchanged. Content and interior compositions are unchanged.
The journal remains empty, and no biography, links or publication history were added.

## Open

Open `rebuub-clean-preview.html`, supplied alongside this ZIP. All styles,
scripts and artwork are embedded. No installation is needed. The optional remote
Inter stylesheet falls back to the system-font stack offline. No font files are
included. This new preview replaces the earlier file; old copies do not update.

For the source version, extract the folder and open `index.html`, or run:

```sh
python tools/serve.py
```

Then open `http://127.0.0.1:8000`. The local server and included Vercel configuration
support the clean routes. This package has not been deployed.

## Edit and rebuild

`site-config.js` supplies content. `interiors.css` holds the shared material,
typography, responsive and accessibility rules; these now include Home.
`tools/template.html` is the markup source; `content.js` creates content sections.
`interiors.js` positions the navigation lens and handles the surface highlights.
The original `styles.css`, scene and physics files have not been edited.
The removed bottom navigation is absent from both static and dynamic templates,
so rebuilding or moving between pages will not restore it.

```sh
node tools/build_site.js
python tools/build_preview.py
```

Only the generated `index.html` includes the homepage scene scripts. Other pages
load them on demand when a visitor goes Home. `siteUrl` in `site-config.js`
drives canonical links, share-preview URLs, `sitemap.xml` and `robots.txt`; the
build skips all four if it is empty. The share image is `assets/og-image.png`.
The social links in `site-config.js` are samples until replaced.

The preview is written one directory above the source folder. An optional first
argument sets a different destination. Rebuild static pages and the preview after
editing. Visitors and the build scripts need no package dependencies.

See `DESIGN-SYSTEM.md` and `TESTING.md`. Earlier verification is archived under
`tests/previous-consistency/`, `tests/previous-liquid-glass/` and `docs/`.
