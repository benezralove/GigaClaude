<#
  es-search.ps1 - query the Everything (voidtools) index and emit TSV.
  Backends, in order of preference: es.exe CLI, then Everything's HTTP server.
  Output: SizeBytes<TAB>Modified<TAB>FullPath
  Exit codes: 0 ok, 2 bad args, 3 no backend available.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Query,
  [int]$Max = 100,
  [ValidateSet('name','path','size','date')][string]$SortBy = 'date',
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Query)) {
  Write-Error "Query is empty."
  exit 2
}

function Find-EsExe {
  $cmd = Get-Command es.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    'C:\Program Files\Everything\es.exe',
    'C:\Program Files (x86)\Everything\es.exe',
    "$env:LOCALAPPDATA\Programs\Everything\es.exe",
    "$env:USERPROFILE\Desktop\es.exe",
    "$PSScriptRoot\es.exe"
  )
  foreach ($c in $candidates) { if (Test-Path -LiteralPath $c) { return $c } }
  return $null
}

function Find-HttpPort {
  foreach ($p in 8080, 80, 8081) {
    try {
      $r = Invoke-WebRequest -Uri ("http://localhost:{0}/?s=a&json=1&count=1" -f $p) `
             -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200 -and $r.Content -match '"results"') { return $p }
    } catch { }
  }
  return $null
}

# ---- backend: es.exe ----
$es = Find-EsExe
if ($es) {
  $sortArg = switch ($SortBy) {
    'size' { '-sort-size-descending' }
    'date' { '-sort-date-modified-descending' }
    'path' { '-sort-path' }
    default { '-sort-name' }
  }
  # es.exe treats ONE quoted argument as a literal phrase. Multi-term queries must be
  # passed as SEPARATE arguments (they are ANDed). Split on whitespace, keeping "quoted
  # phrases" and path:"with spaces" intact as single tokens.
  $terms = [regex]::Matches($Query, '(?:[^\s"]|"[^"]*")+') | ForEach-Object { $_.Value }
  if (-not $terms) { $terms = @($Query) }

  # -size and -date-modified add columns; -csv keeps them parseable
  $raw = & $es -n $Max $sortArg -size -date-modified -csv -no-header @terms 2>$null
  if ($LASTEXITCODE -ne 0 -and -not $raw) {
    Write-Error "es.exe returned $LASTEXITCODE. Is the Everything service running?"
    exit 3
  }
  foreach ($line in $raw) {
    if (-not $line) { continue }
    # csv from es: "Filename","Size","Date Modified"  (filename is the full path)
    $parts = $line -split '","'
    if ($parts.Count -ge 3) {
      $path = $parts[0].TrimStart('"')
      $size = $parts[1]
      $date = $parts[2].TrimEnd('"')
      "{0}`t{1}`t{2}" -f $size, $date, $path
    } else {
      $line
    }
  }
  exit 0
}

# ---- backend: HTTP server ----
$port = Find-HttpPort
if ($port) {
  $sortName = switch ($SortBy) {
    'size' { 'size' }
    'date' { 'date_modified' }
    'path' { 'path' }
    default { 'name' }
  }
  $uri = "http://localhost:$port/?s=$([uri]::EscapeDataString($Query))" +
         "&json=1&path_column=1&size_column=1&date_modified_column=1" +
         "&sort=$sortName&ascending=0&count=$Max"
  $resp = Invoke-RestMethod -Uri $uri -TimeoutSec 20
  foreach ($r in $resp.results) {
    $full = if ($r.path) { Join-Path $r.path $r.name } else { $r.name }
    $size = if ($null -ne $r.size) { $r.size } else { '' }
    $date = ''
    if ($r.date_modified) {
      # Everything returns Windows FILETIME ticks as a string
      try { $date = [datetime]::FromFileTimeUtc([int64]$r.date_modified).ToLocalTime().ToString('yyyy-MM-dd HH:mm') }
      catch { $date = $r.date_modified }
    }
    "{0}`t{1}`t{2}" -f $size, $date, $full
  }
  exit 0
}

# ---- nothing available ----
if (-not $Quiet) {
  Write-Host ""
  Write-Host "Everything index is not queryable yet - no es.exe and no HTTP server." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Enable ONE of these (Everything itself is already installed and running):" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  A. HTTP server - no download:" -ForegroundColor White
  Write-Host "     Everything > Tools > Options > HTTP Server > tick 'Enable HTTP server' > port 8080 > OK"
  Write-Host ""
  Write-Host "  B. ES command line:" -ForegroundColor White
  Write-Host "     Download the 'Everything Command Line Interface' zip from"
  Write-Host "     https://www.voidtools.com/downloads/"
  Write-Host "     and put es.exe in 'C:\Program Files\Everything\' or on PATH."
  Write-Host ""
}
exit 3
