# SophionOS — Logo Guidelines

The mandorla, outlined, and cut once on its axis.

```
Sophia is the hinge of the whole drama — the reason there's a broken world to
wake up from, and the wisdom that wakes you up.

SophionOS is named for that second movement.
```

---

## The mark

**Mandorla, Opened** — the almond of light, stroked rather than filled, and severed
once along its axis.

The mandorla is not an invention here. It is the halo form of Sophia's own
iconography in the Eastern Christian tradition, most recognisably the Mandylion of
Edessa — the acheiropoietic icon carried for centuries as an image of her.

Two decisions carry the whole mark:

1. **Outlined, not solid.** A solid almond reads as a leaf, and drifts straight into
   the wellness register. A stroked almond reads as a mandorla.
2. **Cut once, on the axis.** The seam is the hinge. The mark is the second movement,
   not the first.

### Construction

Every value below is exact. Nothing is drawn by eye.

| Element | Value |
|---|---|
| Canvas | 256 × 256 units |
| Outer vesica | half-width **84**, half-height **116**, arc radius **122.1**, arc centres offset **38.11** from the axis |
| Inner vesica | half-width **58**, half-height **90**, arc radius **98.83** |
| Wall | **26** units, uniform at both the waist and the apexes |
| Seam | **26** units, centred on the axis (13 either side) |
| Ink footprint | 168 × 221.78, optically centred |
| Angles | none — the mark is arcs and verticals only |

### The three cuts

| Cut | Wall | Seam | Use |
|---|---|---|---|
| **standard** | 26 | 26 | everything 24 px and up |
| **small** | 34 | 34 | 16–24 px, favicons, app icons |
| **reversed** | 20 | 30 | light mark on dark grounds |

The reversed cut is **thinner**, not bolder. Light shapes on dark grounds read
heavier (irradiation), so the wall shrinks and the seam grows to compensate. This
inverts the usual instinct and it is deliberate.

`sophion-favicon-source.svg` is the small cut inset to 200 units. The mandorla is
tall — 87% of its canvas — so without the inset its apexes sit within 1 px of the
edge of a 16 px favicon and get eaten by antialiasing. The inset is what keeps the
tips alive.

---

## Colour

### Primary — Sophion Indigo

| Role | HEX | sRGB | CMYK | OKLCH | Contrast |
|---|---|---|---|---|---|
| **Sophion Indigo** — mark, wordmark | `#4338CA` | 67, 56, 202 | 67, 72, 0, 21 | 0.457 0.215 277 | **7.90:1** on white |
| Indigo UI — interface only | `#4F46E5` | 79, 70, 229 | 66, 69, 0, 10 | 0.511 0.230 277 | 6.29:1 on white |
| Indigo Light — dark grounds | `#A5B4FC` | 165, 180, 252 | 35, 29, 0, 1 | 0.785 0.104 275 | **8.96:1** on Ink |
| Ink — dark ground | `#0F172A` | 15, 23, 42 | 64, 45, 0, 84 | 0.208 0.040 266 | — |
| Paper — light ground | `#FCFCFD` | 252, 252, 253 | 0, 0, 0, 1 | 0.991 0.001 286 | — |

One colour is the whole system. No gradients, no second accent, no shadows.

### Alternate — Bone & Pitch

An older, quieter register, in case the mandorla wants to leave software.

| Role | HEX | sRGB | CMYK | OKLCH |
|---|---|---|---|---|
| **Pitch** — mark, wordmark | `#1A1714` | 26, 23, 20 | 0, 12, 23, 90 | 0.207 0.008 67 |
| Bone — ground | `#F4F1EA` | 244, 241, 234 | 0, 1, 4, 4 | 0.959 0.010 88 |

Pitch on Bone: **15.8:1**. Shipped as `sophion-symbol-pitch.svg`.

### The one hard colour rule

**`#4338CA` on an indigo field is invisible** — identical colours give exactly 1:1.
On indigo grounds always use the white **reversed** cut, never the indigo one.

> **Pantone:** I have no Pantone stock-matching database. Treat these as bracketing
> guesses pending a physical swatch: `#4338CA` sits somewhere between **Reflex Blue C**
> (uncoated **3005 C**) and **2625 C** (uncoated **2725**). `#1A1714` is near **Black 6**
> or **Warm Black**. Proof before any print run; expect uncoated stock to shift.

---

## Wordmark

Set in **Sora SemiBold (600)**, tracked **−20/1000 em**, cap height locked to **45% of
the symbol's height** in the horizontal lockup. Every shipped SVG has the letterforms
converted to outlines — verified: zero `<text>` elements across the whole set.

Sora is SIL Open Font License 1.1, which permits commercial use and embedding in
logos. If you re-set the wordmark by hand, use Sora 600 and the tracking above.

---

## Clear space

**X = the seam.** The gap at the centre of the mark is 26 units; on the 256 canvas that
is X = 13 units of clear space on every side — a memorable rule that is also
conservative, and it means the clear space is visibly tied to the mark's own idea.

For anything larger than 1:1, round X up to 5% of the symbol's height. Nothing may
enter that margin: no type, no rules, no other logos, no container edges.

The gap between the symbol and the wordmark inside a lockup (48 units, 0.6 × cap
height) is part of the lockup artwork and is not clear space.

---

## Minimum sizes

| Artwork | Minimum | Below that, use |
|---|---|---|
| Symbol | **16 px** / 5 mm | nothing works below 16 px |
| Horizontal lockup | **120 px** wide / 32 mm | the symbol alone |
| Stacked lockup | **96 px** wide / 28 mm | the symbol alone |

Verified by rendering at 16 / 24 / 32 / 48 / 64 / 96 / 120 / 128 / 192 px, in one
colour, reversed, mirrored and rotated 180°.

Between 16 and 24 px, swap to the **small** cut. The standard cut's 26-unit wall
antialiases to about 1.6 px at that size.

---

## Approved backgrounds

| Ground | Mark |
|---|---|
| Paper `#FCFCFD`, white, any light neutral | `#4338CA` standard |
| Any indigo (`#4338CA`, `#4F46E5`) | white **reversed** cut |
| Ink `#0F172A`, any dark neutral | white **reversed** cut, or `#A5B4FC` |
| Bone `#F4F1EA` | `#1A1714` |

Never: indigo on indigo; a filled mandorla in place of the stroked one; the seam
filled in or moved off the axis; any gradient, shadow, glow or bevel; a two-colour
mark.

---

## Misuse

- Do not fill the mandorla. Solid means leaf.
- Do not close the seam, widen it, move it off the axis, or add a second cut
- Do not mirror the mark *and* keep the wordmark — mirror the lockup as a whole or not at all
- Do not swap the reversed cut's proportions back to the standard
- Do not stretch — scale proportionally from the master
- Do not rebuild it as live text, a CSS shape, or a font glyph
- Do not place it on a busy ground without a solid plate behind it
- Do not add a halo, rays, or a glow. The mark is not in need of emphasis.

---

## Files

```
sophion-symbol.svg                  master, Sophion Indigo
sophion-symbol-small.svg            small cut (wall 34, seam 34)
sophion-symbol-reversed.svg         reversed cut (wall 20, seam 30)
sophion-symbol-reversed-white.svg   reversed cut, white
sophion-symbol-pitch.svg            Bone & Pitch alternate
sophion-favicon-source.svg          small cut, inset for 16 px
sophion-horizontal.svg              symbol + wordmark
sophion-stacked.svg                 symbol above wordmark
sophion-wordmark.svg                wordmark only

svg/    black / white / mono-4338ca / square / favicon / app-icon variants,
        plus PNGs at 512, 1024 and 1200
web/    favicon.ico, favicon.svg, favicon-16/32/48.png, apple-touch-icon.png,
        icon-192.png, icon-512.png, maskable-512.png, site.webmanifest,
        head-snippet.html
```

---

## Extending the system

The mark is a container, not just a picture — which suits a product that is a context
layer. Secondary icons should sit centred in the same optical square as
`sophion-symbol-app-icon.svg`. Do **not** repeat the seam on secondary icons: the cut
is the logo's own idea, and a system-wide seam turns a mark into a stencil.