@echo off
REM Tutor Portal Setup Script for Windows
REM This script helps you set up the project quickly

echo.
echo ========================================
echo   Tutor Portal Setup Script (Windows)
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node -v

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd backend
call npm install

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install

cd ..

REM Setup backend .env
echo.
echo Backend Configuration
echo =====================
if not exist "backend\.env" (
    echo Creating backend\.env file...
    (
        echo DATABASE_URL="postgresql://postgres:password@localhost:5432/tutor_portal?schema=public"
        echo JWT_SECRET="change-this-to-a-secure-random-string-in-production"
        echo PORT=5000
        echo STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
        echo STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
        echo NODE_ENV="development"
        echo FRONTEND_URL="http://localhost:3000"
    ) > backend\.env
    echo [OK] Created backend\.env
    echo.
    echo [IMPORTANT] Edit backend\.env and update:
    echo    - DATABASE_URL with your PostgreSQL credentials
    echo    - JWT_SECRET with a secure random string
    echo    - STRIPE_SECRET_KEY with your Stripe test key
) else (
    echo [OK] backend\.env already exists
)

REM Run Prisma migrations
echo.
echo Running database migrations...
cd backend
call npx prisma generate
call npx prisma migrate dev --name init

REM Seed database
echo.
set /p SEED="Do you want to seed the database with subjects? (y/n) "
if /i "%SEED%"=="y" (
    call node scripts\seed.js
)

cd ..

REM Final instructions
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your configuration
echo 2. Start the development servers:
echo    npm run dev
echo.
echo 3. Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 4. To view the database:
echo    cd backend
echo    npx prisma studio
echo.
echo For more information, see README.md and SETUP_GUIDE.md
echo.
echo Happy coding! 🚀
echo.
pause

