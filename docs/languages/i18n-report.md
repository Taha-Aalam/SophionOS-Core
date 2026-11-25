# i18n (Tier 1): typed dictionary, shell extraction, multilingual search

Branch: `feat/i18n` → `master` · one PR · **not merged**

UI layer only. Routes, API, DB, internal identifiers and user content stay
canonical English; the `SophionOS` brand is never translated; legal document
bodies stay English (their nav labels translate).

---

## Step 0 — baseline (pre-change, `HEAD`)

Measured with `node scripts/i18n-audit.mjs --rev HEAD`. The scanner walks the
TypeScript AST and counts JSX text nodes plus user-facing attribute literals
(`placeholder`, `aria-label`, `title`, `alt`, …) and `toast.*` copy. It ignores
class names, identifiers, hrefs, data/test attributes and enum values.

| Area | Strings | Files |
| --- | ---: | ---: |
| Shell / navigation | 47 | 6 |
| Settings | 306 | 28 |
| Dashboard | 64 | 17 |
| Tasks | 100 | 10 |
| Goals | 109 | 8 |
| Projects | 132 | 7 |
| Areas | 99 | 8 |
| Notes | 155 | 12 |
| Toasts / errors | 5 | 3 |
| Remaining pages | 1254 | 51 |
| **Total** | **2271** | |

## After the extraction sweep

Same command on the working tree (`pnpm i18n:audit`):

| Area | Remaining | Extracted |
| --- | ---: | ---: |
| Shell / navigation | 7 | **40** |
| Settings | 287 | **19** |
| Dashboard | 63 | **1** |
| Tasks | 78 | **22** |
| Goals | 97 | **12** |
| Projects | 106 | **26** |
| Areas | 86 | **13** |
| Notes | 129 | **26** |
| Toasts / errors | 4 | **1** |
| Remaining pages | 1254 | 0 |
| **Total** | **2111** | **160** |

The 7 shell strings left are the `SophionOS` brand in its three logo/alt
forms and the `⌘K` glyph — both intentionally untranslated. The shell has no
other English copy.

### What was extracted

1. **Shell** — `navigation.ts` (keys only, no display labels), desktop sidebar,
   mobile drawer, topbar breadcrumb, profile dropdown, sign-out overlay,
   command-palette chrome, user identity fallback and cohort badge.
2. **Main entity pages** — dashboard, tasks, goals, projects, areas and notes:
   page headers/subtitles, every tab label, primary create actions, loading
   copy, error messages, empty states (title/description/action) and grouped-view
   placeholders.
3. **Settings** — the Settings index cards and the whole Preferences page,
   including the new Language picker.

Entity card/row/dialog internals, settings sub-pages and the remaining routes
are deliberately left for the follow-up sweep (see “Remaining”).

### Dictionary size

- **265** English keys in one namespace.
- **36** imported unchanged from `docs/languages/ui-dictionary.seed.json`.
- **229** added by this sweep (English only, except the shell/settings keys
  translated for the Japanese pilot).

---

## Part 1 — mechanism

- `src/lib/i18n/dictionary.ts` — one typed namespace (`nav.*`, `legal.*`,
  `chrome.*`, `action.*`, `<page>.*`, `settings.*`, `preferences.*`,
  `common.*`, `error.*`). `TranslationKey` is derived from the English object,
  so a bad key is a compile error.
- `src/components/providers/i18n-provider.tsx` — `I18nProvider`, `useI18n()`
  and `useTranslation()`; `t(key, vars)`, plural-aware `tp(base, count, vars)`,
  and locale-bound `formatDate` / `formatNumber`.
- Fallback chain is `locale → inherited locale → en`, then the key itself if a
  key is genuinely unknown. Empty translations are treated as missing, so the
  UI can never render a blank or a raw key.
- **Lazy loading**: English is the only eager dictionary. Each other Tier-1
  locale is its own `import()` behind a locale code; the build emits one chunk
  per locale (verified in `.next/static/chunks`). The server layout resolves
  the stored locale and serialises **only that locale's** dictionary, so a
  reload paints the right language without a flash and without shipping the
  other eleven.
- **es-MX** loads `es` first and merges its own overrides file; it currently
  stores no overrides (`{}`).
- **Persistence** uses the existing `user_settings` `preferences` row
  (`preferences.language`) and the existing `useUpdatePreferences` pattern — no
  migration. Both shell layouts read it server-side:
  `src/app/(dashboard)/layout.tsx` and `src/app/(trust)/layout.tsx`.
- **First visit**: with no stored preference the provider detects
  `navigator.languages` after hydration (`es-MX` → `es` → `en` fallback) and
  does not write a preference until the user picks one.
- **Language picker**: Settings → Preferences lists the 13 Tier-1 locales by
  native name (`日本語`, `Español (México)`, …), applies the language to the
  live UI immediately, and saves through the existing preferences mutation.
- **Intl**: dates and numbers go through `Intl.DateTimeFormat`,
  `Intl.NumberFormat` and `Intl.RelativeTimeFormat`; the dashboard greeting
  date now follows the active locale instead of hard-coded `en-US`.

**Framework choice (2 lines):** no `next-intl` — this app has no locale route
segment or server-component translation requirement, and the preference is a
per-user client setting, so a ~200-line typed provider avoids a dependency,
middleware changes and URL/localisation coupling.

## Part 3 — command-palette search

`src/lib/i18n/nav-search-keywords.ts` (generated by
`scripts/i18n-nav-keywords.mjs`) indexes every nav item by:

- its label in **all 13 Tier-1 locales** (from the seed), and
- **Japanese romaji readings** (`tasuku`, `mokuhyou`, `purojekuto`, …).

That file is ~2.8 KB gzip of label strings — not dictionaries — which is what
lets the palette match every language while dictionaries stay lazy. Matching is
NFKC-normalised and case-insensitive. A test asserts the generated index still
contains every Tier-1 label for every nav item, so it cannot drift from the
locale files.

Acceptance cases covered by `tests/unit/command-palette.test.tsx`:

| Query | UI locale | Top result |
| --- | --- | --- |
| `タスク` | English | Tasks |
| `tasuku` | English | Tasks |
| `tasks` | Japanese | タスク |
| `目標` / `mokuhyou` | English | Goals |

## Part 4 — guards and report

- `tests/unit/i18n-guards.test.ts`
  - every locale key exists in English (no orphan/typo keys);
  - es-MX keys are a subset of es;
  - **every English key resolves to non-blank copy in every Tier-1 locale**
    (this is the key-set parity guard; locales are intentionally partial, so
    the strict invariant is “stored keys ⊆ en, resolved set = en”);
  - an untranslated long-tail key falls back to English, not a blank/key;
  - es-MX resolves through Spanish before English.
- Navigation guard: `navigation.ts` is parsed and rejected if it contains a
  `label:` display property; every nav item and breadcrumb must carry a
  `labelKey` that exists in the dictionary.
- `pnpm i18n:report` → `docs/languages/untranslated-report.md`, the per-locale
  work queue.

### Untranslated keys per locale (265 total)

| Locale | Translated | Missing | Coverage |
| --- | ---: | ---: | ---: |
| ja (pilot) | 139 | 126 | 52% |
| es, es-MX, fr, de, pt, it, nl, zh, ko, hi, ru | 36 each | 229 each | 14% each |

The 36 are the owner-provided seed shell keys. Japanese additionally covers
all added shell/Settings/Preferences chrome so the pilot shell has **zero
English leakage**. Nothing beyond the seed was machine-translated for the other
locales; they fall back per key as specified.

## Bundle impact (excluding lazily-loaded dictionaries)

Measured with esbuild (`--minify`, gzip -9) against the real modules, with
React/Next/react-query/user-settings externals:

| Piece | Minified | Gzip |
| --- | ---: | ---: |
| i18n core (config + en dictionary + runtime + provider + nav keywords) | 25.4 KB | **8.56 KB** |
| — of which English dictionary (265 keys) | 11.9 KB | 3.35 KB |
| — of which multilingual nav keyword index | 7.0 KB | 2.82 KB |
| Lazy `ja` chunk emitted by `next build` | 6.8 KB | 2.63 KB |
| Lazy `de` chunk (seed-only) | 1.25 KB | 0.70 KB |

The English dictionary and nav keyword index are the two biggest fixed costs;
they are needed for the English fallback and for cross-language search
respectively. No other locale content is in the initial bundle.

## Verification

- `npx tsc --noEmit` — clean (exit 0).
- `npx eslint . --quiet` — 0 errors (one pre-existing warning in
  `settings/mcp/mcp-settings-content.tsx`, untouched).
- `npx vitest run` — **250 files, 2187 tests, all passing** (includes the new
  guards, trust-routing updates and four new palette acceptance cases).
- `npx next build` — production build succeeds; per-locale chunks confirmed.
- Not verified in a live browser or against a real `user_settings` row:
  language switch/reload and sign-out/sign-in persistence are covered by the
  server-side preference read and the unit tests, but **not** by an E2E run.
  No screenshot was taken.

## Remaining / follow-ups (out of this PR)

- **2111** hard-coded strings remain, by area: remaining pages 1254
  (topics, contacts, resources, My Day, inbox, knowledge, detail pages, trust
  and auth pages), settings sub-pages 287, entity page bodies 565 (cards, rows,
  dialogs, filters), toasts/errors 4.
- Tier-2 dictionaries (21 locales) and Tier-3 (ar/ur/fa/he) are not started;
  Tier-3 still needs the RTL layout pass.
- Legal document bodies, emails/notifications and all server-side strings
  remain English by design.
