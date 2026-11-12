@echo off
rem Build, test and package the Kaizen Ideas web part.
rem The package lands in sharepoint\solution\react-kaizen-ideas.sppkg, ready for the app catalog.
rem Stop "npm start" first: this build clears the folders it serves from.

setlocal
cd /d "%~dp0"

rem The Node version this project builds with is in .nvmrc. If another one is in use, nvs switches to it
rem for this build only, adding it first if it is not installed yet.
set /p NODE_WANT=<.nvmrc
set NODE_WANT=%NODE_WANT:v=%
call :nodeVersion
if "%NODE_HAVE%"=="%NODE_WANT%" goto :nodeReady
echo Switching to Node %NODE_WANT%...
call nvs add %NODE_WANT% >nul 2>&1
call nvs use %NODE_WANT% || goto :wrongNode
call :nodeVersion
if not "%NODE_HAVE%"=="%NODE_WANT%" goto :wrongNode
:nodeReady

if not exist node_modules (
  echo Installing packages...
  call npm install || goto :failed
)

if exist sharepoint\solution rmdir /s /q sharepoint\solution
call npm run build || goto :failed

echo.
echo Package ready: %~dp0sharepoint\solution\react-kaizen-ideas.sppkg
exit /b 0

rem The Node version in use, like 22.14.0, or "none".
:nodeVersion
set NODE_HAVE=none
for /f "delims=" %%v in ('node --version 2^>nul') do set NODE_HAVE=%%v
set NODE_HAVE=%NODE_HAVE:v=%
exit /b 0

:wrongNode
echo.
echo This project needs Node %NODE_WANT%, and nvs couldn't switch to it.
echo Try "nvs add %NODE_WANT%" to see why, then run this again.
exit /b 1

:failed
echo.
echo Build failed - see the messages above.
exit /b 1
