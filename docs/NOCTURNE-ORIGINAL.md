# rebuub / Nocturne

Built from the supplied Drift version. Open `rebuub-nocturne-preview.html` for
one-file browsing. The ZIP contains the complete static website; keep its files
and folders together. No runtime packages are required.

## This revision

The atmosphere moves through the entire hue wheel: teal, blue, indigo, violet,
magenta, burgundy, red, rust, amber, olive, green and emerald. Every colour is a
dark shade, blended with near-black. Twelve 18-second interpolations make a
216-second loop. Broad fields drift very slightly; a black veil preserves depth.
There are no abrupt theme changes or whole-page hue/brightness filters. The
same background continues across every page, header and footer.

Small metallic beads grow out of the spheres, stretch a tapering neck and
separate upward. The lobe and neck are part of the parent's live implicit
surface, using the original reflection environment and lighting. Detached beads
have their own spring state, rise with damped acceleration and inherit their
parent's front/behind-letter depth. At most two spheres shed at once on desktop,
and one on mobile; detached bead counts are capped. The particle motion is an
art-directed approximation, not a physically complete fluid solver.

The original sphere reflection environment, surface normals, shading and
pressure-spring implementation are unchanged. Only the shedding geometry and
its transport were added. There is no transparent bubble material and no
cursor colour-inversion effect. Existing clicking/tapping, keyboard controls,
lettering, navigation and minimal copy are retained.

Distant lightning is restored: the first event is after 24-42 seconds of active
viewing, then events are 38-78 seconds apart. A soft single pulse, faint channel
and small local reflections replace the previous rapid flashes. The internal
exposure is capped at 0.16. No thunder audio or page-wide white flash is added.
Navigation, tab return and resuming motion do not produce an immediate strike.

## Motion and performance

Reduce motion freezes the current colour and particles and disables lightning.
The operating-system reduced-motion preference is respected. Hidden-tab loops
are cancelled rather than accumulating a backlog of events.

The background uses a maximum-800-pixel Canvas 2D surface at up to 30 updates
per second. Sphere presentation remains display-synced with a fixed 120 Hz
simulation. A shared GPU atlas uses small tiles for daughter beads and a fixed
capacity to avoid canvas reallocation on every emission. These are implementation
budgets, not promised hardware frame rates.

## Controls

Move near a sphere to deform it; click or tap to break it into smaller beads.
With the scene keyboard-focused, arrow keys select, Enter/Space pops, Home resets
and Escape clears selection. Reduced-motion popping has no burst animation.
Control/Command + K opens the site search.

## Editing and rebuilding

- Public content: `site-config.js`.
- Layout: `styles.css` and `tools/template.html`.
- Background colours and timing: `atmosphere.js`.
- Metallic surface and shedding geometry: `sculpture.js`.
- Rise, shedding intervals, depth and popping: `spheres.js`.
- Compositing and lightning: `scene.js`.

```sh
node tools/build_site.js
python tools/build_preview.py
node tools/test_physics.js
node tools/test_nocturne.js
```

The standalone preview is written next to the project folder. The original
Vercel routes are included; this package has not been deployed to an external
account. The optional remote Inter stylesheet falls back to system fonts
offline. The name uses outlined vector artwork. No font files are packaged.
Keep unpublished private content and secrets out of these public files.

## Verification and fallback

See `TESTING.md` and `tests/`. Layout, interactions and colour cycles were tested
in headless Chromium with emulated touch. That browser did not offer WebGL, so
those checks used the existing same-material image fallback. The delivered
GLSL was separately compiled and rendered using Mesa EGL/OpenGL ES, including
six stages of bead formation and neck thinning. This is shader validation, not
a claim that browser WebGL or real-device frame rates were tested.

On browsers without WebGL, the original shader capture supplies the metallic
finish; bead growth/bridging is a 2D approximation. Full surface deformation and
continuous normal/reflection changes use WebGL on supported browsers.
