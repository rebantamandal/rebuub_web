# Historical report: before the name-panel removal

# Home glass verification

## Browser checks

Tests use headless Chromium with the self-contained HTML preview embedded in a
document. The remote Inter stylesheet is blocked to check the system-font fallback.
Screen sizes, touch and media preferences are emulated, not physical-device tests.

- 35 Home-specific checks pass: material and shared-navigation parity with all
  four sections at 320, 360, 390, 520, 600, 760, 768, 1024, 1440 and 1920px; dock
  and copy containment; 44px control heights; active lens alignment; project links;
  returning Home; keyboard sphere interaction and reset; motion controls; pointer
  highlights; high-contrast and reduced-transparency styles; touch navigation;
  and uncaught JavaScript errors.
- 51 interaction/content checks pass, including static content documents without
  JavaScript. The previous Home test was intentionally changed to require the
  shared glass navigation rather than the old hidden lens.
- 81 interior responsive checks pass. No document overflow or out-of-bounds
  non-absolute interior content was detected across nine routes and nine widths.
- 76 shared consistency checks pass for typography, navigation containment,
  search parity, keyboard dismissal, focus restoration and high-contrast headings.
- Desktop and narrow-mobile Home screenshots were visually reviewed. Home now
  intentionally differs from the old screenshots: the interface is glass, the
  lower controls share one dock, and the mobile header matches the other pages.

The sphere physics and droplet-shedding numerical tests were run again; these
are not display-frame-rate or physical-GPU measurements. SHA-256 checks confirm
that the original content, base stylesheet, artwork, renderer, atmosphere,
physics and input-handling files are unchanged.

## Scope and limitations

Local file and HTTP browser navigation are blocked in this execution environment
(`ERR_BLOCKED_BY_ADMINISTRATOR`). Browser rendering uses the embedded-document
method described above. The attempted HTTP check is recorded as not tested.
No live deployment, Safari/Firefox test, physical-device test, remote-font-loaded
test, WebGL performance guarantee or full accessibility certification is claimed.

The glass is CSS transparency, background filtering and layered reflection styling,
not a physically accurate refraction simulation. Solid-material fallbacks are
included for unsupported backdrop filters and reduced transparency. Chromium's
emulated high-contrast and reduced-transparency modes were checked on Home.

## Evidence and re-run

See `tests/home-glass.json`, `tests/interior-interactions.json`,
`tests/responsive.json`, `tests/consistency.json`, `tests/source-preservation.json`,
`tests/physics-current.json`, `tests/shedding-current.json`,
`tests/package-integrity.json` and `tests/consistency-http.json`.

Browser tests optionally require Python Playwright and an installed Chromium.

```sh
node tools/build_site.js
python tools/build_preview.py
python tools/test_home_glass.py
python tools/test_interiors.py
python tools/test_layout.py
python tools/test_consistency.py
node tools/test_physics.js
node tools/test_nocturne.js
```

Whole-home pixel preservation is no longer a valid test after the requested Home
interface update. Its old results are archived, not claimed for this version.
