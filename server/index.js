require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ngrok = require('@ngrok/ngrok');
const path = require('path');
const readline = require('readline');

// Import game classes
const GameRoom = require('./game/GameRoom');
const Statistics = require('./admin/Statistics');
const TestMode = require('./admin/TestMode');
const AdminCommands = require('./admin/AdminCommands');

const PORT = 3000;

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve clientV2 static files
app.use('/v2', express.static(path.join(__dirname, '../clientV2')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/v2', (req, res) => {
  res.sendFile(path.join(__dirname, '../clientV2/index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/host.html'));
});

app.get('/dev', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dev.html'));
});

// Default game configuration
let gameConfig = {
  startingBankroll: 1000,
  minBet: 10,
  maxBet: 500,
  deckCount: 6,
  blackjackPayout: '3:2',
  insurancePayout: '2:1',
  splitAcesBlackjack: true,
  roundDelay: 5
};

// Initialize game systems
let gameRoom = new GameRoom(io, gameConfig);
let statistics = new Statistics(gameRoom);
let testMode = new TestMode(gameRoom);
let adminCommands = new AdminCommands(gameRoom, statistics, testMode);

// Set testMode reference in gameRoom for autoplay checks
gameRoom.testMode = testMode;

console.log('[Server] Game systems initialized');

// ==================== LOG STREAMING FOR ADMIN PANEL ====================

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Wrap console.log to broadcast to admin panel
console.log = function(...args) {
  originalConsoleLog.apply(console, args);

  // Broadcast to admin clients
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  io.emit('admin-log', { message, type: 'normal' });
};

console.error = function(...args) {
  originalConsoleError.apply(console, args);

  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  io.emit('admin-log', { message, type: 'error' });
};

console.warn = function(...args) {
  originalConsoleWarn.apply(console, args);

  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  io.emit('admin-log', { message, type: 'warning' });
};

// ==================== SOCKET.IO EVENT HANDLERS ====================

io.on('connection', (socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] Player connected: ${socket.id}`);

  // ===== LOBBY & CONNECTION =====

  socket.on('join-game', (data) => {
    const { playerName } = data;
    console.log(`[${new Date().toLocaleTimeString()}] ${playerName} attempting to join`);

    const result = gameRoom.addPlayer(socket.id, playerName);

    if (result.success) {
      socket.emit('join-success', {
        seat: result.seat,
        player: result.player
      });

      io.emit('player-joined', {
        playerId: socket.id,
        playerName: playerName,
        seat: result.seat
      });
    } else {
      socket.emit('join-failed', {
        error: result.error
      });
    }
  });

  socket.on('update-profile', (data) => {
    const { playerName, playerColor } = data;
    console.log(`[${new Date().toLocaleTimeString()}] ${socket.id} updating profile`);

    const result = gameRoom.updateProfile(socket.id, playerName, playerColor);

    if (result.success) {
      socket.emit('profile-updated', { success: true });
    } else {
      socket.emit('profile-update-failed', { error: result.error });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Player disconnected: ${socket.id}`);
    gameRoom.removePlayer(socket.id);

    io.emit('player-left', {
      playerId: socket.id
    });
  });

  socket.on('transfer-host', (data) => {
    const { targetPlayerId } = data;
    gameRoom.transferHost(targetPlayerId);
  });

  socket.on('start-game', () => {
    const player = gameRoom.players.get(socket.id);
    if (player && player.isHost) {
      gameRoom.startGame();
    } else {
      socket.emit('error', { message: 'Only host can start the game' });
    }
  });

  // ===== BETTING PHASE =====

  socket.on('place-bet', (data) => {
    const { mainBet, sideBets } = data;

    const result = gameRoom.placeBet(socket.id, mainBet, sideBets);

    if (result && result.success) {
      socket.emit('bet-placed', { success: true });
    } else {
      socket.emit('bet-failed', { error: result?.error || 'Bet failed' });
    }
  });

  socket.on('ready-bet', (data) => {
    const { ready } = data;

    const result = gameRoom.setPlayerReady(socket.id, ready);

    if (result && result.success) {
      socket.emit('ready-confirmed', { ready });
    } else {
      socket.emit('ready-failed', { error: result?.error || 'Failed to set ready status' });
    }
  });

  socket.on('cancel-bet', () => {
    const result = gameRoom.cancelBet(socket.id);

    if (result && result.success) {
      socket.emit('bet-cancelled', { success: true });
    } else {
      socket.emit('cancel-bet-failed', { error: result?.error || 'Failed to cancel bet' });
    }
  });

  socket.on('sit-out', () => {
    const result = gameRoom.sitOutPlayer(socket.id);

    if (result && result.success) {
      socket.emit('sit-out-confirmed', { success: true });
    } else {
      socket.emit('sit-out-failed', { error: result?.error || 'Failed to sit out' });
    }
  });

  socket.on('cancel-sit-out', () => {
    const result = gameRoom.cancelSitOut(socket.id);

    if (result && result.success) {
      socket.emit('cancel-sit-out-confirmed', { success: true });
    } else {
      socket.emit('cancel-sit-out-failed', { error: result?.error || 'Failed to cancel sit out' });
    }
  });

  // ===== INSURANCE PHASE =====

  socket.on('place-insurance', (data) => {
    const { takesInsurance } = data;

    const result = gameRoom.placeInsurance(socket.id, takesInsurance);

    if (result && result.success) {
      socket.emit('insurance-placed', { success: true });
    } else {
      socket.emit('insurance-failed', { error: result?.error || 'Insurance failed' });
    }
  });

  // ===== PLAYING PHASE =====

  socket.on('player-action', (data) => {
    const { action, handIndex } = data;

    const result = gameRoom.handlePlayerAction(socket.id, action, handIndex);

    if (result && result.success) {
      socket.emit('action-confirmed', { action, handIndex });
    } else {
      socket.emit('action-failed', { error: result?.error || 'Action failed' });
    }
  });

  socket.on('pre-select-action', (data) => {
    const { action, handIndex } = data;

    const result = gameRoom.setPreAction(socket.id, action, handIndex);

    if (result && result.success) {
      socket.emit('pre-action-set', { action, handIndex });
    }
  });

  // ===== CONFIGURATION =====

  socket.on('save-config', (config) => {
    console.log(`[${new Date().toLocaleTimeString()}] Config saved by ${socket.id}:`);
    console.log(JSON.stringify(config, null, 2));

    // Update config on existing game room (preserves players)
    const result = gameRoom.updateConfig(config);

    if (!result.success) {
      socket.emit('config-failed', {
        error: result.message
      });
      return;
    }

    // Update global config
    gameConfig = { ...gameRoom.config };

    console.log('[Server] Configuration updated successfully');

    socket.emit('config-saved', {
      success: true,
      config: gameConfig,
      timestamp: new Date().toISOString()
    });

    // Broadcast config update to all connected clients
    io.emit('config-update', { config: gameConfig });
  });

  socket.on('get-config', () => {
    socket.emit('config-update', { config: gameConfig });
  });

  // ===== GENERAL =====

  socket.on('request-player-info', (data) => {
    const { playerId } = data;
    const player = gameRoom.players.get(playerId);

    if (player) {
      socket.emit('player-info', {
        playerId: playerId,
        detailedInfo: player.toJSON(true) // Include stats
      });
    }
  });

  socket.on('error', (error) => {
    console.error(`[Socket Error] ${socket.id}:`, error);
  });

  // ===== ADMIN PANEL =====

  socket.on('admin-validate-key', (data) => {
    const { key } = data;
    const correctKey = process.env.DEV_PANEL_KEY || 'dev123';

    if (key === correctKey) {
      socket.emit('admin-key-validated', { valid: true });
      console.log(`[Admin] Dev panel access granted to ${socket.id}`);
    } else {
      socket.emit('admin-key-validated', { valid: false });
      console.log(`[Admin] Dev panel access denied to ${socket.id} - invalid key`);
    }
  });

  socket.on('admin-command', (data) => {
    const { command } = data;
    console.log(`[Admin] Executing command: ${command}`);

    try {
      const output = adminCommands.execute(command);
      socket.emit('admin-command-output', { output });

      // Broadcast command execution to all admin clients
      io.emit('admin-log', {
        message: `Command executed: ${command}`,
        type: 'success'
      });
    } catch (error) {
      socket.emit('admin-command-output', {
        output: `Error: ${error.message}`
      });
      io.emit('admin-log', {
        message: `Command failed: ${command} - ${error.message}`,
        type: 'error'
      });
    }
  });

  socket.on('admin-get-info', () => {
    socket.emit('admin-info', {
      state: {
        sessionId: gameRoom.sessionId,
        phase: gameRoom.phase,
        roundNumber: gameRoom.roundNumber,
        players: Array.from(gameRoom.players.values()).map(p => p.toJSON()),
        config: gameRoom.config
      },
      ngrokUrl: adminCommands.ngrokUrl
    });
  });

  socket.on('admin-get-players', () => {
    socket.emit('admin-players', {
      players: Array.from(gameRoom.players.values()).map(p => p.toJSON())
    });
  });
});

// ==================== ADMIN CONSOLE ====================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('\n========================================');
console.log('Admin Console Ready');
console.log('========================================');
console.log('Type /help for available commands');
console.log('========================================\n');

rl.on('line', (input) => {
  const trimmed = input.trim();

  if (!trimmed) {
    rl.prompt();
    return;
  }

  if (!trimmed.startsWith('/')) {
    console.log('Commands must start with /. Type /help for available commands.\n');
    rl.prompt();
    return;
  }

  // Execute command
  const output = adminCommands.execute(trimmed);
  console.log(output);

  rl.prompt();
});

// ==================== SERVER STARTUP ====================

server.listen(PORT, async () => {
  console.log('\n========================================');
  console.log('🎰 Blackjack Game Server Started!');
  console.log('========================================');
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log('Starting ngrok tunnel...');

  try {
    // Connect to ngrok
    const authtoken = process.env.NGROK_AUTHTOKEN;

    if (!authtoken) {
      throw new Error('NGROK_AUTHTOKEN not found in .env file. Please add your ngrok authtoken to .env');
    }

    const listener = await ngrok.connect({
      addr: PORT,
      authtoken: authtoken
    });

    const publicUrl = listener.url();

    // Update admin commands with ngrok URL
    adminCommands.setNgrokUrl(publicUrl);

    console.log('========================================');
    console.log(`Public URL: ${publicUrl}`);
    console.log('========================================');
    console.log('\n✅ Server is ready!');
    console.log('Share the public URL with players to join the game.');
    console.log('\nType /help for admin commands\n');

    rl.prompt();

  } catch (error) {
    console.log('========================================');
    console.log('⚠️  ngrok connection failed');
    console.log('Running in local-only mode');
    console.log('========================================');
    console.log('Error:', error.message);
    console.log('\nServer is still accessible at http://localhost:' + PORT);
    console.log('Note: ngrok requires internet connection for external access\n');

    rl.prompt();
  }
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');

  // Export statistics before shutdown
  if (statistics && gameRoom.roundNumber > 0) {
    console.log('Exporting final statistics...');
    const result = statistics.exportToJSON();
    if (result.success) {
      console.log(`Statistics exported to: ${result.filePath}`);
    }
  }

  rl.close();

  server.close(() => {
    console.log('Server closed. Goodbye!');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n[CRITICAL ERROR]', error);
  console.log('Server will continue running, but this should be investigated.');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[UNHANDLED REJECTION]', reason);
  console.log('Promise:', promise);
});
