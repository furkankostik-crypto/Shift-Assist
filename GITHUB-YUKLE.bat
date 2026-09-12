@echo off
title Shift Assist - GitHub Yukleme
echo ======================================================
echo    SHIFT ASSIST - GITHUB YUKLEME
echo ======================================================
echo.
echo Hedef: https://github.com/furkankostik-crypto/Shift-Assist
echo.
echo Degisiklikler hazirlaniyor...
git add .
git commit -m "fix: add firebase configuration fallbacks and domain handling"
echo.
echo Kodlar GitHub'a gonderiliyor...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================
    echo    BASARILI! Kodlar GitHub'a yuklendi.
    echo ======================================================
) else (
    echo ======================================================
    echo    HATA: Yukleme tamamlanamadi.
    echo ======================================================
)
echo.
pause
