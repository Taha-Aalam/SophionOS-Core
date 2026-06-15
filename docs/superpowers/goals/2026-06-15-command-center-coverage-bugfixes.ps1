<#
.SYNOPSIS
  Completion goal for the "Command Center — Coverage & Workflow Bugfixes" plan.
  docs/superpowers/plans/2026-06-15-command-center-coverage-bugfixes.md

  Exits 0 ("GOAL: PASS") only when EVERY success criterion below passes.
  Otherwise exits 1 ("GOAL: FAIL"). Run from the repo root:
      pwsh docs/superpowers/goals/2026-06-15-command-center-coverage-bugfixes.ps1
#>

$ErrorActionPreference = 'Stop'
$fail = $false
function Check { param([bool]$ok, [string]$msg)
  if ($ok) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
  else     { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:fail = $true }
}
function Has { param([string]$path, [string]$pattern)
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  return ((Select-String -LiteralPath $path -Pattern $pattern -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1)
}

Write-Host "=== Command Center coverage bugfixes — completion goal ===" -ForegroundColor Cyan

# ─────────────────────────────────────────────────────────────
# 1. New / modified files exist
# ─────────────────────────────────────────────────────────────
Write-Host "`n[1] Required files" -ForegroundColor Cyan
$required = @(
  'src/lib/utils/area-urls.ts'
  'tests/unit/area-urls.test.ts'
  'src/lib/utils/contact-input.ts'
  'tests/unit/contact-input.test.ts'
  'src/components/entities/topic-dialog.tsx'
  'tests/unit/topic-dialog.test.tsx'
  'tests/unit/command-palette.test.tsx'
  'src/components/layout/command-palette.tsx'
)
foreach ($f in $required) { Check (Test-Path -LiteralPath $f) "File exists: $f" }

# ─────────────────────────────────────────────────────────────
# 2. URL + contact helpers
# ─────────────────────────────────────────────────────────────
Write-Host "`n[2] Helpers" -ForegroundColor Cyan
Check (Has 'src/lib/utils/area-urls.ts' 'buildAreaDetailHref') "area-urls exports buildAreaDetailHref"
Check (Has 'src/lib/utils/contact-input.ts' 'buildContactCreateInput') "contact-input exports buildContactCreateInput"

# Duplicated mapper removed from both contact files (now importing the shared one)
$contactsList   = 'src/app/(dashboard)/contacts/contacts-content.tsx'
$contactsDetail = 'src/app/(dashboard)/contacts/[id]/contact-detail-content.tsx'
Check (Has $contactsList 'buildContactCreateInput')   "contacts-content imports buildContactCreateInput"
Check (Has $contactsDetail 'buildContactCreateInput') "contact-detail-content imports buildContactCreateInput"
Check (-not (Has $contactsList 'function buildCreateInput'))   "contacts-content no longer defines a local buildCreateInput"
Check (-not (Has $contactsDetail 'function buildCreateInput')) "contact-detail-content no longer defines a local buildCreateInput"

# ─────────────────────────────────────────────────────────────
# 3. TopicDialog extraction
# ─────────────────────────────────────────────────────────────
Write-Host "`n[3] TopicDialog extraction" -ForegroundColor Cyan
Check (Has 'src/components/entities/topic-dialog.tsx' 'export function TopicDialog') "topic-dialog exports TopicDialog"
$topicsContent = 'src/app/(dashboard)/topics/topics-content.tsx'
Check (Has $topicsContent 'TopicDialog')             "topics-content uses TopicDialog"
Check (-not (Has $topicsContent 'DialogTitle'))      "topics-content inline Dialog removed (no DialogTitle left)"

# ─────────────────────────────────────────────────────────────
# 4. Command palette — navigation parity (bugs 1-3)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[4] Navigation parity" -ForegroundColor Cyan
$cp = 'src/components/layout/command-palette.tsx'
Check (Has $cp 'coreNavItems')                       "palette reuses coreNavItems (sidebar order + icons)"
Check (Has $cp 'systemNavItems')                     "palette reuses systemNavItems"
# Sidebar emoji icons should be referenced (not the old lucide nav set)
Check (Has $cp 'AreaEmoji|TaskEmoji|ResourceEmoji|TagEmoji') "palette uses sidebar emoji icons"

# ─────────────────────────────────────────────────────────────
# 5. Command palette — eight create dialogs (bugs 4-11)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[5] Create dialogs" -ForegroundColor Cyan
Check (Has $cp 'createEntity')        "createEntity state wired"
foreach ($d in @('AreaDialog','GoalDialog','ProjectDialog','TaskDialog','NoteEditorDialog','ContactDialog','ResourceDialog','TopicDialog')) {
  Check (Has $cp $d) "palette mounts $d"
}
Check (Has $cp 'buildContactCreateInput') "palette maps contact form values via buildContactCreateInput"

# ─────────────────────────────────────────────────────────────
# 6. Command palette — detail nav + task/resource edit (bugs 12-16)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[6] Detail nav + edit dialogs" -ForegroundColor Cyan
Check (Has $cp 'buildAreaDetailHref')  "areas navigate via buildAreaDetailHref"
Check (Has $cp '/topics/')             "topics navigate to detail page"
Check (Has $cp '/contacts/')           "contacts navigate to detail page (not list)"
Check (Has $cp 'editTask')             "task edit intent wired"
Check (Has $cp 'editResource')         "resource edit intent wired"
Check (Has $cp 'useAreas')             "palette queries areas for search"
Check (Has $cp 'useTopics')            "palette queries topics for search"
# Legacy inline quick-create flow removed
Check (-not (Has $cp 'CREATE_TASK_RE')) "legacy inline create regex removed"

# ─────────────────────────────────────────────────────────────
# 7. Plan hygiene — no unresolved placeholders
# ─────────────────────────────────────────────────────────────
Write-Host "`n[7] Plan hygiene" -ForegroundColor Cyan
$plan = 'docs/superpowers/plans/2026-06-15-command-center-coverage-bugfixes.md'
foreach ($needle in @('TBD','FIXME','fill in details','XXX')) {
  $hits = if (Test-Path $plan) { (Select-String -Path $plan -Pattern $needle -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count } else { 0 }
  Check ($hits -eq 0) "Plan has no '$needle' placeholder"
}

# ─────────────────────────────────────────────────────────────
# 8. tsc --noEmit
# ─────────────────────────────────────────────────────────────
Write-Host "`n[8] tsc --noEmit" -ForegroundColor Cyan
pnpm tsc --noEmit | Out-Host
Check ($LASTEXITCODE -eq 0) "pnpm tsc --noEmit passes"

# ─────────────────────────────────────────────────────────────
# 9. vitest
# ─────────────────────────────────────────────────────────────
Write-Host "`n[9] vitest run" -ForegroundColor Cyan
pnpm vitest run | Out-Host
Check ($LASTEXITCODE -eq 0) "pnpm vitest run passes"

# ─────────────────────────────────────────────────────────────
# 10. lint
# ─────────────────────────────────────────────────────────────
Write-Host "`n[10] lint" -ForegroundColor Cyan
pnpm lint | Out-Host
$lintExit = $LASTEXITCODE
if ($lintExit -ne 0) {
  Write-Host "  [info] 'pnpm lint' nonzero/absent — falling back to biome" -ForegroundColor Yellow
  pnpm biome check . | Out-Host
  $lintExit = $LASTEXITCODE
}
Check ($lintExit -eq 0) "lint passes"

# ─────────────────────────────────────────────────────────────
# 11. build
# ─────────────────────────────────────────────────────────────
Write-Host "`n[11] build" -ForegroundColor Cyan
pnpm build | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host "  [retry] build failed — clearing Turbopack .next/lock + .next/build and retrying once" -ForegroundColor Yellow
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue '.next/lock','.next/build'
  pnpm build | Out-Host
}
Check ($LASTEXITCODE -eq 0) "pnpm build passes"

# ─────────────────────────────────────────────────────────────
# Final verdict
# ─────────────────────────────────────────────────────────────
if ($fail) { Write-Host "`nGOAL: FAIL" -ForegroundColor Red; exit 1 }
else       { Write-Host "`nGOAL: PASS" -ForegroundColor Green; exit 0 }
