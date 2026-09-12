@echo off
chcp 65001 >nul
title Vardiya Takip - Mobil Önizleme (Ev & Dışarı)
cd /d "%~dp0"
set "PATH=%SystemRoot%\system32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Program Files\Cloudflare\cloudflared;%LOCALAPPDATA%\Programs\Microsoft VS Code\bin;%PATH%"

echo ========================================================
echo   📱 Vardiya Takip - Mobil Önizleme Başlatılıyor...
echo ========================================================
echo.

node scripts/mobile-dev.mjs
pause
