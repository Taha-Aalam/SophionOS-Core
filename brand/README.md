# SophionOS brand kit

**Mandorla, Opened** — the almond of light, stroked rather than filled, and cut once on
its axis.

SophionOS is named for Sophia's second movement: not the shattering that scattered the
world into fragments, but the return that draws the fragments back toward wholeness. The
mandorla is not an invention here — it is the halo form of Sophia's own iconography in
the Eastern Christian tradition, most recognisably the Mandylion of Edessa.

Read **[GUIDELINES.md](GUIDELINES.md)** before using any of it. Read
**[HANDOVER.md](HANDOVER.md)** for the design history, what was rejected and why, and the
things that could not be verified.

---

## Layout

| Path | What's in it |
|---|---|
| `GUIDELINES.md` | The rules: geometry, colour, clear space, minimum sizes, misuse |
| `HANDOVER.md` | Design history, craft notes, open risks, integration record |
| `logos/` | The 8 SVG masters |
| `variants/` | One-colour, square, favicon and app-icon variants + PNG exports |
| `web/` | Complete web/PWA icon set (favicon.ico, PNGs, manifest, head snippet) |
| `presentation/` | Client-facing board (HTML) + 5 slides (PNG) + the spec that built it |

### The masters (`logos/`)

| File | Use |
|---|---|
| `sophion-symbol.svg` | **Primary.** Standard cut, Sophion Indigo `#4338CA` |
| `sophion-symbol-small.svg` | 16–24 px. Heavier wall, wider seam |
| `sophion-symbol-reversed.svg` | Light mark on dark grounds. **Thinner** wall — intentional |
| `sophion-symbol-reversed-white.svg` | The same, in white |
| `sophion-horizontal.svg` | Mark + wordmark. Primary lockup |
| `sophion-stacked.svg` | Mark above wordmark. For square-ish spaces |
| `sophion-wordmark.svg` | Wordmark alone |
| `sophion-favicon-source.svg` | Small cut, inset so the tips survive 16 px |

---

## Relationship to `public/brand/`

Two copies of the same masters exist on purpose:

- **`public/brand/`** — the subset the running application serves. Six SVGs, referenced
  by the sidebar, mobile nav, login, landing page, legal-page header and global error
  page. This directory is **runtime** and must stay in sync with `logos/`.
- **`brand/logos/`** — the canonical masters, plus the full kit around them.

**If the mark ever changes, update both.** `public/brand/` is a deployed copy, not the
source of truth.

One file is *not* a copy and cannot be: `src/app/opengraph-image.tsx` inlines the SVG
path data. Satori renders the OG card at build time with no HTTP access, and its image
pipeline cannot rasterise an SVG data URI — verified, it fails the build. That file
needs updating by hand whenever the geometry changes.

---

## The wordmark

Set in **Sora SemiBold (600)**, tracked **−20/1000 em**, cap height **45% of the symbol
height**. All letterforms are converted to outlines, so no delivered SVG depends on an
installed font. Sora is SIL OFL 1.1, which permits commercial use and embedding in logos.

**Inside the application, the wordmark is live text, not this artwork.** That is
deliberate: text scales with the user's font-size settings, adapts to light/dark theme
automatically, stays selectable, and keeps its `<h1>` semantics. Only the *mark* is an
image. Use the lockup artwork where the logo must stand alone — email signatures,
print, README, video.

---

## Minimum sizes

| Artwork | Minimum |
|---|---|
| Symbol | 16 px / 5 mm |
| Horizontal lockup | 120 px wide / 32 mm |
| Stacked lockup | 96 px wide / 28 mm |

Between 16 and 24 px, swap to the small cut — the standard cut's 26-unit wall
antialiases to about 1.6 px at that size.

---

## Colour

| Role | HEX | Contrast |
|---|---|---|
| Sophion Indigo — mark, wordmark | `#4338CA` | 7.90:1 on white |
| Indigo UI — interface only | `#4F46E5` | 6.29:1 on white |
| Indigo Light — dark grounds | `#A5B4FC` | 8.96:1 on Ink |
| Ink — dark ground | `#0F172A` | — |
| Paper — light ground | `#FCFCFD` | — |

An alternate **Bone & Pitch** palette (`#F4F1EA` / `#1A1714`, 15.8:1) is included as
`sophion-symbol-pitch.svg` in `variants/`, in case the mandorla wants to leave software.

**Hard rule:** `#4338CA` on an indigo field is invisible — identical colours are exactly
1:1. On indigo grounds always use the white reversed cut.

---

## Not yet done

- **Trademark clearance.** "SophionOS", "Sophion" and "the SophionOS logo" are claimed in
  `TRADEMARKS.md`. Nothing here clears that. The mandorla is an ancient and widely used
  form, so a reverse image search will surface many mandorla-derived marks. Run a
  professional search before launch.
- **Whether it reads as religious.** A mandorla is Sophia's own icon. It is quiet enough
  to pass as geometry, but anyone who knows the Mandylion will see it. That is a decision
  about the company, not the drawing.
- **Pantone matches** are bracketing guesses; proof against a physical swatch.
- **The `videos/` motion projects still carry the old logo.** The migration plan was
  written (`docs/videos-logo-replacement-plan.md`) but that document is deliberately
  local-only — it now lives under the gitignored `docs/superpowers/`, so it is not part
  of this repository. The assets it needs are in `brand/logos/` and `public/brand/`.