@echo off
REM Lab shortcut — delegates to APOLLO launcher (X:\github\save, profile wipe, local only).
cd /d "%~dp0"
call "%~dp0scripts\APOLLO-LAUNCHER.bat" %*
