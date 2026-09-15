# Liquid glass verification

## Current revision

Tested with headless Chromium, both desktop-size and emulated mobile viewports.
The preview was loaded directly into the browser document, with remote Inter
font loading blocked to verify the system-font fallback. This environment blocks
browser navigation to local URLs, so these checks are not a claim of a live
hosting test. Generated static documents were additionally rendered without
JavaScript, with their local styles and images embedded for that test.

- 51 browser interaction/content checks passed: main navigation and its glass
  indicator; project and game detail links; breadcrumbs and restored focus;
  next-item navigation; filtered search, keyboard shortcut and Escape dismissal;
  browser back/forward; shelf filters; empty journal; unpublished social links;
  motion reduction; about links; 404 recovery; and no uncaught script errors.
- QA-only journal fixtures verified tags, search reset, escaped text, the future
  article layout, and reading progress. No fixture was written to public content.
- All nine non-home routes were checked at 320, 360, 390, 520, 600, 768, 1024,
  1280 and 1920 CSS pixels: 81 route/width combinations, no detected document
  overflow or non-absolute content extending outside the body.
- All ten routes, including home and 404, were visually captured at 1440x1000
  and 390x844. The remaining widths were geometry checks, not physical devices.
- All eight published non-home content documents showed the correct static
  view with JavaScript disabled. The 404 is generated separately.
- Controlled homepage screenshots at 1440x1000 and 390x844 were pixel-identical
  to the supplied original preview, using the same fixed random seed, reduced
  motion and system font. Returning from Projects also produced identical home
  screenshots at both sizes.
- Original physics and shedding simulation tests passed again, including fixed
  time-step consistency at simulated 60/144/240 Hz and reduced-motion pausing.
  These are solver checks, not measurements of display frame rate.

## Evidence

`tests/interior-interactions.json`, `tests/interior-layouts.json`,
`tests/responsive.json`, `tests/home-preservation.json`,
`tests/source-preservation.json`, `tests/physics-current.json`, and
`tests/shedding-current.json` contain current results.

The prior shader/physics/browser results are retained under
`tests/previous-nocturne/`; they are not newly executed shader tests. This revision
uses the available browser's existing canvas homepage fallback; no new browser
WebGL, Safari, Firefox, physical phone or GPU-performance claims are made.

## Re-run

Build the standalone preview, then use the browser test script with the optional
Playwright development dependency and a Chromium installation available. This is
only for testing; visitors and the static build require neither.

```sh
node tools/build_site.js
python tools/build_preview.py
python tools/test_interiors.py
python tools/test_layout.py
node tools/test_physics.js
node tools/test_nocturne.js
```

Search inputs normally consume Escape to clear their value before closing a
native dialog. The interior-only handler now closes the palette on the first
Escape, even with a query present. It does not change the homepage handler.
