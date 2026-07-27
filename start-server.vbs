Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\asmay.asma3i\Desktop\cutting-monitoring-system\backend"
WshShell.Run "node server.js", 0, False
