# Shared design system

## Principles

The homepage supplies the dark ground, metallic objects, restrained interface
and mint-to-periwinkle title treatment. The interior pages share that palette
and one material system without becoming copies of one layout.

The same glass navigation capsule, active lens, search control, search palette
and motion control now serve every route, including Home. Home keeps its original
unboxed name; its lettering, rain and sphere renderer remain
unchanged. No route-specific exclusion of Home remains in the shared controls.

## Source of truth

Use the tokens at the start of `interiors.css`. Change responsive token values
rather than adding a one-off component font size at a breakpoint.

| Role | Token or rule |
| --- | --- |
| Main section title | `--type-page`, weight 500, line height 1.06 |
| Detail or recovery title | `--type-detail`, weight 500, line height 1.1 |
| Gallery, shelf, entry and empty-state title | `--type-card`, weight 500, line height 1.2 |
| Reading text | `--type-body`, line height 1.9 |
| Short card descriptions | `--type-caption`, line height 1.75 |
| Page introduction | `--type-intro`, line height 1.8 |
| Uppercase index/category labels | `--type-label`, shared monospace and tracking |
| Counts, dates, captions and metadata | `--type-meta`, shared monospace |
| Major panel | `--radius-panel`: 32px, 26px on small screens |
| Secondary panel | `--radius-card`: 24px, 22px on small screens |
| Inset artwork | `--radius-inset`: 16px, 14px on small screens |
| Input surface | `--radius-control`: 16px |
| Compact action | `--radius-pill`: 999px |
| Glass | `--glass-fill`, `--glass-edge`, `--glass-rim`, `--glass-shadow` |
| Shared background filtering | `--glass-backdrop`: 24px blur, 1.25 saturation |
| Fine separator | `--ui-line` |
| Section geometry | `--page-top`, `--heading-gap`, `--section-gap`, `--layout-gap` |
| Control height / action circle | `--control-min`: 44px |

About's personal name and introduction are editorial display roles, not card
titles or reading text. Decorative cover typography, engravings, sculptural
radii, optical lenses and differing art proportions remain intentionally local.
Readable overlays on cover art use a darker substrate beneath the same glass.

## Content formatting

Keep page labels in the shared content map. Use sentence case for titles and
visible actions; uppercase category/index styling is applied in CSS. Numbered
items use two digits. Journal dates use the existing `day short-month year`
formatter. Render all supplied text through the existing escaping helpers.

Keep microcopy brief. Do not add sample entries or fabricated personal details.
Continue using the existing SVG symbol set: diagonal arrows for exploration,
left arrows for returning, and the existing search and close symbols.

## Interaction and responsive contracts

All primary interface controls have at least 44px height. Navigation labels must
fit inside the capsule, including at 320px. Below 600px, galleries use one column.
Metadata and text may wrap; count badges should not be absolutely positioned
next to growing text. The same focus ring, active-state treatment and motion
preferences apply across components.

The search input is 16px at every breakpoint. Search opens with Control/Command K,
Escape closes it in one press, focus returns to its trigger, and the result count
is announced. The published journal remains empty, but its future rows, filter
rail and reader use these same contracts.

The material is a CSS optical treatment, not a physically accurate simulation.
Reduced-motion, reduced-transparency, forced-color and no-backdrop-filter styles
are included. Their device/browser support varies; testing scope is documented.

## Navigation placement

Keep cross-section navigation in the header and search. Cards open their own
entries, and detail pages retain a top breadcrumb. Do not add repeated bottom
next-page rows or promotional shortcuts. Keep the 404 recovery action and
footer motion control. Home's name row keeps its 44px minimum height to retain
its original position without an empty link or an extra focus stop.
