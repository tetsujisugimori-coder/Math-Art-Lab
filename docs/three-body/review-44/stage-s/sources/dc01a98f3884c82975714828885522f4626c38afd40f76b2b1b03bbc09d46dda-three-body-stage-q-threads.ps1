param([string]$StageProcesses, [int]$StageDuration = 6000)
# Read-only, non-elevated sampling. These are snapshots, not ETW CSwitch events.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$stageIds = @($StageProcesses.Split(',') | ForEach-Object { [int]$_ })
$stageFrequency = [Diagnostics.Stopwatch]::Frequency
function Send-StageValue($value) { [Console]::WriteLine(($value | ConvertTo-Json -Depth 6 -Compress)) }
function Sync-StageClock {
  $stageLine = [Console]::ReadLine()
  if ($null -eq $stageLine) { throw 'Closed controller pipe' }
  $stageQ1 = [Diagnostics.Stopwatch]::GetTimestamp()
  Send-StageValue @{ type='sync'; id=$stageLine; q1=$stageQ1; q2=[Diagnostics.Stopwatch]::GetTimestamp(); frequency=$stageFrequency }
}
try {
  for ($stageIndex=0; $stageIndex -lt 8; $stageIndex++) { Sync-StageClock }
  if ([Console]::ReadLine() -ne 'start') { throw 'Expected start command' }
  $stageStart = [Diagnostics.Stopwatch]::GetTimestamp()
  do {
    $stageBegin = [Diagnostics.Stopwatch]::GetTimestamp()
    $stageThreads = @()
    foreach ($stageProcessId in $stageIds) {
      try {
        $stageProcess = [Diagnostics.Process]::GetProcessById($stageProcessId)
        foreach ($stageThread in $stageProcess.Threads) {
          try {
            $stageState = $stageThread.ThreadState.ToString()
            $stageThreads += @{ pid=$stageProcessId; tid=$stageThread.Id; state=$stageState; waitReason=$(if ($stageState -eq 'Wait') { $stageThread.WaitReason.ToString() } else { $null }); cpu100ns=$stageThread.TotalProcessorTime.Ticks; basePriority=$stageThread.BasePriority; currentPriority=$stageThread.CurrentPriority }
          } catch { $stageThreads += @{ pid=$stageProcessId; status='NOT_TESTED'; reason=$_.Exception.Message } }
        }
        $stageProcess.Dispose()
      } catch { $stageThreads += @{ pid=$stageProcessId; status='NOT_TESTED'; reason=$_.Exception.Message } }
    }
    Send-StageValue @{ type='sample'; begin=$stageBegin; end=[Diagnostics.Stopwatch]::GetTimestamp(); frequency=$stageFrequency; threads=$stageThreads }
    Start-Sleep -Milliseconds 100
  } while (([Diagnostics.Stopwatch]::GetTimestamp()-$stageStart)*1000/$stageFrequency -lt $StageDuration)
  Send-StageValue @{type='sampling-done'}
  for ($stageIndex=0; $stageIndex -lt 8; $stageIndex++) { Sync-StageClock }
} catch { Send-StageValue @{type='error'; reason=$_.Exception.Message}; exit 1 }
