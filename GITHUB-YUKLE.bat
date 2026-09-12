@echo off
chcp 65001 >nul
title Shift Assist - GitHub'a Yukle
echo.
echo ======================================================
echo    🚀 SHIFT ASSIST - GITHUB'A YUKLEME ARACI
echo ======================================================
echo.
echo Hedef Repo: https://github.com/furkankostik-crypto/Shift-Assist
echo.
echo Simdi GitHub'a gonderme islemi baslatiliyor...
echo (Tarayicinizda GitHub yetkilendirme penceresi acilirsa onay veriniz)
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================
    echo    ✅ BASARILI! Kodlar GitHub'a yuklendi.
    echo ======================================================
) else (
    echo ======================================================
    echo    ⚠️ HATA: Gonderme tamamlanamadi.
    echo    Tarayicidan veya Personal Access Token ile oturum aciniz.
    echo ======================================================
)
echo.
pause
