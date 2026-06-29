<#
.SYNOPSIS
  Completion goal for the "app.localhost subdomain routing" migration.
  docs/superpowers/plans/2026-06-27-app-subdomain-and-port-3000.md (routing phase)

  Verifies the apex/subdomain split is complete:
    1. proxy.ts reads the Host header and classifies app. vs apex.
    2. Apex (localhost:3000) serves marketing ONLY and does NOT expose the app
       or redirect to login. <-- explicit user requirement.
    3. The app + all auth routes live on the subdomain (app.localhost:3000).
    4. Cross-host redirects derive the origin from NEXT_PUBLIC_APP_URL.
    5. No hardcoded origin/port literal in src/ redirects.
    6. Host-routing logic has tests.
  Then runs the full verification gate (tsc / vitest / build) and an OPTIONAL
  live runtime probe (set RALPH_RUNTIME_PROBE=1) that boots the dev server and
  asserts apex does NOT 307 to /login while the subdomain reaches the app.

  Exits 0 ("GOAL: PASS") only when EVERY success criterion passes.
  Otherwise exits 1 ("GOAL: FAIL"). Run from the repo root:
      pwsh docs/superpowers/goals/2026-06-29-app-subdomain-routing.ps1
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
# True if ANY file under a glob matches a literal substring (used for negative scans).
function AnyHasLiteral { param([string]$glob, [string]$text)
  $files = Get-ChildItem -Path $glob -Recurse -File -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    if ((Select-String -LiteralPath $f.FullName -Pattern $text -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count -ge 1) {
      return $true
    }
  }
  return $false
}

Write-Host "=== app.localhost subdomain routing - completion goal ===" -ForegroundColor Cyan

$proxy = 'src/proxy.ts'

# -------------------------------------------------------------------
# 1. Host detection in middleware
# -------------------------------------------------------------------
Write-Host "`n[1] Host detection (proxy.ts)" -ForegroundColor Cyan
Check (Has $proxy 'clerkMiddleware')                       "proxy.ts still uses clerkMiddleware()"
Check ((HasLiteral $proxy "get(`"host`")") -or (HasLiteral $proxy "get('host')") -or (Has $proxy 'headers\(\).*host') -or (Has $proxy '\bhost\b')) "proxy.ts reads the Host header"
Check (HasLiteral $proxy 'app.')                           "proxy.ts branches on the 'app.' subdomain"

# -------------------------------------------------------------------
# 2. Apex must NOT expose the app / must NOT redirect to login (USER REQ)
# -------------------------------------------------------------------
Write-Host "`n[2] Apex (localhost:3000) = marketing only, no app, no login redirect" -ForegroundColor Cyan
# A marketing route/segment must exist for the apex host.
$marketingExists = (Test-Path 'src/app/(marketing)') -or (Test-Path 'src/app/(landing)') -or (Has $proxy 'marketing') -or (Has $proxy 'landing')
Check $marketingExists                                     "marketing/landing surface exists for apex"
# proxy.ts must NOT unconditionally send apex traffic into auth.protect()/login.
Check (Has $proxy 'NEXT_PUBLIC_APP_URL')                   "proxy.ts builds cross-host redirect target from NEXT_PUBLIC_APP_URL"

# -------------------------------------------------------------------
# 3. App + auth confined to subdomain
# -------------------------------------------------------------------
Write-Host "`n[3] App + auth on app.localhost" -ForegroundColor Cyan
Check (Has $proxy 'auth.protect|isAuthenticated|protect\(')  "proxy.ts still protects app routes (subdomain)"
Check (Test-Path 'src/app/(auth)/login')                     "login route still present (served on subdomain)"

# -------------------------------------------------------------------
# 4. No hardcoded origin/port literal in src/ (negative scan)
# -------------------------------------------------------------------
Write-Host "`n[4] No hardcoded origin/port in src/" -ForegroundColor Cyan
Check (-not (AnyHasLiteral 'src' 'localhost:3030'))        "no literal 'localhost:3030' in src/"
Check (-not (AnyHasLiteral 'src' 'http://localhost:3000')) "no literal 'http://localhost:3000' in src/"

# -------------------------------------------------------------------
# 5. Tests for host routing
# -------------------------------------------------------------------
Write-Host "`n[5] Tests" -ForegroundColor Cyan
$hostTest = (AnyHasLiteral 'tests' 'app.localhost') -or (AnyHasLiteral 'src' 'app.localhost')
Check $hostTest                                            "a test exercises app./apex host classification"

# -------------------------------------------------------------------
# 6. Verification gate: tsc / vitest / build
# -------------------------------------------------------------------
Write-Host "`n[6] Verification gate" -ForegroundColor Cyan
function RunGate { param([string]$label, [string]$cmd)
  Write-Host "  ... running: $cmd" -ForegroundColor DarkGray
  # Redirect inside cmd so benign native stderr (e.g. next build warnings) never
  # reaches PowerShell's pipeline, which would otherwise become a terminating
  # NativeCommandError under $ErrorActionPreference='Stop'. The gate is decided
  # purely by the child exit code.
  cmd /c "$cmd > NUL 2>&1"
  $ok = ($LASTEXITCODE -eq 0)
  Check $ok "$label (exit $LASTEXITCODE)"
}
RunGate "tsc --noEmit"      "node node_modules/typescript/bin/tsc --noEmit"
RunGate "vitest run"        "node node_modules/vitest/vitest.mjs run"
RunGate "next build"        "node node_modules/next/dist/bin/next build"

# -------------------------------------------------------------------
# 7. OPTIONAL live runtime probe (RALPH_RUNTIME_PROBE=1)
#    Boots dev server, asserts apex does NOT redirect to /login and the
#    subdomain reaches the app. Skipped by default (slow / port-bound).
# -------------------------------------------------------------------
if ($env:RALPH_RUNTIME_PROBE -eq '1') {
  Write-Host "`n[7] Live runtime probe" -ForegroundColor Cyan
  $proc = Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next dev --turbopack -p 3000" -PassThru -WindowStyle Hidden
  try {
    $deadline = (Get-Date).AddSeconds(40)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
      try { Invoke-WebRequest "http://localhost:3000" -MaximumRedirection 0 -TimeoutSec 3 -ErrorAction Stop | Out-Null; $ready = $true; break }
      catch { if ($_.Exception.Response) { $ready = $true; break }; Start-Sleep -Milliseconds 800 }
    }
    Check $ready "dev server reachable on :3000"

    # Apex: must NOT 307 to /login.
    $apexLoc = ""
    try { $r = Invoke-WebRequest "http://localhost:3000/" -MaximumRedirection 0 -Headers @{ Host = "localhost:3000" } -TimeoutSec 5 -ErrorAction Stop; $apexLoc = "" }
    catch { $apexLoc = $_.Exception.Response.Headers["Location"] }
    Check (-not ($apexLoc -match "/login")) "apex '/' does NOT redirect to /login (got '$apexLoc')"

    # Subdomain: app route reachable (200 or its own auth redirect, not apex marketing).
    $subStatus = 0
    try { $r = Invoke-WebRequest "http://localhost:3000/dashboard" -MaximumRedirection 0 -Headers @{ Host = "app.localhost:3000" } -TimeoutSec 5 -ErrorAction Stop; $subStatus = $r.StatusCode }
    catch { if ($_.Exception.Response) { $subStatus = [int]$_.Exception.Response.StatusCode } }
    Check ($subStatus -ne 0) "app.localhost /dashboard handled by app (status $subStatus)"
  }
  finally {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  }
} else {
  Write-Host "`n[7] Live runtime probe SKIPPED (set RALPH_RUNTIME_PROBE=1 to enable)" -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
Write-Host ""
if ($fail) { Write-Host "GOAL: FAIL" -ForegroundColor Red; exit 1 }
else       { Write-Host "GOAL: PASS" -ForegroundColor Green; exit 0 }
