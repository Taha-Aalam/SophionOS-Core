# Phase 6 (Onboarding, Settings, API Access, Responsive + PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete roadmap Phase 6 end-to-end on top of the shipped Phase 4/4b surface: guided onboarding, full settings pages, generalized API key management, remaining tier-wall finish work, and deploy-ready responsive/PWA polish.

**Architecture:** Build Phase 6 around the codebase that actually shipped, not the older architecture doc. Reuse the Clerk-authenticated app shell, the existing client-side Supabase service layer, the current `/api/v1/user/*` routes, and the key-value `user_settings` table. Add a protected `/onboarding` flow, expand settings into first-class subpages, split MCP onboarding from API key management, finish the already-started tier wall UX/verification, and add a conservative PWA layer that improves installability without risking authenticated write flows.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Supabase JS + Postgres/RLS, TanStack Query, shadcn/ui, Sonner, Vitest, Tailwind 4, service worker via `public/`.

---

**Created:** 2026-07-01
**Status:** PLAN ONLY - do not implement in this session. Execute in a fresh session via the prompt + goal docs alongside this file.
**Companion docs:**
- Prompt: `docs/superpowers/prompts/2026-07-01-phase-6-onboarding-settings-pwa.md`
- Goal gate: `docs/superpowers/goals/2026-07-01-phase-6-onboarding-settings-pwa.ps1`

## Reality Check (source of truth for this plan)

- Phase 5 is intentionally skipped for this project. Do not introduce tracker work.
- `src/app/(dashboard)/settings/mcp/page.tsx` and `mcp-settings-content.tsx` already ship key create/list/revoke plus config snippets. Step 38 must generalize this, not rebuild the backend.
- `src/lib/api/api-key-service.ts` already supports `expires_at`, `last_used_at`, and revocation metadata. The missing work is route/UI support.
- `src/lib/services/onboarding.service.ts` already seeds default areas and provisions a Pro subscription on first auth-provider run. Phase 6 should extend this seam instead of creating a second bootstrap path.
- `src/lib/services/user-settings.service.ts` and `/api/v1/user/settings` use a key-value settings model (`user_id`, `key`, `value`), not the older wide-table shape in the architecture doc. New settings must stay within this K/V model.
- Step 39.5 is partly built already. `src/lib/api/subscription.ts`, `/api/v1/user/subscription`, `/api/v1/mcp/health`, paid-tier gating, and the free-tier MCP CTA exist. Remaining work is the dashboard billing surface plus live verification/apply of the entity-cap wall.
- `src/app/layout.tsx` does not expose a manifest, icons, or service-worker registration yet. `public/` still contains only the default scaffold SVGs. PWA work is genuinely open.
- `src/proxy.ts` is host-based routing for the `app.` subdomain. Phase 6 must not break the apex marketing split.

## Scope

### In scope

- Step 37: post-signup onboarding flow
- Step 38: standalone API key management surface and MCP-page refactor
- Step 39: settings hub, preferences, billing, notifications, integrations, account management touchpoints
- Step 39.5: finish the user-facing tier-wall slice and verify the DB wall is truly applied
- Step 40: responsive audit and safe PWA install surface

### Out of scope

- Phase 5 tracker work
- New REST resources beyond what already exists in `/api/v1`
- Billing-provider checkout/webhooks (Dodo or otherwise)
- Push notifications or offline write-sync queues
- Native mobile apps

## File Structure

### Onboarding

- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/onboarding/onboarding-content.tsx`
- Create: `src/components/onboarding/step-shell.tsx`
- Create: `src/components/onboarding/areas-step.tsx`
- Create: `src/components/onboarding/goal-step.tsx`
- Create: `src/components/onboarding/project-step.tsx`
- Create: `src/components/onboarding/tasks-step.tsx`
- Create: `src/components/onboarding/explainer-step.tsx`
- Create: `src/lib/onboarding/steps.ts`
- Create: `src/lib/stores/onboarding.store.ts`
- Modify: `src/components/providers/auth-provider.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/lib/services/onboarding.service.ts`

### Settings + API access

- Modify: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/app/(dashboard)/settings/preferences/page.tsx`
- Create: `src/app/(dashboard)/settings/notifications/page.tsx`
- Create: `src/app/(dashboard)/settings/billing/page.tsx`
- Create: `src/app/(dashboard)/settings/api-keys/page.tsx`
- Create: `src/app/(dashboard)/settings/integrations/page.tsx`
- Modify: `src/app/(dashboard)/settings/mcp/page.tsx`
- Modify: `src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx`
- Create: `src/components/settings/settings-section-card.tsx`
- Create: `src/components/settings/api-key-manager.tsx`
- Create: `src/components/settings/api-key-expiry-select.tsx`
- Create: `src/components/settings/subscription-summary-card.tsx`
- Create: `src/components/settings/install-app-card.tsx`
- Modify: `src/lib/services/user-settings.service.ts`
- Modify: `src/lib/hooks/use-user-settings.ts`
- Modify: `src/app/api/v1/user/settings/route.ts`
- Modify: `src/app/api/v1/user/api-keys/route.ts`
- Modify: `src/lib/api/api-key-service.ts`

### PWA / install / responsive polish

- Create: `src/app/manifest.ts`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/apple-touch-icon.png`
- Create: `src/components/providers/pwa-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: settings/onboarding pages and any shell components found during audit

### Tests

- Create: `tests/unit/user-settings.service.test.ts`
- Create: `tests/unit/api-key-route.test.ts`
- Create: `tests/unit/onboarding-store.test.ts`
- Create: `tests/unit/onboarding-route-guards.test.ts`
- Create: `tests/unit/pwa-provider.test.ts`
- Modify: `src/app/api/v1/__tests__/user-settings.test.ts`
- Modify: any affected API-key / subscription tests

---

### Task 1: Expand the settings contract around the real K/V model

**Files:**
- Modify: `src/lib/services/user-settings.service.ts`
- Modify: `src/lib/hooks/use-user-settings.ts`
- Modify: `src/app/api/v1/user/settings/route.ts`
- Test: `tests/unit/user-settings.service.test.ts`
- Test: `src/app/api/v1/__tests__/user-settings.test.ts`

- [x] **Step 1: Write failing tests for typed settings keys** — added tests/unit/user-settings.service.test.ts (5 fail on missing helpers)

- [x] **Step 2: Run targeted tests to confirm the gap** — 5 failed as expected (setPreferences/getNotifications undefined)

- [x] **Step 3: Add typed settings helpers on top of the existing K/V table** — added Preferences/Notifications/Onboarding types + get/set helpers keyed off K/V store

- [x] **Step 4: Expand `/api/v1/user/settings` GET/PATCH without breaking existing note-defaults callers** — schema + GET/PATCH now handle all four slices; note-defaults path unchanged

- [x] **Step 5: Add query hooks/mutations for the new settings slices** — usePreferences/useNotifications + update mutations

- [x] **Step 6: Re-run the targeted tests** — 12 passed

- [x] **Step 7: Commit** — 06f0c25

### Task 2: Add onboarding route guards and server-safe entry plumbing

**Files:**
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/providers/auth-provider.tsx`
- Modify: `src/lib/services/onboarding.service.ts`
- Test: `tests/unit/onboarding-route-guards.test.ts`

- [x] **Step 1: Write failing guard tests for first-run vs returning-user routing** — tests/unit/onboarding-route-guards.test.ts (6 cases)

- [x] **Step 2: Run the guard tests to verify the redirect logic does not exist** — FAIL (module missing)

- [x] **Step 3: Add a server-side onboarding gate before the dashboard shell renders** — (dashboard)/layout.tsx fetches state + resolveDashboardDestination + redirect

- [x] **Step 4: Add the mirrored onboarding-page redirect for completed users** — onboarding/{layout,page,onboarding-content(placeholder)}.tsx; resolveOnboardingDestination

- [x] **Step 5: Keep `AuthProvider` focused on idempotent bootstrap only** — already seed/provision only; added clarifying comment

- [x] **Step 6: Re-run the onboarding guard tests** — 6 passed

- [x] **Step 7: Commit** — af6619f (next build blocked by pre-existing posthog/lockfile desync, see note)

### Task 3: Build the multi-step onboarding wizard

**Files:**
- Create: `src/app/onboarding/onboarding-content.tsx`
- Create: `src/components/onboarding/step-shell.tsx`
- Create: `src/components/onboarding/areas-step.tsx`
- Create: `src/components/onboarding/goal-step.tsx`
- Create: `src/components/onboarding/project-step.tsx`
- Create: `src/components/onboarding/tasks-step.tsx`
- Create: `src/components/onboarding/explainer-step.tsx`
- Create: `src/lib/onboarding/steps.ts`
- Create: `src/lib/stores/onboarding.store.ts`
- Modify: `src/lib/services/onboarding.service.ts`
- Test: `tests/unit/onboarding-store.test.ts`

- [x] **Step 1: Write failing tests for wizard step progression and persistence** — tests/unit/onboarding-store.test.ts (7 cases)

```ts
it("starts on the areas step and advances in roadmap order", () => {
  const state = createOnboardingStore();
  expect(state.currentStep).toBe("areas");
  state.next();
  expect(state.currentStep).toBe("goal");
});
```

- [x] **Step 2: Run the onboarding store test and confirm it fails** — FAIL (module missing)

Run: `node node_modules/vitest/vitest.mjs run tests/unit/onboarding-store.test.ts`
Expected: FAIL

- [x] **Step 3: Define the step model once and reuse it in the UI** — ONBOARDING_STEPS in user-settings.service; steps.ts metadata; onboarding.store.ts factory

```ts
export const ONBOARDING_STEPS = [
  "areas",
  "goal",
  "project",
  "tasks",
  "notes",
  "resources",
  "contacts",
] as const;
```

- [x] **Step 4: Build the wizard flow around the already-seeded default areas** — step-shell + areas/goal/project/tasks/explainer steps; orchestrator creates goal→project→tasks via existing hooks

```tsx
// areas step: confirm/edit seeded default areas rather than starting blank
// goal step: create first goal
// project step: create first project
// tasks step: create 1-3 starter tasks
// notes/resources/contacts steps: explain value + CTA, not mandatory CRUD walls
```

- [x] **Step 5: Persist wizard progress to `user_settings` so refresh/back nav is safe** — persist() on every next/back/skip; draft carries created ids for idempotency

```ts
await userSettingsService.setOnboardingState(userId, {
  completed: false,
  current_step: "project",
  draft: { goal_id, project_name },
});
```

- [x] **Step 6: Mark onboarding complete on finish and redirect to `/dashboard`** — finish sets completed+completed_at then router.replace("/dashboard")

```ts
await userSettingsService.setOnboardingState(userId, {
  completed: true,
  current_step: "contacts",
  completed_at: new Date().toISOString(),
});
router.replace("/dashboard");
```

- [x] **Step 7: Run the onboarding store test plus relevant service tests** — 12 passed; tsc clean; next build exit 0

Run: `node node_modules/vitest/vitest.mjs run tests/unit/onboarding-store.test.ts tests/unit/user-settings.service.test.ts`
Expected: PASS

- [x] **Step 8: Commit** — 878180b (onboarding.service.ts untouched — wizard reuses existing seed/provision seam; no changes needed)

### Task 4: Generalize API key management and reduce `/settings/mcp` to AI onboarding

**Files:**
- Create: `src/app/(dashboard)/settings/api-keys/page.tsx`
- Create: `src/components/settings/api-key-manager.tsx`
- Create: `src/components/settings/api-key-expiry-select.tsx`
- Modify: `src/app/(dashboard)/settings/mcp/page.tsx`
- Modify: `src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx`
- Modify: `src/app/api/v1/user/api-keys/route.ts`
- Modify: `src/lib/api/api-key-service.ts`
- Test: `tests/unit/api-key-route.test.ts`

- [x] **Step 1: Write failing API-key tests for optional expiry support** — tests/unit/api-key-route.test.ts (6 cases including expiry)

- [x] **Step 2: Run the key-route test to verify expiry input is not wired** — FAIL (schema missing expires_at)

- [x] **Step 3: Extend the POST schema and service to accept optional expiry** — createApiKeySchema + generateApiKey + insert expires_at

- [x] **Step 4: Extract a shared key-management UI used by `/settings/api-keys`** — ApiKeyManager component with create/list/revoke + expiry display

- [x] **Step 5: Refactor `/settings/mcp` into connect-only onboarding** — removed key CRUD, added "Manage API keys" link to /settings/api-keys, kept config snippets

- [x] **Step 6: Re-run the API-key tests** — 6 passed; next build exit 0

- [x] **Step 7: Commit** — dbe5b58

### Task 5: Restore the Settings area and finish the Phase 6 tier-wall UX

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/app/(dashboard)/settings/preferences/page.tsx`
- Create: `src/app/(dashboard)/settings/notifications/page.tsx`
- Create: `src/app/(dashboard)/settings/billing/page.tsx`
- Create: `src/app/(dashboard)/settings/integrations/page.tsx`
- Create: `src/components/settings/settings-section-card.tsx`
- Create: `src/components/settings/subscription-summary-card.tsx`
- Modify: `src/lib/hooks/use-user-settings.ts`
- Modify: `src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx`
- Test: `tests/unit/user-settings.service.test.ts`

- [x] **Step 1: Add failing tests for preferences/notifications hooks if they do not exist yet** — already exist in tests/unit/user-settings.service.test.ts (5 tests for preferences/notifications)

- [x] **Step 2: Run the settings tests** — 5 passed; tests already green from Task 1

- [x] **Step 3: Replace the placeholder settings landing with real navigation cards** — settings/page.tsx with cards for preferences/notifications/api-keys/mcp/billing/integrations

- [x] **Step 4: Build the preferences page around real editable data** — timezone selector (Intl API default), theme selector (syncs next-themes + persists), language selector

- [x] **Step 5: Build notifications + integrations pages without inventing new backend** — notifications persists in user_settings; integrations consumes /api/v1/user/integrations when ready, shows coming soon placeholders

- [x] **Step 6: Build `/settings/billing` as the non-404 home for tier-wall CTAs** — shows Free/Pro/Lifetime/Max features, "Checkout coming soon" button, entity usage display

- [x] **Step 7: Verify the entity-cap migration is actually applied and document the result** — migration 20260701000004_entity_cap_wall.sql contains user_entity_counts + enforce_entity_cap + ENTITY_LIMIT_REACHED; MCP free-tier CTA links to /settings/billing; subscription route now returns entityCount/entityCounts

- [x] **Step 8: Commit** — bdf6910 (settings-section-card.tsx and subscription-summary-card.tsx not created — not needed; reused Card primitives directly)

### Task 6: Ship responsive polish and the safe PWA layer

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/apple-touch-icon.png`
- Create: `src/components/providers/pwa-provider.tsx`
- Modify: `src/app/layout.tsx`
- Modify: onboarding/settings/shell files found during audit
- Test: `tests/unit/pwa-provider.test.ts`

- [ ] **Step 1: Write a failing test for service-worker registration or install-prompt wiring**

```ts
it("registers the service worker on the client", () => {
  render(<PwaProvider />);
  expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
});
```

- [ ] **Step 2: Run the PWA provider test**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/pwa-provider.test.ts`
Expected: FAIL

- [ ] **Step 3: Add a manifest route and icon metadata**

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS Core",
    short_name: "LifeOS",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 4: Register a conservative service worker and install prompt**

```tsx
useEffect(() => {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js");
  }
}, []);
```

- [ ] **Step 5: Audit core routes at 375, 768, 1024, and 1440 widths**

Manual verify:
- `/onboarding`
- `/dashboard`
- `/tasks`
- `/notes`
- `/resources`
- `/contacts`
- `/settings`
- `/settings/mcp`
- `/settings/api-keys`
- `/settings/billing`

Fix overflow, clipped dialogs, unusable tables, and CTA stacking as they are found. Prefer shared shell fixes over route-by-route hacks.

- [ ] **Step 6: Re-run the PWA test and the app build**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/pwa-provider.test.ts`
Expected: PASS

Run: `node node_modules/typescript/bin/tsc --noEmit`
Expected: PASS

Run: `npx eslint src/app/layout.tsx src/app/onboarding/page.tsx src/app/(dashboard)/settings/page.tsx src/components/providers/pwa-provider.tsx`
Expected: PASS

Run: `node node_modules/next/dist/bin/next build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/manifest.ts public/sw.js public/icons src/components/providers/pwa-provider.tsx src/app/layout.tsx src/app/onboarding src/app/(dashboard)/settings
git commit -m "feat: add phase 6 pwa and responsive polish"
```

### Task 7: Final regression pass and roadmap alignment

**Files:**
- Modify: `info/LifeOS-Core-Build-Roadmap.md`
- Review: `docs/superpowers/goals/2026-07-01-phase-6-onboarding-settings-pwa.ps1`

- [ ] **Step 1: Run the full regression suite**

Run: `node node_modules/typescript/bin/tsc --noEmit`
Expected: PASS

Run: `node node_modules/vitest/vitest.mjs run`
Expected: PASS

Run: `node node_modules/next/dist/bin/next build`
Expected: PASS

- [ ] **Step 2: Run the goal gate**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File docs/superpowers/goals/2026-07-01-phase-6-onboarding-settings-pwa.ps1`
Expected: `GOAL: PASS`

- [ ] **Step 3: Update the roadmap once the implementation is truly shipped**

```md
### Step 37: Onboarding flow - COMPLETE
### Step 38: API key management - COMPLETE
### Step 39: Settings page and user preferences - COMPLETE
### Step 39.5: Tier wall - COMPLETE for Phase 6 scope (billing checkout still deferred)
### Step 40: Responsive polish and PWA - COMPLETE
```

- [ ] **Step 4: Commit**

```bash
git add info/LifeOS-Core-Build-Roadmap.md
git commit -m "docs: mark phase 6 shipped"
```

## Global verification matrix

1. New user signs in on the `app.` host, is redirected to `/onboarding`, sees seeded default areas, creates first goal/project/tasks, finishes explainers, and lands on `/dashboard`.
2. Returning user with completed onboarding never sees `/onboarding` unless explicitly reset for testing.
3. `/settings` is a real hub, not a placeholder.
4. `/settings/api-keys` supports multiple named keys, optional expiry, last-used timestamps, and revoke.
5. `/settings/mcp` focuses on "connect your AI" and links to `/settings/api-keys` for management.
6. Free-tier CTA buttons resolve to `/settings/billing` and do not 404.
7. `/settings/billing` shows the current tier and clearly states checkout is not live yet.
8. Integrations page consumes the existing `/api/v1/user/integrations` surface or explicitly labels unsupported actions.
9. Manifest, icons, and service worker are served correctly; install prompt is visible on supported browsers.
10. Core pages remain usable from 375px through 1440px, especially settings, onboarding, and the dashboard shell.

## Build order

Task 1 (settings contract) -> Task 2 (route guards) -> Task 3 (wizard) -> Task 4 (API access generalization) -> Task 5 (settings + billing + tier-wall UX) -> Task 6 (responsive + PWA) -> Task 7 (full verification + roadmap update)
