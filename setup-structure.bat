@echo off
REM Blackjack Game - Project Structure Setup Script (Windows)
REM This script creates the complete file structure with placeholder files

echo.
echo 🎰 Setting up Blackjack Game project structure...
echo.

REM Create all directories
echo 📁 Creating directories...
mkdir server\game 2>nul
mkdir server\admin 2>nul
mkdir server\utils 2>nul
mkdir server\exports 2>nul
mkdir client\css 2>nul
mkdir client\js 2>nul
mkdir client\assets 2>nul

REM Server files
echo 📄 Creating server files...

REM Main server file
echo // Main server entry point > server\index.js
echo // Express + Socket.IO + ngrok setup >> server\index.js

REM Game logic files
echo // GameRoom class - manages game state and room logic > server\game\GameRoom.js

echo // Deck class - card generation, shuffling, dealing > server\game\Deck.js

echo // Player class - player state management > server\game\Player.js

echo // Dealer class - dealer logic and behavior > server\game\Dealer.js

echo // GameRules class - blackjack rules engine, hand evaluation > server\game\GameRules.js

echo // SideBets class - side bet calculations (Perfect Pairs, Bust It, 21+3) > server\game\SideBets.js

REM Admin files
echo // AdminCommands - console command system > server\admin\AdminCommands.js

echo // Statistics - stats tracking and management > server\admin\Statistics.js

echo // TestMode - pre-dealt card testing functionality > server\admin\TestMode.js

REM Utils
echo // Helper functions and utilities > server\utils\helpers.js

REM Client files
echo 📄 Creating client files...

REM HTML files
(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo     ^<meta charset="UTF-8"^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
echo     ^<title^>Blackjack Game^</title^>
echo     ^<link rel="stylesheet" href="css/main.css"^>
echo     ^<link rel="stylesheet" href="css/mobile.css"^>
echo     ^<link rel="stylesheet" href="css/table.css"^>
echo ^</head^>
echo ^<body^>
echo     ^<!-- Player game interface --^>
echo.    
echo     ^<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"^>^</script^>
echo     ^<script src="js/app.js"^>^</script^>
echo     ^<script src="js/ui.js"^>^</script^>
echo     ^<script src="js/socket-handler.js"^>^</script^>
echo ^</body^>
echo ^</html^>
) > client\index.html

(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo     ^<meta charset="UTF-8"^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
echo     ^<title^>Host Configuration - Blackjack^</title^>
echo     ^<link rel="stylesheet" href="css/main.css"^>
echo ^</head^>
echo ^<body^>
echo     ^<!-- Host configuration page --^>
echo.    
echo     ^<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"^>^</script^>
echo     ^<script src="js/app.js"^>^</script^>
echo ^</body^>
echo ^</html^>
) > client\host.html

REM CSS files
echo /* Main styles - colors, typography, components */ > client\css\main.css

echo /* Mobile-specific styles (portrait orientation) */ > client\css\mobile.css

echo /* Game table layout and card display */ > client\css\table.css

REM JavaScript files
echo // Main client application logic > client\js\app.js

echo // UI updates and rendering > client\js\ui.js

echo // Socket.IO client event handling > client\js\socket-handler.js

REM Root files
echo 📄 Creating root configuration files...

(
echo {
echo   "name": "blackjack-game",
echo   "version": "1.0.0",
echo   "description": "Multiplayer blackjack web game with real-time Socket.IO",
echo   "main": "server/index.js",
echo   "scripts": {
echo     "start": "node server/index.js",
echo     "dev": "nodemon server/index.js"
echo   },
echo   "keywords": ["blackjack", "multiplayer", "socket.io", "game"],
echo   "author": "",
echo   "license": "MIT",
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "socket.io": "^4.6.1",
echo     "ngrok": "^5.0.0"
echo   },
echo   "devDependencies": {
echo     "nodemon": "^3.0.1"
echo   }
echo }
) > package.json

(
echo # Dependencies
echo node_modules/
echo package-lock.json
echo.
echo # Environment variables
echo .env
echo.
echo # Exports
echo server/exports/*.json
echo.
echo # IDE
echo .vscode/
echo .idea/
echo.
echo # OS
echo .DS_Store
echo Thumbs.db
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # ngrok
echo ngrok.exe
echo ngrok
) > .gitignore

REM Create placeholder files
echo. > server\exports\.gitkeep
echo. > client\assets\.gitkeep

echo.
echo ✅ Project structure created successfully!
echo.
echo 📊 File structure created:
echo.
tree /F /A
echo.
echo 🚀 Next steps:
echo 1. Run: npm install
echo 2. Start coding!
echo 3. Run: npm run dev
echo.
pause