<#
.SYNOPSIS
    Chay toan bo he thong LMS tren may local: Postgres + Mailpit, backend, main-web, admin-web.

.DESCRIPTION
    Cach dung (tai thu muc goc cua repo):
        .\run-all.ps1              # khoi dong tat ca
        .\run-all.ps1 -Stop        # dung backend, 2 web va docker compose
        .\run-all.ps1 -SkipInstall # bo qua npm install
        .\run-all.ps1 -NoBrowser   # khong tu mo trinh duyet
        .\run-all.ps1 -Status      # chi kiem tra dich vu nao dang chay

    Neu bi chan chay script:  powershell -ExecutionPolicy Bypass -File .\run-all.ps1
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$Status,
    [switch]$SkipInstall,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Continue'

$Root      = $PSScriptRoot
$BackendDir = Join-Path $Root 'backend\src\lms'
$MainWeb   = Join-Path $Root 'frontend\main-web'
$AdminWeb  = Join-Path $Root 'frontend\admin-web'
$BooksSql  = Join-Path $Root 'database\books.sql'

$ApiPort = 8080
$MainPort = 5173
$AdminPort = 5175
$ApiProbe = "http://localhost:$ApiPort/api/v1/public/books/categories"

function Write-Step($text) { Write-Host ""; Write-Host "==> $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "    [OK] $text" -ForegroundColor Green }
function Write-Warn2($text){ Write-Host "    [!]  $text" -ForegroundColor Yellow }
function Fail($text)       { Write-Host "    [X]  $text" -ForegroundColor Red; exit 1 }

function Test-Port([int]$port) {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    return [bool]$conn
}

function Stop-Port([int]$port, [string]$name) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conns) { Write-Host "    $name (cong $port): khong chay"; return }
    foreach ($procId in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
        # /T dung ca cay tien trinh (mvnw -> java, npm -> node)
        & taskkill.exe /PID $procId /T /F *> $null
    }
    Write-Ok "Da dung $name (cong $port)"
}

function Wait-Until([scriptblock]$test, [int]$timeoutSec, [string]$what) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try { if (& $test) { return $true } } catch { }
        Start-Sleep -Seconds 2
    }
    Write-Warn2 "Het $timeoutSec giay ma $what van chua san sang"
    return $false
}

function Test-Docker {
    & docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Read-DotEnv([string]$path) {
    if (-not (Test-Path $path)) { return }
    foreach ($line in Get-Content $path -Encoding UTF8) {
        $trim = $line.Trim()
        if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
        $idx = $trim.IndexOf('=')
        if ($idx -lt 1) { continue }
        $key = $trim.Substring(0, $idx).Trim()
        $value = $trim.Substring($idx + 1).Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

function Ensure-EnvFile([string]$dir) {
    $env1 = Join-Path $dir '.env'
    $example = Join-Path $dir '.env.example'
    if (-not (Test-Path $env1) -and (Test-Path $example)) {
        Copy-Item $example $env1
        Write-Warn2 "Chua co .env, da tao tu .env.example: $env1"
    }
}

# ---------------------------------------------------------------- Stop / Status
if ($Stop) {
    Write-Step 'Dung he thong'
    Stop-Port $AdminPort 'admin-web'
    Stop-Port $MainPort  'main-web'
    Stop-Port $ApiPort   'backend'
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        if (Test-Docker) {
            Push-Location $BackendDir
            try { & docker compose stop; Write-Ok 'Da dung postgres, mailpit (du lieu van giu trong volume)' }
            finally { Pop-Location }
        }
    }
    exit 0
}

if ($Status) {
    Write-Step 'Trang thai'
    foreach ($svc in @(
        @{ n = 'backend   '; p = $ApiPort },
        @{ n = 'main-web  '; p = $MainPort },
        @{ n = 'admin-web '; p = $AdminPort },
        @{ n = 'postgres  '; p = 5433 },
        @{ n = 'mailpit   '; p = 8025 })) {
        if (Test-Port $svc.p) { Write-Ok "$($svc.n) cong $($svc.p): dang chay" }
        else { Write-Warn2 "$($svc.n) cong $($svc.p): khong chay" }
    }
    exit 0
}

# ---------------------------------------------------------------- 1. Prerequisites
Write-Step '1/5 Kiem tra moi truong'
foreach ($cmd in 'docker', 'java', 'node', 'npm') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "Khong tim thay '$cmd'. Hay cai dat roi chay lai (xem RUN_GUIDE.md)."
    }
}
$javaVersion = (& java -version 2>&1 | Select-Object -First 1).ToString()
Write-Ok "java:  $javaVersion"
Write-Ok "node:  $(& node --version)   npm: $(& npm --version)"
if ($javaVersion -notmatch '"(2[5-9]|[3-9]\d)') {
    Write-Warn2 'Backend can Java 25 tro len; neu build loi hay kiem tra JAVA_HOME.'
}

Ensure-EnvFile $BackendDir
Ensure-EnvFile $MainWeb
Ensure-EnvFile $AdminWeb

# ---------------------------------------------------------------- 2. Docker
Write-Step '2/5 Docker: Postgres va Mailpit'
if (-not (Test-Docker)) {
    $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerDesktop) {
        Write-Warn2 'Docker chua chay, dang mo Docker Desktop (co the mat 1-2 phut)...'
        Start-Process $dockerDesktop
        if (-not (Wait-Until { Test-Docker } 180 'Docker')) { Fail 'Docker Desktop khong khoi dong duoc.' }
    } else {
        Fail 'Docker chua chay. Hay mo Docker Desktop roi chay lai.'
    }
}
Write-Ok 'Docker san sang'

# Volume chua ton tai = lan chay dau tien (hoac vua xoa volume).
$volumeExisted = [bool](& docker volume ls -q --filter 'name=pgdata')

Push-Location $BackendDir
try {
    & docker compose up -d --wait
    if ($LASTEXITCODE -ne 0) { Fail 'docker compose up that bai.' }
} finally { Pop-Location }
Write-Ok 'Postgres (5433) va Mailpit (UI 8025, SMTP 1025) dang chay'

$firstRun = -not $volumeExisted
if ($firstRun) {
    # docker-compose mount database/books.sql vao initdb nen schema da co san truoc khi Flyway chay,
    # Flyway se bao "non-empty schema". Lan dau: don schema, de Flyway tao lai, roi nap books.sql sau.
    Write-Warn2 'Lan chay dau tien: dang chuan bi co so du lieu cho Flyway...'
    & docker compose -f (Join-Path $BackendDir 'docker-compose.yml') exec -T postgres psql -U lms -d lms -X -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' *> $null
    if ($LASTEXITCODE -ne 0) { Fail 'Khong don duoc schema public.' }
    Write-Ok 'Da don schema; Flyway se tao lai khi backend khoi dong'
}

# ---------------------------------------------------------------- 3. Backend
Write-Step '3/5 Backend (Spring Boot, cong 8080)'
function Test-Api {
    try { return ((Invoke-WebRequest -Uri $ApiProbe -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) }
    catch { return $false }
}

$startBackend = $true
if (Test-Port $ApiPort) {
    if (Test-Api) {
        Write-Ok "Cong $ApiPort da co backend dang chay khoe, bo qua khoi dong"
        $startBackend = $false
    } else {
        # Cong bi giu boi mot tien trinh cu/hong (vd backend cu mat ket noi DB) -> dung no roi chay lai.
        $owner = Get-NetTCPConnection -State Listen -LocalPort $ApiPort -ErrorAction SilentlyContinue | Select-Object -First 1
        $ownerName = ''
        if ($owner) { $ownerName = (Get-Process -Id $owner.OwningProcess -ErrorAction SilentlyContinue).ProcessName }
        Write-Warn2 "Cong $ApiPort dang bi giu (PID $($owner.OwningProcess), $ownerName) nhung API khong tra loi 200. Dang dung de chay lai backend."
        Stop-Port $ApiPort 'backend cu'
        Start-Sleep -Seconds 2
    }
}
if ($startBackend) {
    Read-DotEnv (Join-Path $BackendDir '.env')
    if (-not $env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE = 'dev' }
    $mvnw = Join-Path $BackendDir 'mvnw.cmd'
    Start-Process -FilePath $mvnw -ArgumentList 'spring-boot:run' -WorkingDirectory $BackendDir | Out-Null
    Write-Host '    Da mo cua so backend, dang cho API san sang (lan dau co the mat 1-3 phut)...'
}
$apiReady = Wait-Until { Test-Api } 240 'backend'
if (-not $apiReady) {
    if (Test-Port $ApiPort) { Fail "Cong $ApiPort dang mo nhung API khong tra 200 ($ApiProbe). Xem cua so backend de biet loi." }
    Fail 'Backend khong len (khong co gi nghe cong 8080). Xem cua so backend: thuong la loi ket noi DB, Flyway hoac Java sai phien ban.'
}
Write-Ok "Backend dang chay: http://localhost:$ApiPort"

if ($firstRun) {
    Write-Host '    Dang nap du lieu sach mau (database\books.sql, ~6.100 sach)...'
    if (Test-Path $BooksSql) {
        Get-Content $BooksSql -Raw -Encoding UTF8 |
            & docker compose -f (Join-Path $BackendDir 'docker-compose.yml') exec -T postgres psql -U lms -d lms -X -q -v ON_ERROR_STOP=1 *> $null
        if ($LASTEXITCODE -eq 0) { Write-Ok 'Da nap du lieu sach mau' }
        else { Write-Warn2 'Nap sach mau that bai; he thong van chay nhung danh muc se trong.' }
    } else {
        Write-Warn2 "Khong thay $BooksSql, bo qua nap sach mau."
    }
}

# ---------------------------------------------------------------- 4. Frontends
function Start-Frontend([string]$dir, [int]$port, [string]$name) {
    if (Test-Port $port) { Write-Ok "${name}: cong $port da chay, bo qua"; return }
    if (-not $SkipInstall -and -not (Test-Path (Join-Path $dir 'node_modules'))) {
        Write-Host "    $name chua co node_modules, dang npm install..."
        Push-Location $dir
        try { & npm install; if ($LASTEXITCODE -ne 0) { Fail "npm install that bai o $name" } }
        finally { Pop-Location }
    }
    Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' -WorkingDirectory $dir | Out-Null
}

Write-Step '4/5 Frontend: main-web (5173) va admin-web (5175)'
Start-Frontend $MainWeb $MainPort 'main-web'
Start-Frontend $AdminWeb $AdminPort 'admin-web'

$mainUp  = Wait-Until { Test-Port $MainPort } 90 'main-web'
$adminUp = Wait-Until { Test-Port $AdminPort } 90 'admin-web'
if ($mainUp)  { Write-Ok "main-web:  http://localhost:$MainPort" }
if ($adminUp) { Write-Ok "admin-web: http://localhost:$AdminPort" }

# ---------------------------------------------------------------- 5. Summary
Write-Step '5/5 San sang'
Write-Host @"

    Doc gia (main-web)   http://localhost:$MainPort
    Quan tri (admin-web) http://localhost:$AdminPort      (chi dang nhap email + mat khau)
    API / Swagger        http://localhost:$ApiPort/swagger-ui.html
    Mailpit (xem OTP)    http://localhost:8025

    Tai khoan thu (neu volume DB cu con giu - xem RUN_GUIDE.md muc 0.1):
        admin.test@lms.local / user.test@lms.local
    Neu DB moi tao: dang ky o main-web, lay ma OTP tai Mailpit; de co quyen admin hay dat
    APP_BOOTSTRAP_ADMIN_EMAILS trong backend\src\lms\.env (xem RUN_GUIDE.md muc 3).

    Dung he thong:  .\run-all.ps1 -Stop
"@

if (-not $NoBrowser) {
    if ($mainUp)  { Start-Process "http://localhost:$MainPort" }
    if ($adminUp) { Start-Process "http://localhost:$AdminPort" }
}
