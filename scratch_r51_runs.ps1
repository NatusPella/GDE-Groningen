$env:ELECTRON_EXE = "C:/Users/abuis/GIT/GDE-Groningen/desktop/node_modules/electron/dist/electron.exe"
Set-Location C:\Users\abuis\GIT\GDE-Groningen\.claude\worktrees\r51-coop-vrijdag
$runs = @(
  @('hd2', '1280x720', 0), @('hd4', '1280x720', 2), @('fhd2', '1920x1080', 0), @('fhd4', '1920x1080', 2)
)
foreach ($r in $runs) {
  $n = $r[0]
  node scripts/coop/gastkant_vrijdag.mjs --stage=C:/Users/abuis/gde-r51-stage4 "--out=C:/Users/abuis/gde-r51-out/$n" "--size=$($r[1])" "--mock=$($r[2])" *> "C:\Users\abuis\gde-r51-out\$n.log"
}
"klaar" | Out-File C:\Users\abuis\gde-r51-out\runs-klaar.txt
