<#
  everything-ensure.ps1
  Ensures the Everything (voidtools) CLIENT is running in the current interactive
  Windows session, so the everything-search skill's es.exe can reach it over IPC.

  The Everything *service* (SessionId 0) is not sufficient - es.exe talks to the
  client's hidden IPC window, which only exists in the user's own session.

  Silent, idempotent, always exits 0. Never blocks a Claude Code session start.
#>

$ErrorActionPreference = 'SilentlyContinue'

try {
  $mySession = (Get-Process -Id $PID).SessionId

  $client = Get-Process -Name 'Everything' -ErrorAction SilentlyContinue |
            Where-Object { $_.SessionId -eq $mySession } |
            Select-Object -First 1

  if ($client) { exit 0 }   # already up in this session

  $exe = $null
  foreach ($c in @('C:\Program Files\Everything\Everything.exe',
                   'C:\Program Files (x86)\Everything\Everything.exe')) {
    if (Test-Path -LiteralPath $c) { $exe = $c; break }
  }
  if (-not $exe) { exit 0 }  # Everything not installed - nothing to do

  # -startup runs it in the background/tray with no window
  Start-Process -FilePath $exe -ArgumentList '-startup' -WindowStyle Hidden
} catch { }

exit 0
