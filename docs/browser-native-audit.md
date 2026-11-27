# Browser-Native Audit — sophionos-core

Audit-only report: what the web platform can now do natively that this repo currently does with third-party packages or hand-rolled code. **No code, config, or lockfile changes are proposed in this PR — this file is the only artifact.** Nothing here has been merged or implemented.

| | |
|---|---|
| Date | 2026-11-15 |
| Target repo | `sophionos-core` (Next.js 16.4.4 / React 19.3.1 / Tailwind v4, pnpm single package + `packages/mcp-server`) |
| Audited snapshot | Working tree at `3be912a` (branch `fix/resource-project-link-wipe`); report branch cut from `origin/master` @ `5df59f7`. All cited files exist on both; line numbers reference the audited snapshot. |
| Method | MWG `legacy-scan` (33 guides / 35 deterministic rules, ~20% of corpus) as the starting point, then every hit manually verified against its `keepWhen`/`dropWhen` rubric; 37 capability searches + 36 guides retrieved from the MWG catalog (`modern-web-guidance@latest`, skill-version `2026_11_09-5bcc021b`); MDN/Baseline data fetched for claims without an MWG guide. |
| Bundle measurement | Existing `.next` build output (2026-11-15 build): marker-string attribution over `.next/static/chunks` (5.0 MB / 119 chunks). Chunk-level attribution is approximate where a chunk mixes libraries; individual per-lib numbers below say "not measured" where attribution was unreliable. |

## 0. Browser targets (assumption on record)

`package.json` now declares a `browserslist` (chrome/edge 111+, firefox 111+,
safari 16.4+); there is no `.browserslistrc` or `.mwgrc`. **Assumption:** Next.js 16's built-in transpilation target (modern evergreen browsers). Classification below treats **Baseline Widely available** as safe without fallback, **Newly available** as adopt-with-feature-detection, and **Limited** as adopt-only-behind-a-fallback or defer. Recommendation: document an explicit Baseline policy (e.g. in `AGENTS.md`) so future audits don't re-derive it.

Out of scope per the audit brief (excluded, not evaluated as candidates): server-side dependencies, database/storage (`@supabase/*`, `pg` in CI scripts), auth (`@clerk/nextjs`, 188 KB client chunks), payments, email (`resend`), server AI providers, build/test tooling. `packages/mcp-server` is server-only — out of scope.

## 1. Summary

22 candidates evaluated (12 substantive + 10 inventoried keeps). Counts per class:

| Class | Count | Candidates |
|---|---|---|
| (a) REPLACE NOW | 4 | C1 IME-safe submit · C2 relative time → `Intl.RelativeTimeFormat` · C3 `crypto.randomUUID` fallback · C4 two unused dependencies |
| (b) REPLACE WITH FALLBACK | 3 | C5 `sibling-index()` stagger · C6 sidebar scroll cues → scroll-driven animations · C7 progress-ring → `@starting-style` |
| (c) PARTIAL | 4 | C8 motion icons → CSS keyframes · C9 hand-rolled interactive headers → `<button>`/`<details>` · C10 date-fns → `Intl.*` (formatting only) · C11 react-hook-form/zod → constraint validation (enhancement only) |
| (d) KEEP THIRD-PARTY | 10 | K1 sonner · K2 cmdk · K3 @hello-pangea/dnd · K4 @xyflow/react · K5 tiptap · K6 emoji-mart · K7 react-day-picker · K8 next-themes · K9 lucide-react · K10 styling/state utilities |
| (e) FALSE POSITIVE | 0 | 8/8 legacy-scan hits verified genuine; search-level dismissals documented in §6 |
| INVESTIGATE ONLY | 1 | I1 on-device Prompt API vs cloud LLM gateway |

**Removable dependencies:** 2 (`@hookform/resolvers`, `@supabase/ssr` — zero import sites). Their combined shipped client cost is **0 KB** (never imported; never bundled). Install footprint not measured (pnpm symlinked store).

**Measured bundle cost addressable by migration:** ~188 KB shipped client chunk (`motion`), plus ~60 lines of stagger CSS, ~35 lines of relative-time code, and one uuid fallback. All other KEEP-class shipped costs are measured in §2 for context. **The single biggest measurable win is C8 (motion → CSS), not dependency removal.**

## 2. Inventory (Step 1)

### 2.1 Client-side third-party packages (shipped cost where measurable)

| Package | Import sites (files) | Job | Client/server | Shipped client cost (approx, from `.next/static/chunks`) |
|---|---|---|---|---|
| motion | 39 (`src/components/icons/*.tsx`) | hover keyframe animations on icons | 39 client | **~188 KB** (1 chunk) |
| @tiptap/react + starter-kit + 2 extensions | 1 (`note-editor.tsx`, 211 lines) | rich-text note editor | 1 client | ~396 KB (incl. ProseMirror, 1 chunk) |
| @emoji-mart/react + data | 1 (`ui/emoji-picker-popover.tsx`) | emoji picker — **already dynamically imported** | 1 client | ~500 KB (2 chunks, lazy) |
| @hello-pangea/dnd | 1 (`views/kanban-board.tsx`, 234 lines; also referenced by `projects-content.tsx`) | kanban drag & drop | 1 client | ~14 KB |
| @xyflow/react | 1 (`dashboard/network/network-explorer.tsx`) | entity-network graph | 1 client | ~188 KB |
| react-day-picker | 1 (`ui/date-picker.tsx`, 172 lines) | calendar popover | 1 client | ~56 KB |
| cmdk | 1 (`ui/command.tsx`) | ⌘K command palette | 1 client | ~52 KB |
| sonner | 28 | toasts on all mutations | client | ~68 KB |
| date-fns | 2 (`ui/date-picker.tsx`, `lib/utils/task-recurrence.ts`) | date formatting + recurrence math | 1 client / 1 shared | mixed chunk — **not measured** |
| react-hook-form | 9 (5 entity dialogs + `ui/form.tsx`, `ui/form-field.tsx`, `lib/forms/set-zod-form-errors.ts`, `lib/hooks/use-derived-status.ts`) | entity form state + validation | 8 client / 1 shared | not measured |
| @base-ui/react | 15 (`ui/*` primitives) | headless UI primitives (dialogs, popovers, tooltips, tabs, select…) | 12 client / 3 shared | ~176 KB (6 chunks) |
| lucide-react | 116 | iconography | 111 client / 5 RSC | not measured |
| next-themes | 6 | theme provider + toggles | 6 client | not measured |
| zod | 44 | schema validation | 42 server / 2 client | mostly server; client share not measured |
| zustand | 4 (`lib/stores/*`) | client UI state | client | not measured |
| clsx, tailwind-merge, class-variance-authority, tw-animate-css, shadcn | `lib/utils.ts`, `ui/*`, `globals.css` | class composition / variants / build-time CSS + CLI | shared / build-time | negligible / build-time |
| @clerk/nextjs | 32 | auth | ~30 server / 2 client | ~188 KB — **excluded (auth)** |
| @supabase/supabase-js | 41 | data access | 1 client / 40 server | ~528 KB client — **excluded (database)** |
| resend | 1 (`lib/notifications/email.ts`) | email | server | **excluded (email)** |

### 2.2 Unused dependencies (installed but never imported)

| Package | Import sites | Note |
|---|---|---|
| `@hookform/resolvers` | **0** (src/, scripts/, tests/, dynamic imports all checked) | Forms wire zod → RHF manually via `src/lib/forms/set-zod-form-errors.ts`. Its version was touched in lockfile-only commit `60f6d64` (Dependabot hygiene), but it has never been imported. |
| `@supabase/ssr` | **0** | Supabase clients are built directly with `createClient()` + Clerk `accessToken()` (`src/lib/supabase/{client,server,admin}.ts`); no cookie-based ssr helpers. |

### 2.3 CDN-loaded scripts / remotely hosted assets

**None found.** Grep over `src/` for external hosts returned nothing beyond first-party/allowlisted URLs; fonts are self-hosted via `next/font`; `globals.css` imports only local packages; the app runs a nonce-based CSP (`src/proxy.ts`). Clerk's SDK contacts Clerk domains at runtime — auth, excluded by scope.

### 2.4 Not candidates (inventoried, no platform equivalent applies)

`zustand` (client state), `clsx`/`tailwind-merge`/`cva` (class-composition logic), `tw-animate-css`/`shadcn` (build-time CSS/CLI) — these are application logic or build tooling, not reimplementations of a platform feature.

## 3. Candidates

Format per candidate: current implementation → native alternative (guide ID) → Baseline/support → fallback → effort → risk → saving.

---

### C1 · IME-unsafe hand-rolled Enter-to-submit — **REPLACE NOW**

- **Current:** Three `keydown` handlers intercept `Enter` to submit without checking `event.isComposing`, which breaks CJK IME input (the Enter that confirms a composition also triggers submit):
  - `src/components/entities/task-inline-editor.tsx:47-56` (commit on Enter + Escape cancel)
  - `src/components/onboarding/areas-step.tsx:136-138` (`handleCreate()`)
  - `src/components/settings/api-key-manager.tsx:160-162` (`createKey()`)
  `isComposing` appears nowhere in `src/` (verified).
- **Native alternative:** a real `<form>` wrapper with native submit (the platform handles Enter + IME automatically), or minimally an `if (e.nativeEvent.isComposing) return;` guard. Guide: **`ime-safe-enter-submit`** (its dropWhen explicitly blesses "native form submit events … native Enter submission handles IME automatically"). Escape-to-cancel in the inline editor stays a keydown handler.
- **Baseline/support:** `KeyboardEvent.isComposing` — supported in all engines for ~a decade (guide data: Chrome 56, Edge 79, Firefox 31; Safari has shipped it since Safari 10.1).
- **Fallback:** none needed.
- **Effort:** S. **Risk:** low — no visible change for non-IME users; fixes a real correctness bug for CJK users.
- **Saving:** 3 hand-rolled submit paths; unblocks CJK entry on onboarding, task rename, and API-key creation.

### C2 · Hand-rolled relative time → `Intl.RelativeTimeFormat` — **REPLACE NOW**

- **Current:** two divergent implementations plus three inline copies of the same idea:
  - `src/lib/utils/dates.ts:122-137` — `relativeTime()` ("Just now / Xm ago / Xh ago / Yesterday / Xd ago / date fallback"), ~16 lines
  - `src/components/entities/contact-log-entry.tsx:12-19` — `formatTimeAgo()` (different rules: no Yesterday, no date fallback), ~8 lines
  - inline `${days}d ago` conditionals in `contact-detail-content.tsx:429`, `contact-list-item.tsx:91`, `contact-card.tsx:192`
- **Native alternative:** `Intl.RelativeTimeFormat` with `numeric: "auto"` (gives "yesterday"/"1 day ago") and `style: "short"` (gives "5 min. ago"-style strings), localized for free. MDN citation (no dedicated MWG guide for relative time; closest MWG guide `calculate-event-differentials` covers Temporal/`Intl.DurationFormat`, both not-yet-Baseline — **not** recommended here).
- **Baseline/support:** **Baseline Widely available since 2020-09** (MDN, fetched 2026-11-15).
- **Fallback:** none needed.
- **Effort:** S. **Risk:** low — **user-visible wording changes** ("5m ago" → "5 min. ago" or similar; pick `style` to taste). Flagged per the audit's hard rule: third-party/hand-rolled wording is not automatically worse; decide the strings deliberately.
- **Saving:** ~35 lines across 5 files, two drifting implementations collapse into one helper around one platform API.

### C3 · `crypto.randomUUID` fallback — **REPLACE NOW**

- **Current:** `src/components/ui/linear-filters.tsx:53-58` — `newFilterId()` feature-detects `crypto.randomUUID` and falls back to `filter-${Date.now()}-${Math.random()…}`. Meanwhile three client files already call `crypto.randomUUID()` bare (`onboarding/onboarding-content.tsx:24`, `components/onboarding/tasks-step.tsx:47`, `components/entities/contact-dialog.tsx:195`) — the fallback guards a feature the rest of the app already assumes.
- **Native alternative:** call `crypto.randomUUID()` directly (MDN).
- **Baseline/support:** **Baseline Widely available since 2022-03** (MDN, fetched 2026-11-15); secure-context only — this app serves over HTTPS/HSTS.
- **Fallback:** none needed; delete the branch.
- **Effort:** XS. **Risk:** none. **Saving:** dead code removed; consistency with the 3 existing bare call sites.

### C4 · Unused dependencies — **REPLACE NOW** (removal, no capability claim)

- **Current:** `@hookform/resolvers` and `@supabase/ssr` in `dependencies`, zero import sites anywhere (see §2.2).
- **Native alternative:** none needed — this is dead weight, not a platform replacement. Delete both from `package.json` (separate commit from any capability work; note `60f6d64` for reviewer context).
- **Effort:** XS. **Risk:** none (verified unimported). **Saving:** two deps off the audit/upgrade surface; shipped cost 0 KB.

### C5 · `:nth-child` stagger delays → `sibling-index()` — **REPLACE WITH FALLBACK**

- **Current:** `src/app/globals.css:396-480` — five hand-enumerated stagger blocks (~60 lines) that set only `animation-delay`: `execution-load-bars` (40ms steps), `momentum-ring-segment`, `kpi-stagger` (40ms), `cockpit-stagger` (50ms, capped at 240ms via `nth-child(n+6)`), `reveal-stagger` (60ms, capped at 420ms via `nth-child(n+8)`). Verified against guide rubric: all five meet `keepWhen` (3+ sequential nth-child rules setting only delays).
- **Native alternative:** `animation-delay: calc(sibling-index() * 40ms)` (guide **`dynamic-sibling-animations`**; caps become `min(calc(sibling-index() * 50ms), 240ms)`). Note `momentum-ring-segment` uses `nth-of-type` — convert the selector family along with the delays.
- **Baseline/support:** `sibling-index()`/`sibling-count()` — **Newly available, Baseline since 2026-08-18** (guide: Chrome 138 Jun 2025, Edge 138, Firefox 154 Aug 2026, Safari 26.2 Dec 2025).
- **Fallback:** keep the existing nth-child rules; add an `@supports (animation-delay: calc(sibling-index() * 1ms))` override that collapses them. Behaviour identical in both paths.
- **Effort:** S. **Risk:** low (pure CSS; visual parity). **Saving:** ~60 lines of enumerated CSS → 5 single rules; future staggers need no new rules.

### C6 · Sidebar scroll-affordance cues → scroll-driven animations — **REPLACE WITH FALLBACK**

- **Current:** `src/components/layout/sidebar.tsx:119-160` (~45 lines) — manual `scrollTop`/`scrollHeight` measurement + `ResizeObserver` + rAF + React state to toggle canScrollUp/canScrollDown affordance cues on the collapsed nav rail.
- **Native alternative:** CSS scroll-driven animations (`animation-timeline: scroll()` on the fade/shadow overlays; guide **`scrollytelling`** — scroll-position-driven opacity/shadow is its core example family).
- **Baseline/support:** Scroll-driven animations — **Newly available, Baseline since 2026-10-27** (guide: Chrome 115 Jul 2023, Edge 115, Firefox 159 Oct 2026, Safari 26 Sep 2025). Not yet safe without fallback under the stated assumption.
- **Fallback:** keep the existing JS cues; wrap the CSS approach in `@supports (animation-timeline: scroll())` and delete the JS when support is Baseline-wide.
- **Effort:** S-M. **Risk:** low (cues are decorative). **Saving:** ~45 lines of scroll-state plumbing removed from the hottest layout component; rAF/observer churn gone.

### C7 · Progress-ring JS entry gate → `@starting-style` — **REPLACE WITH FALLBACK**

- **Current:** `src/components/charts/progress-ring.tsx:27-31` — `requestAnimationFrame` → `setMounted(true)` gate to animate the ring's `stroke-dashoffset` from full to target on mount.
- **Native alternative:** CSS `@starting-style` + a transition on `stroke-dashoffset` (guide **`animate-element-entry-exit`**); same pattern later applies to `progress-ring`'s siblings (`metric-bar-fill` etc. already use CSS keyframes).
- **Baseline/support:** `@starting-style` — **Newly available, Baseline since 2024-08-06** (guide: Chrome 117 Sep 2023, Edge 117, Firefox 129 Aug 2024, Safari 17.5 May 2024).
- **Fallback:** current JS gate remains the fallback (feature-detect via `CSS.supports` or simply accept no animation on older browsers — the ring renders final-state correctly either way; pick deliberately).
- **Effort:** S. **Risk:** low. **Saving:** one mounted-state gate pattern; establishes the CSS entry-animation idiom this audit proposes elsewhere (C8, C6).

### C8 · `motion`-animated icon components → CSS keyframes — **PARTIAL**

- **Current:** 39 components in `src/components/icons/*.tsx` (4,606 LOC), the only importers of `motion` (`motion/react`), forming one ~188 KB shipped chunk. Uniform shape: variant keyframe arrays (e.g. `sun-moon.tsx`: `rotate: [0, -5, 5, -2, 2, 0]`), `useAnimation` + `useImperativeHandle` start/stop handles, triggered by `onMouseEnter`/`onMouseLeave` on the icon wrapper. **No caller outside the icons directory invokes the imperative handles** (verified) — hover is the only trigger path. ~5 icons (e.g. `download.tsx:24`, `layers.tsx:20`, `users.tsx:23,32`, `credit-card.tsx:23`) use **spring** transitions.
- **Native alternative:** CSS `@keyframes` + **individual transform properties** (`rotate`/`scale`/`translate` — guide **`individual-transform-properties`**, **Baseline Widely available since 2022-08-05**), `:hover` for the trigger, and `linear()` easing to approximate the springs (guide-backed on MDN: **Widely available since 2023-12**, explicitly designed to "approximate any curve"; Jake Archibald's linear() generator produces spring curves). The `icons` guide confirms inline SVG is the correct technique when animating inside the icon.
- **Baseline/support:** every ingredient is Baseline Widely available — **no feature detection needed**.
- **Fallback:** none required; migration risk is fidelity, not support.
- **Effort:** **L** (4,606 LOC, mechanical but large; best done in batches with a shared CSS keyframe library).
- **Risk:** M — **this is the audit's main "third-party still wins" flag:** motion's spring solver and per-variant timelines are exactly reproducible only via careful `linear()` point lists; subtle easing differences will be perceptible to a designer. Recommend converting the ~34 keyframe/easing icons first, keeping `motion` solely for the ~5 spring icons if fidelity review fails, then re-evaluating.
- **Saving:** up to **~188 KB measured** shipped client chunk (the whole `motion` chunk) and 39 components' dependency-specific API surface; animation logic becomes auditable CSS.

### C9 · Hand-rolled interactive/disclosure headers → `<button>` / `<details>` — **PARTIAL**

- **Current:** 10 sites hand-roll interactive semantics on `<div>`s: `role="button"` + `tabIndex={0}` + manual `onClick` + manual `onKeyDown` Enter/Space handling — 8 collapsible group headers in the by-group views (`tasks-by-group-view.tsx:77-87`, `notes-by-group-view.tsx:39`, `resources-by-group-view.tsx:70`, `areas-by-type-view.tsx:57`, `projects-by-area-view.tsx:61`, `projects-by-goal-view.tsx:61`, `contacts-by-category-view.tsx:43`, `contacts-follow-up-view.tsx:49`), plus `calendar-view.tsx:287` (draggable task card) and `contact-dialog.tsx:729` (upload trigger).
- **Native alternative:** a real `<button aria-expanded>` replaces the entire keydown/role/tabIndex apparatus (native platform behaviour); the collapsible mechanics can additionally become `<details name="…">` — guide **`accordion`** (exclusive `<details>` **Newly available, Baseline since 2024-09-03**: Chrome 120, FF 130, Safari 17.2; `::details-content` for animated open/close **Newly available, Baseline since 2025-09-16**). Note the guide's own warning: *do not put headings inside `summary`* (JAWS/TalkBack drop them) — these headers render group headings, so the guide's "build a custom accordion instead" carve-out applies; hence PARTIAL.
- **Baseline/support:** `<button>`/`<details>` are platform-ancient; the modern animation extras are Newly available with the guide's stated fallbacks.
- **Fallback:** `<button>` needs no fallback. For `<details>`, keep current markup where the animated `::details-content` path isn't supported (collapse still works; only the animation degrades).
- **Effort:** M (10 files; styling parity work on the group headers). **Risk:** low-medium (focus/keyboard semantics improve; visual parity needs checking).
- **Saving:** ~80 lines of hand-rolled keyboard/ARIA code deleted; correct native semantics on 10 surfaces.

### C10 · date-fns — **PARTIAL**

- **Current:** 2 import sites only. `ui/date-picker.tsx:4` uses `addMonths, format, isValid, parseISO`; `lib/utils/task-recurrence.ts:1-10` uses date math (`addDays`, `addMonths`, …) for recurrence expansion (server + client).
- **Native alternative:** the repo already centralizes formatting on `Intl.DateTimeFormat` (`src/lib/format.ts` — itself already native); the picker's `format(date, "yyyy-MM-dd")` and `format(selected, "PP")` calls are trivially `Intl`-able. Date *math* has no Baseline-native replacement: Temporal is **Limited** (guide `calculate-event-differentials`: Chrome 144 Jan 2026, Firefox 139 May 2025, **no Safari**).
- **Baseline/support:** `Intl.DateTimeFormat` Widely available; Temporal not yet.
- **Fallback:** keep date-fns for recurrence math until Temporal is Baseline-widely available.
- **Effort:** S. **Risk:** low. **Saving:** small — client-side date-fns cost is not measured (shared chunk); the win is consistency (one formatting idiom), not KB.

### C11 · react-hook-form + zod → native constraint validation — **PARTIAL**

- **Current:** 5 entity dialogs (`task-dialog.tsx` alone is 1,440 lines) drive validation through RHF + zod with manually rendered `<FormMessage>`s; zod schemas are shared with server routes (42 of 44 zod import sites are server-side).
- **Native alternative:** native constraint validation (`required`, `pattern`, `type=email/url`, `setCustomValidity`) plus `:user-valid`/`:user-invalid` CSS — guide **`validate-input-after-interaction`** and **`accessible-error-announcement`**; **`:user-valid`/`:user-invalid` are Baseline Widely available since 2023-11-02** (guide: Chrome 119, FF 88, Safari 16.5). The repo already half-adopts the pattern: dialogs pass `ariaInvalid` down (`task-dialog.tsx:837`).
- **Baseline/support:** Widely available for the CSS pseudo-classes; constraint validation itself is ancient.
- **Fallback:** none needed for the enhancement path; RHF remains the form engine.
- **Effort:** M. **Risk:** **behaviour would change** — native validation messages differ from the designed `<FormMessage>` copy, and cross-field/server-synced rules can't move. The honest classification: keep RHF+zod for the entity dialogs; adopt `required` + `:user-invalid` + `aria-invalid` sync on simple surfaces (settings/preferences, inline editors) as progressive enhancement. Third-party wins today for complex forms.
- **Saving:** modest — early, free validation for no-JS/edge cases on simple forms; no dependency removal.

### K1 · sonner (toasts) — **KEEP THIRD-PARTY**

Native equivalent (guide **`persistent-toast-notifications`**) is `popover="manual"` + a managed stack + `ariaNotify()` announcements — and the guide's MANDATORY list shows how much a11y machinery correct toasts need. `ariaNotify()` is **Newly available, Baseline since 2026-09-14** (Chrome 141+, Safari 27 — not deployable as sole path). Sonner (68 KB, 28 call sites) already implements the focus/announcement/stacking rules. Revisit only if bundle pressure demands it.

### K2 · cmdk (⌘K palette) — **KEEP THIRD-PARTY**

No platform command-palette primitive exists; the `menu` guide covers popup menus, not fuzzy-search palettes with app actions. 1 call site (`ui/command.tsx`), 52 KB.

### K3 · @hello-pangea/dnd (kanban) — **KEEP THIRD-PARTY**

HTML5 drag events lack touch support, keyboard a11y, and the auto-scroll/overlay polish a kanban needs; the lib (14 KB shipped, single consumer `kanban-board.tsx`) is the cheapest correct option. (Aside found while auditing: `calendar-view.tsx:287` implements its own second drag layer via native `draggable` — fine, different interaction.)

### K4 · @xyflow/react (network graph) — **KEEP THIRD-PARTY**

No platform equivalent for interactive node/edge graphs. 188 KB shipped but isolated to one dashboard view and code-split.

### K5 · tiptap ×4 (rich-text notes) — **KEEP THIRD-PARTY**

No modern platform rich-text editing API exists (`contenteditable` + `execCommand` is legacy and worse). 396 KB incl. ProseMirror, one consumer (`note-editor.tsx`).

### K6 · emoji-mart (emoji picker) — **KEEP THIRD-PARTY**

No standardized platform emoji-picker API (searched; none in MWG catalog — listed as unverified/absent rather than claimed). The 500 KB cost is **already lazily loaded** via dynamic `import()` (`emoji-picker-popover.tsx:16,37,77`) — the right mitigation is already in place.

### K7 · react-day-picker + date-picker (incl. hand-rolled wheel throttle) — **KEEP THIRD-PARTY**

The native alternative — `<input type="date">` + `showPicker()` (**Widely available since 2022-09**, MDN, fetched 2026-11-15; user-gesture required) — changes UX materially (browser-styled calendar, inconsistent across engines; the `browser-ui-theming` guide helps but doesn't equalize). `ui/date-picker.tsx` also hand-rolls wheel throttling (`WHEEL_THROTTLE_MS:120`) for its custom grid — that custom code exists *because* it's a custom calendar; it disappears only if the surface moves to a native input. Worth reconsidering for low-stakes date fields, not as a blanket swap.

### K8 · next-themes — **KEEP THIRD-PARTY**

Three-state (light/dark/system) theming with class-based Tailwind tokens and a pre-paint inline script (CSP-nonce-aware, `layout.tsx:75-88`). CSS `light-dark()` can't express the class strategy or the stored preference without JS anyway. Cost negligible.

### K9 · lucide-react — **KEEP THIRD-PARTY**

The `icons` guide's CSS icon system is a genuine alternative to JS icon components, but lucide is already tree-shaken inline SVG (no runtime library cost beyond the components themselves) and 116 files import it. Migration cost is high and the platform win is nil — not a platform-reimplementation case. Not measured.

### K10 · clsx / tailwind-merge / class-variance-authority / tw-animate-css / shadcn (CLI+CSS) — **KEEP THIRD-PARTY**

Application/build-time utilities with no platform equivalent. `shadcn` and `tw-animate-css` are build-time only (CSS imports + CLI; verified zero JS imports).

### I1 · On-device AI (Prompt API) vs the cloud LLM gateway — **INVESTIGATE ONLY (not a replacement)**

The app calls cloud LLM providers through `src/lib/ai/*` (BYOAK gateway). Chrome's on-device Prompt API (guide **`language-model`**) is the platform capability in this space. **The guide itself flags this feature as volatile: shipped in only a single browser engine and may still change.** Do not treat it as a replacement:

- **Privacy:** on-device inference keeps brief content local — a genuine trust-contract improvement over cloud egress.
- **Quality:** on-device models are smaller; narration quality/grounding would differ from the user's chosen provider.
- **Support:** Chromium-only; Firefox/Safari users need the cloud gateway fallback regardless, so both paths must be maintained.
- Any exploration requires an explicit project opt-in to the volatile-features gate and its own spec — out of scope for this audit.

## 4. Top 10 (impact vs effort, highest priority first)

| # | Candidate | Class | Impact | Effort | Measured/expected saving |
|---|---|---|---|---|---|
| 1 | C1 IME-safe submit | REPLACE NOW | M — fixes real CJK bug | S | 3 bug sites; correctness |
| 2 | C4 unused deps | REPLACE NOW | M — hygiene | XS | 2 deps removed; 0 KB shipped |
| 3 | C2 relative time → `Intl.RelativeTimeFormat` | REPLACE NOW | M — dedup | S | ~35 LOC, 5 files, 2 divergent impls → 1 |
| 4 | C3 uuid fallback removal | REPLACE NOW | S | XS | dead code |
| 5 | C5 `sibling-index()` stagger | REPLACE WITH FALLBACK | S | S | ~60 CSS lines → 5 rules |
| 6 | C8 motion icons → CSS | PARTIAL | **L — biggest KB win** | L | up to ~188 KB chunk + 4.6K LOC |
| 7 | C9 disclosures → `<button>`/`<details>` | PARTIAL | M — a11y | M | ~80 LOC hand-rolled semantics |
| 8 | C6 sidebar scroll cues → scroll-driven animations | REPLACE WITH FALLBACK | S | S-M | ~45 LOC scroll plumbing |
| 9 | C10 date-fns formatting → `Intl.*` | PARTIAL | S | S | consistency; client KB not measured |
| 10 | C7 progress-ring → `@starting-style` | REPLACE WITH FALLBACK | S | S | 1 JS gate pattern |

## 5. Recommended first pilot — C1 (IME-safe enter-to-submit)

**Why:** lowest risk (no visual or wording change for non-IME users), guide-backed with an explicit rubric, three tiny sites, and it fixes a genuine correctness bug — the clearest demonstration that the platform already covers behaviour the app hand-rolls. (Immediate zero-risk hygiene companion: C4's two dep removals; strongest KB win saved for later: C8.)

**Implementation sketch (for the implementer, not done in this PR):**
1. `task-inline-editor.tsx` — wrap the input in a real `<form onSubmit={commit}>`; keep `onKeyDown` solely for Escape-to-cancel; add the IME check if keeping any Enter logic.
2. `areas-step.tsx` — wrap the icon+name row and the "Add area" button in one `<form onSubmit={handleCreate}>`; delete the Enter keydown.
3. `api-key-manager.tsx` — same wrap around the name input + "Create key" button; delete the Enter keydown.
4. Every new form: `e.preventDefault()` in the submit handler (these are not `method="dialog"` surfaces).

**Exact verification steps:**
1. `pnpm test` — the full existing suite stays green.
2. `pnpm typecheck && pnpm lint`.
3. Manual IME check on dev server: enable a CJK IME (e.g. Chrome built-in Japanese Romaji or a Chinese Pinyin IME). In the task inline editor, type a multi-syllable word, press Enter to *confirm the composition* — verify no commit fires and the composed text stays in the field. Press Enter again after composition ends — verify commit fires once.
4. Repeat the composition-Enter check in onboarding ("Add area") and settings ("Create key").
5. Latin regression: plain Enter still submits in all three surfaces; Escape still cancels the inline editor; onBlur commit still works.
6. Re-run `npx modern-web-guidance@latest legacy-scan src` — the three `ime-safe-enter-submit` findings are gone.

## 6. legacy-scan ledger — verification and dismissal of every hit

The scan reported 8 findings in 2 guide categories (236 docs/tests files skipped by design; the scan covers ~20% of the corpus — capability searches in §3 covered the rest).

| Hit | Location | Verdict | Reason |
|---|---|---|---|
| dynamic-sibling-animations | `globals.css:396` | **Genuine** → C5 | 4 sequential nth-child rules, only `animation-delay` — matches keepWhen. |
| dynamic-sibling-animations | `globals.css:416` | **Genuine** → C5 | 3 nth-of-type rules, only delays. |
| dynamic-sibling-animations | `globals.css:430` | **Genuine** → C5 | 4 rules, only delays. |
| dynamic-sibling-animations | `globals.css:447` | **Genuine** → C5 | 5 rules + cap rule `nth-child(n+6)` — still matches keepWhen; cap needs `min(calc(…), 240ms)` nuance noted. |
| dynamic-sibling-animations | `globals.css:473` | **Genuine** → C5 | 8 rules + cap `nth-child(n+8)` — same nuance. |
| ime-safe-enter-submit | `task-inline-editor.tsx:48` | **Genuine** → C1 | Enter keydown → submit, no `isComposing` check; not keyup, not modifier-gated, not a global hotkey — none of dropWhen applies. |
| ime-safe-enter-submit | `areas-step.tsx:137` | **Genuine** → C1 | same. |
| ime-safe-enter-submit | `api-key-manager.tsx:161` | **Genuine** → C1 | same. |

**Dismissed scan hits: none** — all eight verified as real matches. (The Enter/Space handlers on `role="button"` divs in the by-group views were *not* flagged by the scan — they are non-text widgets per dropWhen — but are captured as candidate C9.)

## 7. Search-level false positives and dismissed ideas

Documented so the scan/search noise is accounted for, not silently dropped:

1. **Speculation Rules / prefetch libraries** — no prefetch library is installed; Next.js App Router prefetches RSC payloads natively. The `improve-next-page-load-performance` guide targets MPA Speculation Rules (Chrome-only, Limited) — not applicable to this app's client-side navigation. Dismissed.
2. **`field-sizing` (auto-growing fields)** — no auto-grow textarea or manual height-adjustment code exists anywhere in `src/` (grep for `scrollHeight` style writes: only the sidebar's scroll measurement). Nothing to replace. Dismissed as not-applicable.
3. **Clipboard** — all three copy sites already use `navigator.clipboard.writeText` (`api-key-manager.tsx:119`, `api-key-create-dialog.tsx:83`, `mcp-client-matrix.tsx:30`); no `execCommand` fallbacks. Already native. Dismissed.
4. **Manual lazy-loading / image formats** — no custom IntersectionObserver or manual `<img loading>` code exists; `next.config.ts` already serves AVIF/WebP via the image optimizer. Dismissed.
5. **Native `<input type="date">` as a full react-day-picker replacement** — evaluated, dismissed → K7 (UX differs materially).
6. **Full react-hook-form/zod replacement** — evaluated, dismissed → C11 PARTIAL (shared server/client schemas; designed error copy).
7. **lucide-react → CSS icon system (`icons` guide)** — evaluated, dismissed → K9 (cost/benefit).
8. **next-themes → CSS `light-dark()`** — evaluated, dismissed → K8 (three-state + class strategy + FOUC script).

## 8. Measurement notes and limitations

- Chunk attribution used marker strings in minified output — reliable for tiptap/ProseMirror, emoji-mart, xyflow, sonner, cmdk, day-picker, dnd, base-ui, clerk, motion; **not measured** for react-hook-form, zustand, next-themes, lucide-react, and date-fns' individual share (its 128 KB chunk also contains supabase markers).
- The `.next` output was a pre-existing build (2026-11-15); no `ANALYZE=true` build was run (would have violated the read-only constraint).
- Server output (71 MB) and `packages/mcp-server` were not evaluated — out of scope.
- LOC estimates for C8 (4,606) are exact (`wc -l` over the 39 icon files); C2/C5/C6/C9 are close counts from the cited ranges.
- All MWG Baseline dates/support matrices are quoted from retrieved guides; MDN claims (`Intl.RelativeTimeFormat`, `crypto.randomUUID`, `linear()`, `showPicker()`) were fetched live on 2026-11-15.
