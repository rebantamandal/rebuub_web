# Final consistency verification

## Executed for this revision

All browser checks used headless Chromium with the supplied preview embedded
into a document. Remote Inter loading was blocked to test the existing offline
font fallback. Mobile dimensions are emulated viewports, not physical devices.

- **80 consistency checks passed.** Section heading sizes, label typography and
  vertical alignment match at 320, 390, 600, 768, 1024, 1440 and 1920px. Interior
  navigation and search controls meet the shared 44px height. All navigation
  labels stay inside the capsule. Gallery and shelf title styling matches.
- **51 interaction/content checks passed.** These cover navigation, selected-page
  lens, project/game detail links, return focus, next links, search and keyboard
  shortcut, filtering, history, original content, empty journal, 404 recovery,
  motion reduction and uncaught JavaScript errors. Eight generated content
  documents were also rendered without JavaScript.
- **81 responsive checks passed.** Nine non-home routes were tested at 320, 360,
  390, 520, 600, 768, 1024, 1280 and 1920px. No document overflow or out-of-bounds
  non-absolute interior content was detected. Navigation has its own boundary
  checks in the consistency suite.
- **Homepage comparison passed.** Fixed-seed, reduced-motion screenshots at
  1440x1000 and 390x844 are pixel-identical to the supplied liquid-glass preview.
  Returning from Projects preserves the same homepage image at both sizes.
  The comparison covers the closed-overlay home state; the shared search
  palette was intentionally standardized on all routes.
- **Source preservation passed.** The original homepage section markup,
  `styles.css`, content configuration, renderer/physics/interaction source and
  all original artwork assets are unchanged. SHA-256 evidence is included.
- **Original simulation tests passed again.** The physics and droplet-shedding
  scripts completed successfully. These are numerical simulation checks, not
  display-frame-rate or physical-GPU measurements.

Search has the same computed material and geometry across the main routes.
All tested routes close search on the first Escape, return focus, expose the
expanded state, and announce the matching result count. Native dialog close
notifications are asynchronous; the tests wait for that state to settle.

The nine interior routes were captured at 1440x1000, 390x844 and 320x844 for visual
review. Main pages, detail pages and 404 retain different compositions while
sharing their interface rules. Temporary journal fixtures verify future entry
rows, filtering, escaped text and the article progress indicator. No fixture is
included in public site content.

## Limitations

Direct browser navigation to the local HTTP server is blocked by the execution
environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). This attempted check is recorded as
**not tested**, not passed. No live deployment is claimed. The standalone preview
and generated documents were tested through the embedded-document method above.

No Safari, Firefox, physical-device, loaded-remote-font, browser WebGL performance,
or comprehensive accessibility certification is claimed. A high-contrast heading
check passed; additional reduced-transparency and unsupported-filter fallbacks
are implemented but not comprehensively tested on target devices.

## Current evidence

`tests/consistency.json`, `tests/interior-interactions.json`,
`tests/responsive.json`, `tests/source-preservation.json`,
`tests/physics-current.json`, `tests/shedding-current.json`,
`tests/package-integrity.json` and `tests/consistency-http.json`.

Earlier results are archived under `tests/previous-liquid-glass/` and are not
presented as newly executed checks. Earlier readme/testing notes are in `docs/`.

## Re-run

Visitors and static-page builds require no package dependencies. Browser tests
optionally require Python Playwright and an installed Chromium. Pixel comparisons
also require Pillow and the previous preview file.

```sh
node tools/build_site.js
python tools/build_preview.py
python tools/test_interiors.py
python tools/test_layout.py
python tools/test_consistency.py --baseline path/to/previous-preview.html
node tools/test_physics.js
node tools/test_nocturne.js
```

The baseline argument is optional; without it, the four pixel-comparison checks
are skipped. The HTTP test runs where local browser navigation is permitted.
