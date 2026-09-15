# Homepage name restoration verification

This revision removes the homepage name panel and restores the original unboxed
name and View projects link. Shared glass navigation, search, and motion controls
are retained.

## Checks run for this revision

37 Chromium checks passed on the embedded preview. They cover the name and link
at 320, 390, 520, 760, 768, 1024, 1440, and 1920 pixels; comparison of the computed
metadata styles with the original plain-text version; absence of a panel, border,
shadow or blur around the name row; retained glass controls; navigation, search,
keyboard sphere interaction, touch, reduced motion, and uncaught script errors.
Desktop and 320-pixel mobile screenshots were also visually reviewed.

Source comparison confirms that the renderer, physics, content, artwork,
original stylesheet, and navigation scripts remain byte-for-byte unchanged.
Generated HTML differs only in removing the two homepage glass classes.

Run after rebuilding (the original-style baseline is an optional second argument):

```sh
python tools/test_home_glass.py ../rebuub-updated-preview.html
```

Results: `tests/home-name-restored.json` and
`tests/name-source-preservation.json`.

## Scope and historical reports

These checks use Chromium with embedded HTML and the offline system-font fallback.
They do not constitute new Safari or Firefox tests or a deployment verification.

The preceding name-panel checks are archived in
`docs/HOME-GLASS-TESTING.md` and `tests/previous-home-glass/`.
The older consistency, interaction and physics reports in this package are
historical reports from the preceding versions, not fresh runs for this revision.
