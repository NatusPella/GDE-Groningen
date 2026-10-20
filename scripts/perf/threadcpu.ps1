# Per-thread CPU time of an Electron process tree, sampled to a file (scripts/perf/run.mjs, PERF_THREADS=1).
# Frame times on a busy machine include the time the thread was preempted; the CPU time of the renderer
# main thread does not, so main-thread CPU ms per frame is comparable between runs under other load.
#   pwsh -File threadcpu.ps1 <rootPid> <outFile> [intervalMs]
param([int]$RootPid, [string]$Out, [int]$Interval = 250)
$epoch = [DateTime]::SpecifyKind([DateTime]'1970-01-01', 'Utc')
$kids = @{}
$lastScan = 0
$w = New-Object System.IO.StreamWriter($Out, $false)
while ($true) {
  $now = [int64]([DateTime]::UtcNow - $epoch).TotalMilliseconds
  if (($now - $lastScan) -gt 3000) {
    $lastScan = $now
    $kids = @{}
    foreach ($p in (Get-CimInstance Win32_Process -Filter "ParentProcessId=$RootPid")) {
      $t = if ($p.CommandLine -match '--type=([a-z-]+)') { $Matches[1] } else { 'other' }
      if ($t -eq 'utility' -and $p.CommandLine -match '--utility-sub-type=(\S+)') { $t = 'utility-' + ($Matches[1] -split '\.')[-1] }
      $kids[[int]$p.ProcessId] = $t
    }
    $kids[$RootPid] = 'browser'
  }
  $sb = New-Object System.Text.StringBuilder
  foreach ($k in $kids.Keys) {
    try {
      $pr = [System.Diagnostics.Process]::GetProcessById($k)
      foreach ($th in $pr.Threads) {
        try { $ms = $th.TotalProcessorTime.TotalMilliseconds } catch { continue }
        if ($ms -gt 100) { [void]$sb.Append("$now|$k|$($kids[$k])|$($th.Id)|$([int]$ms)`n") }
      }
    } catch { }
  }
  $w.Write($sb.ToString()); $w.Flush()
  Start-Sleep -Milliseconds $Interval
  if (-not (Get-Process -Id $RootPid -ErrorAction SilentlyContinue)) { break }
}
$w.Close()
