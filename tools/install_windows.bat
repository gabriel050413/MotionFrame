@echo off
REM MotionFrame - instalador Windows
REM 1) Libera extensoes nao assinadas (PlayerDebugMode) para CSXS 9-12
for %%v in (9 10 11 12) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
REM 2) Copia a extensao
set DEST=%APPDATA%\Adobe\CEP\extensions\MotionFrame
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy /e /i /y "%~dp0..\CSXS" "%DEST%\CSXS" >nul
xcopy /e /i /y "%~dp0..\client" "%DEST%\client" >nul
xcopy /e /i /y "%~dp0..\jsx" "%DEST%\jsx" >nul
xcopy /e /i /y "%~dp0..\server" "%DEST%\server" >nul
REM 3) Dependencias de IA (opcional)
where python >nul 2>nul && (
  echo Instalando dependencias Python (pode demorar)...
  python -m pip install -r "%DEST%\server\requirements.txt"
) || echo Python nao encontrado - instale Python 3.10+ para usar as funcoes de IA.
echo.
echo Pronto! Abra o After Effects: Window ^> Extensions ^> MotionFrame
pause
