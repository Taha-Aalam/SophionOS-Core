# Goal gate - Phase 6 (Onboarding, Settings, API Access, Responsive + PWA)
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File docs/superpowers/goals/2026-07-01-phase-6-onboarding-settings-pwa.ps1
#
# Exit 0 + "GOAL: PASS" only when the Phase 6 surface is really present.

$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $root

$fail = 0
function Fail($msg) { Write-Host "  FAIL: $msg"; $script:fail++ }
function Ok($msg)   { Write-Host "  ok:   $msg" }

function Need-File($rel) {
  if (Test-Path -LiteralPath (Join-Path $root $rel)) { Ok "exists $rel" }
  else { Fail "missing file $rel" }
}

function Need-InFile($rel, $pattern, $label) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { Fail "missing file $rel (for $label)"; return }
  if (Select-String -LiteralPath $p -Pattern $pattern -Quiet) { Ok $label }
  else { Fail "$label  (pattern '$pattern' not found in $rel)" }
}

function Need-InDir($dir, $glob, $pattern, $label) {
  $d = Join-Path $root $dir
  if (-not (Test-Path -LiteralPath $d)) { Fail "missing dir $dir (for $label)"; return }
  # Strip **/ prefix from glob for -like matching
  $leaf = $glob -replace '^\*\*/', ''
  $files = Get-ChildItem -LiteralPath $d -File -Recurse -ErrorAction SilentlyContinue
  $filtered = $files | Where-Object { $_.Name -like $leaf }
  $hit = $filtered | Select-String -Pattern $pattern -List -ErrorAction SilentlyContinue
  if ($hit) { Ok $label } else { Fail "$label  (pattern '$pattern' not found under $dir/$glob)" }
}

Write-Host "== Step 37: onboarding =="
Need-File 'src/app/onboarding/page.tsx'
Need-File 'src/app/onboarding/onboarding-content.tsx'
Need-InDir 'src/components/onboarding' '*.tsx' 'areas|goal|project|tasks|notes|resources|contacts' 'onboarding step components exist'
Need-InDir 'src/lib' '**/*.ts' 'getOnboardingState|setOnboardingState|onboarding' 'typed onboarding settings helpers exist'
Need-InDir 'src/app' '**/*.tsx' '/onboarding' 'dashboard/onboarding redirect wiring exists'

Write-Host "== Step 38 + 39: settings and api access =="
Need-File 'src/app/(dashboard)/settings/page.tsx'
Need-File 'src/app/(dashboard)/settings/api-keys/page.tsx'
Need-File 'src/app/(dashboard)/settings/preferences/page.tsx'
Need-File 'src/app/(dashboard)/settings/notifications/page.tsx'
Need-File 'src/app/(dashboard)/settings/billing/page.tsx'
Need-File 'src/app/(dashboard)/settings/integrations/page.tsx'
Need-InFile 'src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx' 'api-keys|Manage keys' 'mcp page links to dedicated key management'
Need-InFile 'src/app/api/v1/user/api-keys/route.ts' 'expires_at' 'api key POST accepts optional expiry'
Need-InDir 'src/lib/services' '*.ts' 'getPreferences|setPreferences|getNotifications|setNotifications' 'typed preferences and notifications helpers exist'
Need-InFile 'src/app/(dashboard)/settings/billing/page.tsx' 'Free|Pro|Lifetime|Max|checkout|coming soon|subscription' 'billing page renders tier-wall surface'

Write-Host "== Step 39.5: tier wall finish work =="
Need-File 'src/lib/api/subscription.ts'
Need-InDir 'supabase/migrations' '*.sql' 'user_entity_counts' 'entity-cap migration exists'
Need-InDir 'supabase/migrations' '*.sql' 'enforce_entity_cap' 'entity-cap trigger function exists'
Need-InDir 'supabase/migrations' '*.sql' 'ENTITY_LIMIT_REACHED' 'entity-cap error exists'
Need-InFile 'src/app/(dashboard)/settings/mcp/mcp-settings-content.tsx' '/settings/billing' 'free-tier upgrade CTA targets billing page'

Write-Host "== Step 40: responsive and pwa =="
Need-File 'src/app/manifest.ts'
Need-File 'public/sw.js'
Need-File 'public/icons/icon-192.png'
Need-File 'public/icons/icon-512.png'
Need-File 'public/icons/apple-touch-icon.png'
Need-InFile 'src/app/layout.tsx' 'PwaProvider|manifest|apple' 'root layout wires pwa metadata/provider'
Need-InDir 'src/components/providers' '*.tsx' 'serviceWorker\.register|beforeinstallprompt|Install LifeOS' 'pwa provider or install surface exists'

Write-Host "== Tests =="
Need-File 'tests/unit/user-settings.service.test.ts'
Need-File 'tests/unit/onboarding-store.test.ts'
Need-File 'tests/unit/onboarding-route-guards.test.ts'
Need-File 'tests/unit/api-key-route.test.ts'
Need-File 'tests/unit/pwa-provider.test.ts'

Write-Host "== Build / type / test gates =="
& node node_modules/typescript/bin/tsc --noEmit | Out-Null
if ($LASTEXITCODE -eq 0) { Ok 'tsc --noEmit exit 0' } else { Fail "tsc --noEmit exit $LASTEXITCODE" }

& node node_modules/vitest/vitest.mjs run | Out-Null
if ($LASTEXITCODE -eq 0) { Ok 'vitest run exit 0' } else { Fail "vitest run exit $LASTEXITCODE" }

& node node_modules/next/dist/bin/next build | Out-Null
if ($LASTEXITCODE -eq 0) { Ok 'next build exit 0' } else { Fail "next build exit $LASTEXITCODE" }

Write-Host ""
if ($fail -eq 0) { Write-Host "GOAL: PASS"; exit 0 }
else { Write-Host "GOAL: FAIL ($fail check(s) failed)"; exit 1 }
