@echo off
title Shift Assist - GitHub Yukleme
echo ======================================================
echo    SHIFT ASSIST - GITHUB YUKLEME
echo ======================================================
echo.
echo Hedef: https://github.com/furkankostik-crypto/Shift-Assist
echo.
echo Degisiklikler hazirlaniyor...
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=feat(release): v1.1.0 - mobile PWA install improvements and leave planner UI refinement"
echo Commit Mesaji: %COMMIT_MSG%
git add .
git commit -m "%COMMIT_MSG%"
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
