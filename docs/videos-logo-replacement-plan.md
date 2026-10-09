# Plan: replace the logo across the 17 `videos/` motion projects

**Audience:** an agent (or engineer) picking this up cold.
**Scope:** `videos/` only. The main Next.js app is already migrated — do not touch it.
**Status:** ready to execute. No design decisions remain open on this task.

---

## 0. Read this first — the two mistakes that will break the job

### 0.1 Do NOT edit the `IconSquare` component

`IconSquare` lives in each project's `src/ui/primitives.tsx` and is a **generic
primitive**, not a logo component. It is used for:

- the logo — `glyph="S"`
- emoji avatars — `glyph="👩🏽‍💻"`, `glyph="🤖"`, `glyph="👤"`
- initials — `glyph="DM"`, `glyph="EV"`
- arbitrary single letters — `glyph="C"`, `glyph="L"`
- row/loop-driven glyphs — `glyph={row.glyph}`, `glyph={s.glyph}`, `glyph={q.glyph}`

If you change `IconSquare`, you will convert every emoji and initials badge in all 17
videos into the SophionOS mandorla. **Change only the call sites where `glyph="S"`.**

### 0.2 These are 17 projects, not one, and they are not the same framework

| Kind | Count | Root |
|---|---|---|
| Remotion (React + TSX) | 16 | `videos/sophionos-*` |
| HyperFrames (HTML + GSAP) | 1 | `videos/sophionos-promo-60s` |

`sophionos-promo-60s` is **not** Remotion — it has its own `AGENTS.md` describing a
HyperFrames project (`index.html`, GSAP timelines, `data-*` timing attributes). It needs
different instructions (§4). Read its `AGENTS.md` before editing it.

---

## 1. What the logo is, and where the source of truth lives

**Mandorla, Opened** — the almond of light, stroked rather than filled, split once on
its axis. It replaces a filled indigo rounded square containing a bold "S".

### Source of truth — copy from here, never redraw

```
public/brand/sophion-symbol.svg                  standard cut, Sophion Indigo
public/brand/sophion-symbol-small.svg            small cut (heavier wall)
public/brand/sophion-symbol-reversed-white.svg   reversed cut, white
public/brand/sophion-horizontal.svg              mark + wordmark
public/brand/sophion-stacked.svg                 mark above wordmark
public/brand/sophion-wordmark.svg                wordmark only
```

These are already committed at the repo root. Treat `public/brand/` as read-only input.
If a cut you need is missing (e.g. a reversed cut in indigo, or a small reversed-white
for dark grounds), **say so and stop** — do not invent geometry.

### Geometry you can paste directly

Standard cut — `viewBox="0 0 256 256"`, fill `#4338CA`. Ink footprint 168 × 221.78,
optically centred:

```svg
<svg width="{S}" height="{S}" viewBox="0 0 256 256" fill="#4338CA" aria-hidden>
  <path d="M115 17.11 A122.1 122.1 0 0 0 44.01 128 A122.1 122.1 0 0 0 115 238.89 L115 210.92 A98.83 98.83 0 0 1 70 128 A98.83 98.83 0 0 1 115 45.08 Z"/>
  <path d="M141 17.11 A122.1 122.1 0 0 1 211.99 128 A122.1 122.1 0 0 1 141 238.89 L141 210.92 A98.83 98.83 0 0 0 186 128 A98.83 98.83 0 0 0 141 45.08 Z"/>
</svg>
```

Reversed cut — `viewBox="0 0 256 256"`, fill `#FFFFFF`. **Thinner wall (20 vs 26) and a
wider seam (30 vs 26)**: light marks on dark grounds read heavier, so the wall shrinks
to compensate. Use this whenever the mark sits on a dark fill.

```svg
<svg width="{S}" height="{S}" viewBox="0 0 256 256" fill="#FFFFFF" aria-hidden>
  <path d="M113 18.04 A122.1 122.1 0 0 0 44.01 128 A122.1 122.1 0 0 0 113 237.96 L113 216.27 A104 104 0 0 1 64 128 A104 104 0 0 1 113 39.73 Z"/>
  <path d="M143 18.04 A122.1 122.1 0 0 1 211.99 128 A122.1 122.1 0 0 1 143 237.96 L143 216.27 A104 104 0 0 0 192 128 A104 104 0 0 0 143 39.73 Z"/>
</svg>
```

### Proportion rule (important for video, where the mark is small on screen)

The mandorla is **taller than it is wide (0.76 : 1)** and it is an *outline*, so it reads
much lighter than the filled tile it replaces. Two consequences:

- **Size it larger than feels right.** Start at **1.35×** the old `IconSquare` `size`
  and compare a rendered frame before settling.
- Because it is an outline, on a light background it needs either the indigo cut or a
  solid plate. Never drop the standard indigo cut straight onto a light card at small
  sizes without checking legibility.

**Minimum size:** below 24 px of rendered height the wall antialiases to mush. In 1080p
video, treat **44 px** as the floor.

---

## 2. Colour — leave the tokens alone

`src/tokens.ts` in each Remotion project mirrors `src/app/globals.css`. **Do not change
the palette.** The logo colour is `#4338CA`, but the app's UI tokens stay exactly as they
are; the logo was deliberately given a deeper indigo for contrast while the interface
kept its existing tokens.

- `primary: "oklch(0.3 0.15 260)"` — **unchanged.** Used for buttons, rings, accents.
- Only the *mark* uses `#4338CA`.

If you find a hardcoded `#4F46E5` used **as the logo tile**, that is in scope. If it is
used as a button, a highlight, or an accent, leave it.

---

## 3. Remotion projects (16) — the procedure

### 3.1 Find the real call sites

Do not trust a fixed file list; projects drift. Per project:

```bash
grep -rn 'glyph="S"' videos/<project>/src
```

As of this writing that returns **4 sites**, all of them the logo:

| Project | File | Line | Current |
|---|---|---|---|
| `sophionos-demo` | `src/scenes/Hero.tsx` | 107 | `<IconSquare glyph="S" size={36} tone="primary" />` |
| `sophionos-demo` | `src/scenes/Dashboard.tsx` | 51 | `<IconSquare glyph="S" tone="primary" size={32} />` |
| `sophionos-demo` | `src/scenes/Closing.tsx` | 172 | `<IconSquare glyph="S" size={36} tone="primary" />` |
| `sophionos-feature-tour` | `src/scenes/Trust.tsx` | 201 | `<IconSquare glyph="S" size={64} tone="primary" round={false} />` |

Also grep for the wordmark text block, which sits next to the mark:

```bash
grep -rn 'SophionOS' videos/<project>/src/scenes
```

Typical shape (`Hero.tsx:107-111`):

```tsx
<IconSquare glyph="S" size={36} tone="primary" />
<div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>
  SophionOS
</div>
<Pill label="Core" tone="neutral" style={{ marginLeft: 8 }} />
```

`Close.tsx` files in `sophionos-daily-loop`, `sophionos-relationships` and
`sophionos-feature-tour` carry a closing wordmark card; check each one.

Projects that have a `src/tokens.ts` but **no** `glyph="S"` simply have no logo to
swap — verify and move on. Do not add a logo where none existed.

### 3.2 Replace a call site

Introduce one shared component per project, in `src/ui/primitives.tsx`, right next to
`IconSquare`. Do not edit `IconSquare` itself.

```tsx
/**
 * SophionOS logo — mandorla, opened. Outlined, not filled: a solid almond reads
 * as a leaf. Path data is copied from public/brand/sophion-symbol.svg; that file
 * is the source of truth.
 */
export const BrandMark: React.FC<{ size?: number; tone?: "primary" | "reversed" }> = ({
  size = 48,
  tone = "primary",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 256"
    fill={tone === "reversed" ? "#FFFFFF" : "#4338CA"}
    aria-hidden
  >
    <path d="M115 17.11 A122.1 122.1 0 0 0 44.01 128 A122.1 122.1 0 0 0 115 238.89 L115 210.92 A98.83 98.83 0 0 1 70 128 A98.83 98.83 0 0 1 115 45.08 Z" />
    <path d="M141 17.11 A122.1 122.1 0 0 1 211.99 128 A122.1 122.1 0 0 1 141 238.89 L141 210.92 A98.83 98.83 0 0 0 186 128 A98.83 98.83 0 0 0 141 45.08 Z" />
  </svg>
);
```

Then swap the call site, preserving the existing flex row and spacing:

```tsx
- <IconSquare glyph="S" size={36} tone="primary" />
+ <BrandMark size={48} />
```

Note the size increase (`36 → 48`) per §1. Keep the sibling `<div>SophionOS</div>` and
the `<Pill label="Core" />` untouched.

Where the mark sits on an indigo or near-black surface, use
`<BrandMark size={48} tone="reversed" />`.

### 3.3 Wordmark typography — recommendation: leave it

The wordmark in these videos is already live text in `fonts.sans`, which is fine. Switching
it to Sora 600 (the brand wordmark face) would mean adding a webfont to 16 separate
Remotion projects and is **out of scope**. If a project's wordmark is set at
`fontWeight: 800` with heavy negative tracking, nudge it to 600 / `-0.02em` for
consistency, but do not introduce a new font.

---

## 4. HyperFrames project — `sophionos-promo-60s`

Different framework. **Read `videos/sophionos-promo-60s/AGENTS.md` first.**

### 4.1 The block to replace

`index.html:112-118` draws the old tile in CSS:

```css
#lockup { display: flex; align-items: center; gap: 22px; }
#tile {
  width: 76px; height: 76px; border-radius: 21px;
  background: #4F46E5; color: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  font-size: 44px; font-weight: 800; letter-spacing: -0.03em;
}
#wordmark { font-size: 62px; font-weight: 800; letter-spacing: -0.035em; color: #0B0B0F; }
```

Used at `index.html:170` (`<div id="wordmark">SophionOS</div>`) plus a `#tile` sibling.

### 4.2 The replacement

Replace the `#tile` CSS rule with an inline SVG sized to the old tile:

```css
#tile { width: 104px; height: 104px; display: block; }
```

and in the markup:

```html
<svg id="tile" viewBox="0 0 256 256" width="104" height="104" fill="#0B0B0F" aria-hidden>
  <path d="M115 17.11 A122.1 122.1 0 0 0 44.01 128 A122.1 122.1 0 0 0 115 238.89 L115 210.92 A98.83 98.83 0 0 1 70 128 A98.83 98.83 0 0 1 115 45.08 Z"/>
  <path d="M141 17.11 A122.1 122.1 0 0 1 211.99 128 A122.1 122.1 0 0 1 141 238.89 L141 210.92 A98.83 98.83 0 0 0 186 128 A98.83 98.83 0 0 0 141 45.08 Z"/>
</svg>
```

The `#wordmark` colour is `#0B0B0F` (near-black, on a light card), so the mark takes that
same fill rather than indigo. Update the stale comment at `index.html:109-111`, which
currently documents "indigo rounded square + white S".

`videos/sophionos-promo-60s/assets/index.md:30` documents the `hero.png` lockup crop
("indigo 'S' tile + wordmark") — update that row too if `hero.png` is re-exported.

---

## 5. Also check: docs that describe the old logo

Two known references, both comments/notes rather than code:

- `videos/sophionos-demo/README.md:220` — "Logo animation polish — the wordmark uses a
  static Indigo tile." Update or remove.
- `videos/sophionos-demo/scripts/retime-scenes.mjs:296` — a comment referencing the
  closing wordmark. Harmless; update only if the cue text changed.

---

## 6. Verification

Per Remotion project:

```bash
cd videos/<project>
npx tsc --noEmit          # typecheck the new component
npm run check             # lint + runtime + layout + motion + contrast
```

Then **render one representative frame and look at it.** Do not trust a green check —
the failure mode here is aesthetic (too small, invisible on the ground, wrong cut), and
no linter detects that.

```bash
npx hyperframes preview --background   # for the promo-60s project, per its AGENTS.md
```

For each changed scene, confirm:

- [ ] the mandorla is clearly legible at final render resolution
- [ ] it is **not** smaller than the tile it replaced
- [ ] the right cut is used (indigo on light, reversed-white on dark)
- [ ] neighbouring emoji/initials `IconSquare` badges are untouched
- [ ] the wordmark and `Core` pill still align on the same baseline row
- [ ] nothing else in the frame shifted

For `sophionos-promo-60s` additionally run `npm run check` (mandatory per its AGENTS.md)
and re-render the end card.

---

## 7. Definition of done

- [ ] Every `glyph="S"` call site in `videos/` replaced with the mandorla
- [ ] `IconSquare` unmodified in all 13 projects that define it
- [ ] No project gained a logo it did not previously have
- [ ] `videos/sophionos-promo-60s/index.html` tile replaced, stale comment updated
- [ ] `tsc --noEmit` clean in every touched project
- [ ] At least one rendered frame inspected per changed scene
- [ ] No changes made outside `videos/`
- [ ] Nothing committed — hand back a diff for review

---

## 8. Reference: brand palette

Not for use in this task except as noted in §2 — recorded so you can recognise a colour
that has drifted.

| Role | HEX | sRGB | Contrast |
|---|---|---|---|
| Sophion Indigo (logo) | `#4338CA` | 67, 56, 202 | 7.90:1 on white |
| Indigo UI (interface) | `#4F46E5` | 79, 70, 229 | 6.29:1 on white |
| Indigo Light (dark grounds) | `#A5B4FC` | 165, 180, 252 | 8.96:1 on Ink |
| Ink (dark ground) | `#0F172A` | 15, 23, 42 | — |
| Paper (light ground) | `#FCFCFD` | 252, 252, 253 | — |

Wordmark typeface is **Sora SemiBold 600**, tracked −20/1000 em. Videos currently use
their own sans for the wordmark; leaving it is acceptable (§3.3).