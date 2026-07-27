Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system"
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -File ""C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\monitor-server.ps1""", 0, False
