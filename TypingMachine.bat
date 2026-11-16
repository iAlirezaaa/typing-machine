@echo off
setlocal
cd /d "%~dp0"

rem ---- find Chrome ----
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

rem ---- find Python (windowless) to run the small local web server ----
set "PYW="
for %%P in (pythonw.exe) do set "PYW=%%~$PATH:P"
if not defined PYW for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%D\pythonw.exe" set "PYW=%%D\pythonw.exe"

rem ---- default: open the file directly (works without the server) ----
set "URL=file:///%~dp0index.html"

if defined PYW (
  start "" "%PYW%" "%~dp0serve.py"
  rem wait (up to ~5 s) until the web app answers
  powershell -NoProfile -Command "for($i=0;$i -lt 25;$i++){try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/api/ping -TimeoutSec 1 | Out-Null; exit 0}catch{Start-Sleep -Milliseconds 200}}; exit 1"
  rem the file page hands its notes to the web app once, then opens http://127.0.0.1:8765/
  if not errorlevel 1 set "URL=file:///%~dp0index.html?launch=1"
)

if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" --start-fullscreen
) else (
  start "" "%URL%"
)
