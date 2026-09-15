# Nocturne revision checks

## Browser checks

21 assertions passed in headless Chromium, including:

- Initial load and both front/behind-letter sphere layers.
- A running gradient clock; all 12 sampled phases are distinct and dark.
- The 216-second colour loop closes; palette boundaries are continuous.
- Rare-lightning interval is 38-78 seconds and peak exposure is at most 0.16.
- A second immediate lightning event is rejected.
- Automatic shedding produces upward daughter beads in smaller atlas tiles.
- Mouse click, emulated-touch tap and keyboard selection/popping.
- Reduced motion freezes the atmosphere and all detached particle positions.
- Reduced motion disables lightning; OS reduced-motion initializes paused.
- Navigation keeps the background phase; project details and search work.
- No horizontal overflow on Home, Projects, Journal, Shelf and About at
  widths 320, 390, 768, 1440 and 1920 (25 layouts).
- No JavaScript page errors.

The maximum background RGB channel at the sampled palette phases was 46/255.
This measures the background only, not text, images or metallic highlights.

## Physics and shader checks

The existing fixed-step and original pressure-spring checks passed. A new
60-second deterministic simulation at input rates of 60, 144 and 240 Hz found
zero position difference for source spheres and daughter droplets. This checks
simulation timing, not achievable rendering FPS. Detached drops always moved
up, particle counts stayed bounded, detachment preserved depth and projected
position, and resize/reset cleared transient geometry.

The actual delivered vertex and fragment shader strings were compiled, linked
and rendered separately through Mesa EGL / OpenGL ES 3.2 (llvmpipe). Six
formation/pinch-off stages were rendered and selected stages were inspected.
Extra tile padding prevents clipping at the top while the lobe pulls away.
The original environment, normals, surface shading and reference spring were
compared with the supplied Drift ZIP and found unchanged. SHA-256 comparisons
are recorded in `tests/material-integrity.json`.

## Environment and limits

Browser checks used the self-contained HTML via Playwright `set_content` and
hash navigation, with the optional remote font request replaced by an empty
response. Chromium did not create a WebGL context, so browser visual and input
checks exercised the fallback, including approximate bead growth and bridges.
Native GLSL validation is separate from those browser checks.

Real-device GPU performance, browser WebGL integration, physical phones,
Safari, Firefox, local-file security policies and a live Vercel deployment
were not tested. No external deployment was performed.

Results: `tests/browser-results.json`, `tests/physics-results.json`,
`tests/shedding-results.json`, `tests/material-integrity.json`,
`tests/shader-results.json`.
