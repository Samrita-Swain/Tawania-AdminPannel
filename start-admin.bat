@echo off
echo Starting Tawania Admin Panel...
echo.
echo Installing dependencies...
npm install
echo.
echo Building the application...
npm run build
echo.
echo Starting the development server...
npm run dev
echo.
echo Admin panel will be available at:
echo http://localhost:3000 (or next available port)
echo.
pause
