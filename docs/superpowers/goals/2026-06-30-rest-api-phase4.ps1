<#
.SYNOPSIS
  Completion goal for the "Phase 4 REST API" initiative.
  Drives the full REST API implementation for SophionOS.

  Architecture context: SophionOS has NO API routes today. All data access
  is browser→Supabase via supabase-js + Clerk JWT + Postgres RLS. This phase
  adds a versioned REST API at /api/v1/ as an additional access path.

  Prerequisite: All 12 service files must be refactored to accept injectable
  supabase client (Step 0). Everything depends on this.

  Verifies the gated steps:
    [0] Service refactor — all 12 services accept injectable supabase client
    [1] API infrastructure — auth, response, validation, pagination, rate-limit files
    [2] API key system — migration + api-key-service.ts
    [3] Route directory structure — all endpoint files exist
    [4] Route handlers — each GET/POST/PATCH/DELETE handler wired and working
    [5] Query parameter support — all filter/view parameters accepted
    [6] Tests — test files per route category
    [7] Verification gate — tsc / vitest / next build all exit 0

  Exits 0 ("GOAL: PASS") only when EVERY gated criterion passes.
  Otherwise exits 1 ("GOAL: FAIL"). Run from the repo root:
      powershell -NoProfile -ExecutionPolicy Bypass -File docs/superpowers/goals/2026-06-30-rest-api-phase4.ps1
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
function HasLiteral { param([string]$path, [string]$text)
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  return ((Select-String -LiteralPath $path -Pattern $text -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1)
}
function HasLiteralAny { param([string]$text)
  $serviceFiles = Get-ChildItem -Path 'src/lib/services/*.service.ts' -Recurse -File -ErrorAction SilentlyContinue
  foreach ($f in $serviceFiles) {
    if ((Select-String -LiteralPath $f.FullName -Pattern $text -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
      return $true
    }
  }
  return $false
}
function AnyHasLiteral { param([string]$glob, [string]$text)
  $files = Get-ChildItem -Path $glob -Recurse -File -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    if ((Select-String -LiteralPath $f.FullName -Pattern $text -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
      return $true
    }
  }
  return $false
}
function CountFiles { param([string]$glob, [string]$leaf)
  (Get-ChildItem -Path $glob -Recurse -File -Filter $leaf -ErrorAction SilentlyContinue | Measure-Object).Count
}

Write-Host "=== Phase 4 REST API - completion goal ===" -ForegroundColor Cyan

# -------------------------------------------------------------------
# [0] Service refactor: all 12 services accept injectable supabase
# -------------------------------------------------------------------
Write-Host "`n[0] Service refactor (injectable supabase client)" -ForegroundColor Cyan
$serviceFiles = @(
  'area.service.ts', 'goal.service.ts', 'project.service.ts', 'task.service.ts',
  'note.service.ts', 'resource.service.ts', 'topic.service.ts', 'contact.service.ts',
  'dashboard.service.ts', 'knowledge.service.ts', 'user-settings.service.ts',
  'onboarding.service.ts'
)
$refactoredCount = 0
foreach ($sf in $serviceFiles) {
  $path = "src/lib/services/$sf"
  if ((Test-Path $path) -and (Has $path 'options\?\.supabase|supabase\?|supabase:')) {
    $refactoredCount++
  }
}
Check ($refactoredCount -ge 12) "all 12 service files accept injectable supabase client ($refactoredCount/12)"

# Check at least one method in each service uses the options param for deep verification
Check (Has 'src/lib/services/area.service.ts' 'options\?\.supabase')  "area.service uses options.supabase"
Check (Has 'src/lib/services/goal.service.ts' 'options\?\.supabase')  "goal.service uses options.supabase"
Check (Has 'src/lib/services/project.service.ts' 'options\?\.supabase') "project.service uses options.supabase"
Check (Has 'src/lib/services/task.service.ts' 'options\?\.supabase')   "task.service uses options.supabase"
Check (Has 'src/lib/services/note.service.ts' 'options\?\.supabase')   "note.service uses options.supabase"
Check (Has 'src/lib/services/resource.service.ts' 'options\?\.supabase') "resource.service uses options.supabase"
Check (Has 'src/lib/services/topic.service.ts' 'options\?\.supabase')  "topic.service uses options.supabase"
Check (Has 'src/lib/services/contact.service.ts' 'options\?\.supabase') "contact.service uses options.supabase"
Check (Has 'src/lib/services/dashboard.service.ts' 'options\?\.supabase') "dashboard.service uses options.supabase"
Check (Has 'src/lib/services/knowledge.service.ts' 'options\?\.supabase') "knowledge.service uses options.supabase"
Check (Has 'src/lib/services/user-settings.service.ts' 'options\?\.supabase') "user-settings.service uses options.supabase"
Check (Has 'src/lib/services/onboarding.service.ts' 'options\?\.supabase') "onboarding.service uses options.supabase"

# -------------------------------------------------------------------
# [1] API infrastructure
# -------------------------------------------------------------------
Write-Host "`n[1] API infrastructure files" -ForegroundColor Cyan
Check (Test-Path 'src/lib/api/api-response.ts')          "api-response.ts exists"
Check (Test-Path 'src/lib/api/api-auth.ts')              "api-auth.ts exists"
Check (Test-Path 'src/lib/api/api-validator.ts')         "api-validator.ts exists"
Check (Test-Path 'src/lib/api/rate-limiter.ts')          "rate-limiter.ts exists"
Check (Test-Path 'src/lib/api/pagination.ts')            "pagination.ts exists"
Check (Has 'src/lib/api/api-response.ts' 'NextResponse') "api-response uses NextResponse"
Check (Has 'src/lib/api/api-auth.ts' 'requireAuth')      "api-auth exports requireAuth"
Check (Has 'src/lib/api/api-validator.ts' 'validateBody') "api-validator exports validateBody"
Check (Has 'src/lib/api/rate-limiter.ts' 'rateLimit')    "rate-limiter exports rateLimit"
Check (Has 'src/lib/api/pagination.ts' 'getPaginationParams') "pagination exports getPaginationParams"

# -------------------------------------------------------------------
# [2] API key system
# -------------------------------------------------------------------
Write-Host "`n[2] API key system" -ForegroundColor Cyan
Check (Test-Path 'src/lib/api/api-key-service.ts')                    "api-key-service.ts exists"
Check (AnyHasLiteral 'supabase/migrations' 'api_keys')                  "migration defines api_keys table"
Check (Has 'src/lib/api/api-key-service.ts' 'generateApiKey')          "api-key-service exports generateApiKey"
Check (Has 'src/lib/api/api-key-service.ts' 'validateApiKey')          "api-key-service exports validateApiKey"
Check (Has 'src/lib/api/api-key-service.ts' 'listApiKeys')             "api-key-service exports listApiKeys"
Check (Has 'src/lib/api/api-key-service.ts' 'revokeApiKey')            "api-key-service exports revokeApiKey"

# Full-infra decision (2026-06-30): subscriptions + integrations + tier-driven limits
Check (AnyHasLiteral 'supabase/migrations' 'subscriptions')            "migration defines subscriptions table"
Check (AnyHasLiteral 'supabase/migrations' 'integrations')             "migration defines integrations table"
Check (Has 'src/lib/api/rate-limiter.ts' 'tier|subscription|premium|pro') "rate-limiter is tier-driven (not hardcoded single limit)"

# -------------------------------------------------------------------
# [3] Route directory structure
# -------------------------------------------------------------------
Write-Host "`n[3] Route directory structure" -ForegroundColor Cyan
Check (Test-Path -LiteralPath 'src/app/api/v1/areas/route.ts')              "areas/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/areas/[id]/route.ts')         "areas/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/goals/route.ts')              "goals/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/goals/[id]/route.ts')         "goals/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/projects/route.ts')           "projects/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/projects/[id]/route.ts')      "projects/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/tasks/route.ts')              "tasks/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/tasks/[id]/route.ts')         "tasks/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/notes/route.ts')              "notes/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/notes/[id]/route.ts')         "notes/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/resources/route.ts')          "resources/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/resources/[id]/route.ts')     "resources/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/topics/route.ts')             "topics/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/topics/[id]/route.ts')        "topics/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/contacts/route.ts')           "contacts/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/contacts/[id]/route.ts')      "contacts/[id]/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/dashboard/today/route.ts')    "dashboard/today/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/inbox/route.ts')              "inbox/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/my-day/route.ts')             "my-day/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/knowledge/search/route.ts')   "knowledge/search/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/user/settings/route.ts')      "user/settings/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/user/api-keys/route.ts')      "user/api-keys/route.ts exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/user/integrations/route.ts')  "user/integrations/route.ts exists"

# Notes junction + derived model (notebooks = note_notebooks junction; related = derived from shared notebooks)
Check (Test-Path -LiteralPath 'src/app/api/v1/notes/[id]/related/route.ts')   "notes related-notes route exists (derived from shared notebooks)"
Check (Test-Path -LiteralPath 'src/app/api/v1/notes/[id]/notebooks/route.ts') "notes notebooks membership route exists"
Check (Has 'src/app/api/v1/notes/route.ts' 'notebook')                        "notes list parses notebook filter/group_by"

# Additional route depth checks
Check (Test-Path -LiteralPath 'src/app/api/v1/tasks/bulk/complete/route.ts') "tasks/bulk/complete route exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/tasks/bulk/archive/route.ts')  "tasks/bulk/archive route exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/contacts/groups/route.ts')        "contacts/groups route exists"
Check (Test-Path -LiteralPath 'src/app/api/v1/contacts/[id]/log/route.ts')     "contacts/[id]/log route exists"

# -------------------------------------------------------------------
# [4] Route handler implementation
# -------------------------------------------------------------------
Write-Host "`n[4] Route handler implementation" -ForegroundColor Cyan
Check (Has 'src/app/api/v1/areas/route.ts' 'requireAuth')        "areas list route calls requireAuth"
Check (Has 'src/app/api/v1/areas/route.ts' 'export async')       "areas list route exports async handlers"
$areaDetailRoute = 'src/app/api/v1/areas/[id]/route.ts'
Check ((Test-Path -LiteralPath $areaDetailRoute) -and (Has $areaDetailRoute 'requireAuth')) "areas detail route calls requireAuth"

# Check routes use the response helpers
$routeFiles = Get-ChildItem -Path 'src/app/api/v1' -Recurse -File -Filter 'route.ts' -ErrorAction SilentlyContinue
$routesWithResponseHelpers = 0
foreach ($rf in $routeFiles) {
  if ((Select-String -LiteralPath $rf.FullName -Pattern 'success|error|created|paginated' -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
    $routesWithResponseHelpers++
  }
}
$totalRouteFiles = ($routeFiles | Measure-Object).Count
Check ($routesWithResponseHelpers -ge $totalRouteFiles) "$routesWithResponseHelpers/$totalRouteFiles route files use response helpers"

# Check catch-all error handlers exist
$routesWithErrorHandling = 0
foreach ($rf in $routeFiles) {
  if ((Select-String -LiteralPath $rf.FullName -Pattern 'try\b' -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
    $routesWithErrorHandling++
  }
}
Check ($routesWithErrorHandling -ge $totalRouteFiles) "$routesWithErrorHandling/$totalRouteFiles routes have error handling (try/catch)"

# -------------------------------------------------------------------
# [5] Query parameter support
# -------------------------------------------------------------------
Write-Host "`n[5] Query parameter support" -ForegroundColor Cyan
Check (Has 'src/app/api/v1/tasks/route.ts' 'status')            "tasks list parses status filter"
Check (Has 'src/app/api/v1/notes/route.ts' 'group_by')          "notes list parses group_by param"
Check (Has 'src/app/api/v1/resources/route.ts' 'group_by')      "resources list parses group_by param"
Check (Has 'src/app/api/v1/tasks/route.ts' 'priority')          "tasks list parses priority filter"
Check (Has 'src/app/api/v1/notes/route.ts' 'favorite')          "notes list parses favorite filter"
Check (Has 'src/app/api/v1/resources/route.ts' 'favorite')      "resources list parses favorite filter"
Check (Has 'src/app/api/v1/contacts/route.ts' 'group')          "contacts list parses group filter"
Check (Has 'src/app/api/v1/goals/route.ts' 'term')              "goals list parses term filter"

# Check pagination params used in list routes
$listRoutesWithPagination = 0
foreach ($rf in $routeFiles) {
  if ((Select-String -LiteralPath $rf.FullName -Pattern 'getPaginationParams|offset|limit|page' -ErrorAction SilentlyContinue | Measure-Object).Count -ge 2) {
    $listRoutesWithPagination++
  }
}
Check ($listRoutesWithPagination -ge 5) "at least 5 list routes use pagination params (found $listRoutesWithPagination)"

# -------------------------------------------------------------------
# [6] Tests
# -------------------------------------------------------------------
Write-Host "`n[6] Tests" -ForegroundColor Cyan
$testDir = 'src/app/api/v1/__tests__'
Check (Test-Path $testDir)                                        "API test directory exists"
Check (Test-Path "$testDir/areas.test.ts")                         "areas.test.ts exists"
Check (Test-Path "$testDir/goals.test.ts")                         "goals.test.ts exists"
Check (Test-Path "$testDir/projects.test.ts")                      "projects.test.ts exists"
Check (Test-Path "$testDir/tasks.test.ts")                         "tasks.test.ts exists"
Check (Test-Path "$testDir/notes.test.ts")                         "notes.test.ts exists"
Check (Test-Path "$testDir/resources.test.ts")                     "resources.test.ts exists"
Check (Test-Path "$testDir/topics.test.ts")                        "topics.test.ts exists"
Check (Test-Path "$testDir/contacts.test.ts")                      "contacts.test.ts exists"

# Check deeper tests
Check (Test-Path "$testDir/dashboard.test.ts")                     "dashboard.test.ts exists"
Check (Test-Path "$testDir/inbox.test.ts")                         "inbox.test.ts exists"
Check (Test-Path "$testDir/knowledge.test.ts")                     "knowledge.test.ts exists"
Check (Test-Path "$testDir/user-settings.test.ts")                 "user-settings.test.ts exists"
Check (Test-Path "$testDir/auth.test.ts")                          "auth.test.ts exists"
Check (Test-Path "$testDir/rate-limiter.test.ts")                  "rate-limiter.test.ts exists"

# Check tests cover error paths
$testFilesWithAuth = 0
$testFiles = Get-ChildItem -Path $testDir -File -Filter '*.test.ts' -ErrorAction SilentlyContinue
foreach ($tf in $testFiles) {
  if ((Select-String -LiteralPath $tf.FullName -Pattern '401|unauthorized|no token|AuthError' -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
    $testFilesWithAuth++
  }
}
$totalTestFiles = ($testFiles | Measure-Object).Count
Check ($testFilesWithAuth -ge $totalTestFiles) "$testFilesWithAuth/$totalTestFiles test files cover auth error cases"

# -------------------------------------------------------------------
# [7] Verification gate: tsc / vitest / build
# -------------------------------------------------------------------
Write-Host "`n[7] Verification gate" -ForegroundColor Cyan
function RunGate { param([string]$label, [string]$cmd)
  Write-Host "  ... running: $cmd" -ForegroundColor DarkGray
  cmd /c "$cmd > NUL 2>&1"
  $ok = ($LASTEXITCODE -eq 0)
  Check $ok "$label (exit $LASTEXITCODE)"
}
RunGate "tsc --noEmit"  "node node_modules/typescript/bin/tsc --noEmit"
RunGate "vitest run"    "node node_modules/vitest/vitest.mjs run"
RunGate "next build"    "node node_modules/next/dist/bin/next build"

# -------------------------------------------------------------------
Write-Host ""
if ($fail) { Write-Host "GOAL: FAIL" -ForegroundColor Red; exit 1 }
else       { Write-Host "GOAL: PASS" -ForegroundColor Green; exit 0 }
