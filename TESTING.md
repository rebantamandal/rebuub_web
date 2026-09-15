# Bottom-navigation cleanup verification

This revision removes the homepage View projects link, the four section-end
Explore next rows, the About page shortcuts, and the repeated next/back rows
below project, shelf, and journal details. These elements are removed from the
shared templates, not just hidden in CSS.

Main navigation, content cards, top breadcrumbs, search, the 404 recovery action,
and the footer motion control remain. The unboxed homepage name keeps its
original position. Interior pages use the existing section-gap token for space
before the footer now that the bottom navigation rows are gone.

## Current verification

204 checks passed in Chromium using the self-contained preview with remote
requests blocked. Widths: 320, 390, 768, and 1440 pixels. Checks cover all existing
routes, removal from every generated static HTML page, horizontal overflow,
footer spacing, header navigation, project and shelf cards, search, top back
links, 404 recovery, motion toggles, keyboard sphere interaction, touch navigation,
and absence of uncaught script errors. Name position was compared against the
preceding preview at all four widths. Desktop and mobile screenshots were
reviewed for the cleanup.

The dynamic rendering test for future journal entries uses a temporary fixture;
it is not added to site-config.js or to the delivered pages.

```sh
python tools/test_bottom_navigation.py ../rebuub-clean-preview.html
```

An optional second file argument compares the name position against an older
preview. Add `--screenshots` to save screenshots. Playwright and Chromium are
optional development dependencies; the website itself has no dependencies.
Results: `tests/bottom-navigation.json` and `tests/cleanup-source-preservation.json`.

## Scope

The embedded document was loaded into Chromium with Playwright set_content.
Direct file and localhost navigations are blocked by this environment's browser
policy, so generated static pages were parsed for the removed elements rather
than loaded by URL. This is not a new Safari, Firefox, deployment, or live-host
verification. Tests used offline system fonts. All older reports are historical.
Older test scripts that targeted the deleted shortcuts are preserved under docs.
