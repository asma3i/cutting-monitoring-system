$log = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\tunnel_url.txt"
$nodeServer = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\backend"

while ($true) {
    $job = Start-Job -ScriptBlock {
        param()
        ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:8080 serveo.net 2>&1
    }

    Start-Sleep 6
    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    $output | Out-File -FilePath $log -Encoding UTF8

    $url = ($output | Select-String -Pattern "https://[a-f0-9-]+\.serveousercontent\.com").Matches.Value
    if ($url -and $url -ne "") {
        $url | Out-File -FilePath $log -Encoding UTF8
    }

    # Keep node server alive too
    $nodeProc = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if (-not $nodeProc) {
        Start-Process -WindowStyle Hidden -FilePath "wscript.exe" -ArgumentList "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\start-server.vbs"
    }

    # Wait for job to finish (SSH disconnects) or timeout after 24h
    Wait-Job -Job $job -Timeout 86400

    # Clean up
    $job | Stop-Job -ErrorAction SilentlyContinue
    $job | Remove-Job -ErrorAction SilentlyContinue

    # Restart SSH tunnel
    Start-Sleep 3
}
