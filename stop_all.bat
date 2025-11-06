@echo off
setlocal

echo Starting Firebase data export...
call "C:\Users\testingflow\AppData\Roaming\npm\firebase.cmd" emulators:export ./emulator-data --force

echo Stopping PM2 process...
pm2 stop all

timeout /t 5 /nobreak >nul

pm2 delete all

:: ==============================================
:: GIT COMMIT & PUSH SECTION
:: ==============================================
echo Committing and pushing Firebase data...

:: Navigate to the Git repo folder — adjust this path if needed
cd /d "C:\fv2"

:: Add all changes
git add -A

:: Create a timestamped commit message
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do (
    set datestamp=%%d-%%b-%%c
)
set timestamp=%datestamp%_%time:~0,2%-%time:~3,2%
git commit -m "Automated commit: %timestamp%"

:: Force push to main (adjust branch if needed)
git push origin main --force

:: ==============================================

echo Done!
pause
endlocal
