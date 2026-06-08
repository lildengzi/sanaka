# Sanaka Tools XP build + installer script
# Single entry point for Windows builds
# Targets: Windows XP through Windows 11+

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = Split-Path -Parent $ScriptDir
$RepoDir = Split-Path -Parent $ProjectDir

$SrcFile = Join-Path $ProjectDir "src\sanaka_tools.c"
$DistDir = Join-Path $ProjectDir "dist"
$OutExe = Join-Path $DistDir "sanaka_clipboard.exe"
$NsiFile = Join-Path $ProjectDir "installer\sanaka-tools.nsi"

# Known MinGW32 gcc locations
$gccCandidates = @()
# Env var
if ($env:MINGW32_GCC) { $gccCandidates += $env:MINGW32_GCC }
# PATH
$p = Get-Command i686-w64-mingw32-gcc.exe -ErrorAction SilentlyContinue
if ($p) { $gccCandidates += $p.Source }
$p = Get-Command gcc.exe -ErrorAction SilentlyContinue
if ($p) { $gccCandidates += $p.Source }
# Repo-relative
$gccCandidates += Join-Path $RepoDir "dev\toolchains\mingw32\bin\i686-w64-mingw32-gcc.exe"
$gccCandidates += Join-Path $RepoDir "dev\toolchains\mingw32\bin\gcc.exe"
# Env dir
if ($env:MINGW32_DIR) { $gccCandidates += Join-Path $env:MINGW32_DIR "i686-w64-mingw32-gcc.exe" }
if ($env:MINGW32_DIR) { $gccCandidates += Join-Path $env:MINGW32_DIR "gcc.exe" }
# Known Pier project path
$gccCandidates += "E:\backup\pier-2.0.0-beta1\dev\toolchains\mingw32\bin\i686-w64-mingw32-gcc.exe"
$gccCandidates += "E:\backup\pier-2.0.0-beta1\dev\toolchains\mingw32\bin\gcc.exe"

$gcc = $null
foreach ($c in $gccCandidates) {
    if ($c -and (Test-Path $c)) { $gcc = (Resolve-Path $c).Path; break }
}

# Known NSIS makensis locations
$nsisCandidates = @()
if ($env:MAKENSIS) { $nsisCandidates += $env:MAKENSIS }
$p = Get-Command makensis.exe -ErrorAction SilentlyContinue
if ($p) { $nsisCandidates += $p.Source }
if ($env:NSIS_DIR) { $nsisCandidates += Join-Path $env:NSIS_DIR "makensis.exe" }
$nsisCandidates += "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
$nsisCandidates += "$env:ProgramFiles\NSIS\makensis.exe"

$makensis = $null
foreach ($c in $nsisCandidates) {
    if ($c -and (Test-Path $c)) { $makensis = (Resolve-Path $c).Path; break }
}

if (-not $gcc) {
    Write-Error "[ERROR] MinGW32 gcc not found. Set MINGW32_DIR or MINGW32_GCC."
    exit 1
}

if (-not $makensis) {
    Write-Error "[ERROR] makensis not found. Install NSIS 3.x"
    exit 1
}

Write-Host "[FOUND] gcc: $gcc"
Write-Host "[FOUND] makensis: $makensis"
Write-Host "[1/2] Compiling sanaka_clipboard.exe ..."

$Mingw32Dir = Split-Path -Parent $gcc
$env:PATH = "$Mingw32Dir;$env:PATH"

if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

& $gcc -std=c89 -Os -s -mwindows -DWINVER=0x0501 -D_WIN32_WINNT=0x0501 -Wall -Wextra -o $OutExe $SrcFile -lws2_32 -liphlpapi -lshell32
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Compilation failed (exit $LASTEXITCODE)"
    exit 1
}
Write-Host "[OK] $OutExe"

Write-Host "[2/2] Building setup.exe ..."

& $makensis $NsiFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Installer build failed (exit $LASTEXITCODE)"
    exit 1
}

Write-Host "[OK] Setup installer built!"
Get-ChildItem $DistDir | Select-Object Name, Length
