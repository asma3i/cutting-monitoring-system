$serverPath = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\backend"
$vbsPath = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\start-server.vbs"

while ($true) {
    try {
        $req = [System.Net.HttpWebRequest]::Create("http://10.144.235.54:8080")
        $req.Timeout = 5000
        $resp = $req.GetResponse()
        $resp.Close()
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - OK"
    } catch {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - SERVER DOWN - Redémarrage..."
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep 2
        Start-Process -WindowStyle Hidden -FilePath "wscript.exe" -ArgumentList $vbsPath
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Redémarré"
    }
    Start-Sleep 120
}
