@echo off
echo ========================================
echo HRMS Leave Portal Environment Setup
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js first.
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
call npm install

:: Check if environment files exist
if exist .env.development (
    echo Environment files already exist.
    set /p overwrite="Do you want to overwrite them? (y/n): "
    if /i not "%overwrite%"=="y" (
        echo Setup aborted. Using existing environment files.
        exit /b 0
    )
)

:: Create environment files
echo Setting up environment files...

:: Development environment
echo Creating .env.development...
if exist env.development (
    move /y env.development .env.development >nul
) else (
    copy env.example .env.development >nul
)

:: Production environment
echo Creating .env.production...
if exist env.production (
    move /y env.production .env.production >nul
) else (
    copy env.example .env.production >nul
)

:: Generate JWT secret
echo Generating secure JWT secrets...
for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set DEV_SECRET=%%a
for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set PROD_SECRET=%%a

:: Create temporary files with updated JWT secrets
type .env.development | findstr /v "JWT_SECRET" > .env.development.tmp
echo JWT_SECRET=%DEV_SECRET% >> .env.development.tmp
move /y .env.development.tmp .env.development >nul

type .env.production | findstr /v "JWT_SECRET" > .env.production.tmp
echo JWT_SECRET=%PROD_SECRET% >> .env.production.tmp
move /y .env.production.tmp .env.production >nul

echo.
echo Environment setup complete!
echo.
echo Next steps:
echo 1. Review and update your .env.development and .env.production files
echo 2. For development: set NODE_ENV=development
echo 3. For production: set NODE_ENV=production
echo 4. Start the application with: npm run dev (development) or npm start (production)
echo.
echo ======================================== 