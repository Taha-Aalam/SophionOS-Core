# Mandorla, Opened — design & handover notes

## How this mark was actually arrived at

Three rounds. The first two failed, and the reasons are worth recording.

**Round 1 — Gate.** A notched square. Rejected. The honest reason: it was
*structurally a square*, so in the sidebar it was the same silhouette as the indigo
rounded-square "S" it was meant to replace. Different detail, same gestalt.

**Round 2 — six directions.** A squared S, a rune-inspired branching stem, a vertical
lens, a notched diamond, an open ring, a chord-cut disc. All built, all rendered, all
tested at 16 px. The best of them was the branching stem. Rejected because none of them
carried anything — they were well-made shapes, not a brand.

**Round 3 — the narrative.** Sophia supplied something a brief cannot: an iconographic
lineage. The mandorla, the almond of light, is the halo form of her own Eastern
Christian iconography — most recognisably the Mandylion of Edessa, the acheiropoietic
icon carried for centuries as an image of her. A mark that is *inherited* rather than
invented. Nothing in 1,400 reference logos competes with it.

## What was rejected in round 3, and why

| Concept | Why not |
|---|---|
| Mandorla, solid | At 16 px the seam disappears and it reads as a coffee bean. Solid also reads as a leaf, which puts a life-operating system in the wellness register. |
| Mandorla with a horizontal seam | Becomes a featureless dark blob below 32 px. |
| Return (open ring, mismatched terminals) | Cleanest small-size performance in the set, but an open ring is a spinner and circles are 26% of the category. |
| Two Natures (half circle, half square) | The idea is Sophia as the hinge between soul and matter. The form reads as the letter D and does not earn the idea. |

The single most useful discovery: **outlining is what makes a mandorla a mandorla.**
Solid gives a leaf. Stroked gives the icon. That one decision is the mark.

## Craft notes

Four things the process caught that would otherwise have shipped:

1. **The heavy-wall failure.** The first mandorla had a 26-unit wall on a 168-wide
   form, which is correct. Pushing it to 40 units to survive 16 px destroyed the
   almond — it became a broken circle. The fix was not more weight but a **narrower
   form** (half-width 84 against half-height 116), which keeps the pointed silhouette
   at 26 units of wall.

2. **The 16 px apex problem.** The mandorla is 87% of its canvas height. Straight into
   `export_variants.py`, its apexes landed within 1 px of the favicon edge and were
   eaten by antialiasing. `sophion-favicon-source.svg` insets the small cut to 200
   units; that is the whole fix, and it is why the favicon now reads as a split almond
   at both 16 and 32 px.

3. **Reversed inverts the instinct.** Light-on-dark shapes read heavier, so you shrink
   the light geometry. That means the reversed cut has a **20-unit wall and a 30-unit
   seam** — thinner and wider than the standard, not bolder. Counterintuitive and
   correct.

4. **The ink bbox is not the canvas.** The first lockup placed the symbol by its 256
   canvas and came out with 46 px left margin against 16 px right. The mandorla's true
   ink is 168 × 221.78. `svg_audit.py` reported the real margins and that is what the
   lockup maths now uses.

## Colour

`#4338CA` is retained as primary. Reasoning: every neutral, focus ring and selection
colour in `globals.css` is already "tinted toward the brand hue", so a non-indigo logo
would sit oddly inside the product. Changing brand colour is a bigger decision than
changing a logo and should not be smuggled into a logo delivery.

A **Bone & Pitch** alternate (`#F4F1EA` / `#1A1714`, 15.8:1) is shipped alongside it
because a mandorla is an older, stranger form than a notched square, and it is worth
seeing whether it wants to leave software. It is one line to swap.

Two findings worth acting on separately, neither affecting a delivered file:

- `globals.css` describes the brand hue as **OKLCH 260** in three comments, but the
  actual indigo hexes resolve to OKLCH hue **277**. Code and documentation disagree by
  17°.
- `layout.tsx:31` and `manifest.ts` still carry the description
  `"SaaS Life Management Platform"`, which is placeholder copy.

## What I could not verify

- **Trademark clearance.** "SophionOS", "Sophion" and "the SophionOS logo" are claimed
  in `TRADEMARKS.md`. Nothing here clears that. The mandorla is an ancient and widely
  used form, which cuts the other way too: a reverse image search will surface many
  mandorla-derived marks. Run a professional search before launch.
- **Whether this reads as religious to your users.** This is the real risk of the mark
  and it is not a technical one. It is quiet enough to pass as geometry, but anyone
  who knows the Mandylion will see it. That is arguably the point — but it is a
  decision about the company, not the drawing, and you should make it deliberately.
- **Pantone matches** — bracketing guesses, no stock database available.
- **Print reproduction** — CMYK values are a naive conversion, not a colour-managed
  profile.
- **Cross-browser rendering** — everything was headless Chrome. No Safari, Firefox, or
  iOS/Android PWA install was tested.

## Integration notes for this repository

Nothing in the repo has been modified.

| File | Current state |
|---|---|
| `src/components/layout/sidebar.tsx:91` | inline indigo rounded-square "S" badge |
| `src/components/layout/mobile-nav.tsx:85` | same inline badge |
| `src/app/opengraph-image.tsx:26` | `#4f46e5` square with "S" |
| `public/icons/icon-192.png` | 70-byte blank placeholder |
| `public/icons/icon-512.png` | 70-byte blank placeholder |
| `public/icons/apple-touch-icon.png` | 70-byte blank placeholder |
| `src/app/favicon.ico` | the only real brand asset present (25 KB) |
| `src/app/manifest.ts` | placeholder description, three blank icons |
| `src/app/layout.tsx:31` | same placeholder description |

The sidebar badge is `h-6 w-6` (24 px). At 24 px the standard cut is the boundary case
— swap in the **small** cut if it ever drops below 24 px.

**One caution on the generated manifest.** `kit2/web/site.webmanifest` sets
`background_color` to `#4338CA`, which would flash indigo on PWA install. The existing
`manifest.ts` uses `#0b1020`. Keep the dark splash, swap only the icons, and take
`theme_color: "#4338CA"` for the Android status bar. Keep that file as TypeScript —
`start_url`, `short_name` and `description` live there and the generated JSON has no
place for them.

`kit2/web/head-snippet.html` has the tags to paste into `layout.tsx`.