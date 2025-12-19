@echo off
REM Production Build Script for Windows
REM This builds the frontend with the correct API URL

echo.
echo ========================================
echo   Building Frontend for Production
echo ========================================
echo.

REM Check if .env.production exists
if not exist ".env.production" (
    echo [WARNING] .env.production file not found!
    echo Creating .env.production from template...
    copy .env.production.example .env.production
    echo [OK] Created .env.production
    echo.
)

echo [INFO] Building with production settings...
echo [INFO] API URL will be: https://jtutors.onrender.com/api
echo.

REM Build the project
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [INFO] Copying .htaccess to dist folder...
    if exist ".htaccess" (
        copy /Y ".htaccess" "dist\.htaccess" >nul
        echo [OK] .htaccess copied to dist folder
    )
    echo.
    echo ========================================
    echo   Build Successful! 
    echo ========================================
    echo.
    echo Output folder: dist\
    echo.
    echo Next steps:
    echo 1. Upload the contents of dist\ to your hosting
    echo 2. For Apache servers: Ensure .htaccess is in dist\ folder
    echo 3. For Netlify: _redirects file is automatically included
    echo 4. For Vercel: vercel.json handles routing
    echo 5. Deploy to your hosting platform
    echo.
) else (
    echo.
    echo [ERROR] Build failed!
    echo Check the error messages above.
    echo.
    pause
    exit /b 1
)

pause

