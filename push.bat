@echo off
echo Pushing changes to GitHub repository (https://github.com/shadyMogawer/aipix)...
"%USERPROFILE%\.gemini\antigravity\git\cmd\git.exe" push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo Git push failed. If this is a new repository, make sure you created it on GitHub first:
    echo https://github.com/new
    echo.
) else (
    echo.
    echo Successfully published! You can view it here:
    echo https://github.com/shadyMogawer/aipix
    echo.
)
pause
