@echo off
REM MagicTouch - instalador Windows
REM 1) Libera extensoes nao assinadas (PlayerDebugMode) para CSXS 9-13
for %%v in (9 10 11 12 13) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
REM 2) Copia a extensao
set DEST=%APPDATA%\Adobe\CEP\extensions\MagicTouch
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy /e /i /y "%~dp0..\CSXS" "%DEST%\CSXS" >nul
xcopy /e /i /y "%~dp0..\client" "%DEST%\client" >nul
xcopy /e /i /y "%~dp0..\jsx" "%DEST%\jsx" >nul
xcopy /e /i /y "%~dp0..\server" "%DEST%\server" >nul
REM 3) Dependencias de IA (opcional)
set PY=
where py >nul 2>nul && set PY=py
if not defined PY where python >nul 2>nul && set PY=python
if defined PY (
  echo Instalando dependencias Python - pode demorar varios minutos...
  %PY% -m pip install --upgrade pip
  %PY% -m pip install --prefer-binary -r "%DEST%\server\requirements.txt"
  %PY% -m pip install --prefer-binary -r "%DEST%\server\requirements-extra.txt"
) else (
  echo Python nao encontrado - instale o Python 3.12 em python.org para usar as funcoes de IA.
)
echo.
echo Pronto! Abra o After Effects: Window ^> Extensions ^> MagicTouch
pause
