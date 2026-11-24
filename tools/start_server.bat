@echo off
REM Inicia o servidor de IA do MagicTouch e mostra os erros nesta janela
where py >nul 2>nul && (py -u "%~dp0..\server\mt_server.py") || (python -u "%~dp0..\server\mt_server.py")
pause
