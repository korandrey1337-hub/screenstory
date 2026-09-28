@echo off
chcp 65001 >nul
title Po tu storonu ekrana
cd /d "%~dp0"

rem --- Пытаемся запустить локальный сервер (надёжнее для картинок и видео) ---
where python >nul 2>nul
if %errorlevel%==0 goto server
where py >nul 2>nul
if %errorlevel%==0 goto server_py

rem --- Python не найден: просто открываем файл в браузере ---
echo Otkryvayu igru v brauzere...
start "" "index.html"
exit /b

:server
start "" cmd /c "python -m http.server 8000"
goto open

:server_py
start "" cmd /c "py -m http.server 8000"
goto open

:open
timeout /t 1 >nul
start "" "http://localhost:8000/index.html"
echo.
echo Igra otkryta v brauzere: http://localhost:8000
echo Chtoby ostanovit server - zakroy chernoe okno servera.
echo Eto okno mozhno zakryt.
