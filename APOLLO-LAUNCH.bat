@echo off
REM Double-click from repo root — same as scripts\APOLLO-LAUNCHER.bat (save: X:\github\save).
cd /d "%~dp0scripts"
call APOLLO-LAUNCHER.bat %*
