@echo off
chcp 65001 >nul
title Vardiya Takip - VS Code Uzaktan Kod Geliştirme Tüneli
cd /d "%~dp0"
set "PATH=%SystemRoot%\system32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;C:\Program Files\nodejs;C:\Program Files\Git\cmd;%LOCALAPPDATA%\Programs\Microsoft VS Code\bin;%PATH%"

echo ========================================================================
echo   💻 Telefondan Kod Geliştirme (VS Code Remote Tunnel) Başlatılıyor...
echo ========================================================================
echo.
echo Bu pencere açık kaldığı sürece telefonunuzdan https://vscode.dev adresine
echo girip GitHub / Microsoft hesabınızla oturum açarak bu projedeki kodları
echo doğrudan telefonunuzdan düzenleyebilirsiniz.
echo.

code tunnel
pause
