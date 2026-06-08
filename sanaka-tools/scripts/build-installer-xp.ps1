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

function Get-DriveRoots {
    $roots = @()
    foreach ($drive in Get-PSDrive -PSProvider FileSystem) {
        if ($drive.Root) {
            $roots += $drive.Root
        }
    }
    return $roots
}

function Find-FirstFile {
    param(
        [string[]]$Candidates,
        [string[]]$SearchRoots,
        [string]$LeafName,
        [string[]]$Hints
    )

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return (Resolve-Path $candidate).Path
        }
    }

    foreach ($root in $SearchRoots) {
        if (-not $root -or -not (Test-Path $root)) {
            continue
        }
        foreach ($hint in $Hints) {
            $hintPath = Join-Path $root $hint
            if (Test-Path $hintPath) {
                $match = Get-ChildItem -Path $hintPath -Filter $LeafName -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($match) {
                    return $match.FullName
                }
            }
        }
        $fallback = Get-ChildItem -Path $root -Filter $LeafName -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($fallback) {
            return $fallback.FullName
        }
    }

    return $null
}

$DriveRoots = Get-DriveRoots

$GccCandidates = @(
    $env:MINGW32_GCC,
    (Get-Command i686-w64-mingw32-gcc.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (Get-Command gcc.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (Join-Path $RepoDir "dev\toolchains\mingw32\bin\i686-w64-mingw32-gcc.exe"),
    (Join-Path $RepoDir "dev\toolchains\mingw32\bin\gcc.exe"),
    (if ($env:MINGW32_DIR) { Join-Path $env:MINGW32_DIR "i686-w64-mingw32-gcc.exe" }),
    (if ($env:MINGW32_DIR) { Join-Path $env:MINGW32_DIR "gcc.exe" }),
    "E:\backup\pier-2.0.0-beta1\dev\toolchains\mingw32\bin\i686-w64-mingw32-gcc.exe",
    "E:\backup\pier-2.0.0-beta1\dev\toolchains\mingw32\bin\gcc.exe"
)

$gcc = Find-FirstFile -Candidates $GccCandidates -SearchRoots $DriveRoots -LeafName "i686-w64-mingw32-gcc.exe" -Hints @(
    "backup",
    "dev",
    "toolchains",
    "mingw32",
    "MinGW",
    "MinGW32",
    "msys64",
    "Program Files"
)

if (-not $gcc) {
    $gcc = Find-FirstFile -Candidates @() -SearchRoots $DriveRoots -LeafName "gcc.exe" -Hints @(
        "backup",
        "dev",
        "toolchains",
        "mingw32",
        "MinGW",
        "MinGW32",
        "msys64"
    )
}

if (-not $gcc) {
    Write-Error "[ERROR] MinGW32 gcc not found anywhere on this computer."
    exit 1
}

$MakensisCandidates = @(
    $env:MAKENSIS,
    (Get-Command makensis.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (if ($env:NSIS_DIR) { Join-Path $env:NSIS_DIR "makensis.exe" }),
    (Join-Path ${env:ProgramFiles(x86)} "NSIS\makensis.exe"),
    (Join-Path $env:ProgramFiles "NSIS\makensis.exe")
)

$makensis = Find-FirstFile -Candidates $MakensisCandidates -SearchRoots $DriveRoots -LeafName "makensis.exe" -Hints @(
    "NSIS",
    "Program Files",
    "Program Files (x86)",
    "Tools"
)

if (-not $makensis) {
    Write-Error "[ERROR] makensis.exe not found anywhere on this computer."
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

& $gcc -std=c89 -Os -s -mwindows -DWINVER=0x0501 -D_WIN32_WINNT=0x0501 -Wall -Wextra -o $OutExe $SrcFile -lws2_32
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
