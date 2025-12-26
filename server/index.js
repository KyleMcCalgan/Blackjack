const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ngrok = require('@ngrok/ngrok');
const path = require('path');
const readline = require('readline');

const PORT = 3000;

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/host.html'));
});

// Game state storage
let gameConfig = {
  startingBankroll: 1000,
  minBet: 10,
  maxBet: 500, // null = no limit
  deckCount: 6,
  blackjackPayout: '3:2',
  insurancePayout: '2:1',
  splitAcesBlackjack: true
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] Player connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Player disconnected: ${socket.id}`);
  });

  // Host configuration events
  socket.on('save-config', (config) => {
    console.log(`[${new Date().toLocaleTimeString()}] Config saved by ${socket.id}:`);
    console.log(JSON.stringify(config, null, 2));

    gameConfig = { ...config };

    // Send confirmation back to client
    socket.emit('config-saved', {
      success: true,
      config: gameConfig,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('config-update', (config) => {
    console.log(`[${new Date().toLocaleTimeString()}] Config update from ${socket.id}:`);
    console.log(JSON.stringify(config, null, 2));

    gameConfig = { ...config };
  });

  // Placeholder for game events
  socket.on('join-game', (data) => {
    console.log(`[${new Date().toLocaleTimeString()}] Join request:`, data);
  });
});

// Admin console commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('\n========================================');
console.log('Admin Console Commands:');
console.log('========================================');
console.log('/help       - Show available commands');
console.log('/info       - Display server info');
console.log('/players    - List connected players');
console.log('/url        - Display ngrok URL');
console.log('========================================\n');

rl.on('line', (input) => {
  const command = input.trim();

  switch (command) {
    case '/help':
      console.log('\nAvailable Commands:');
      console.log('/help       - Show this help message');
      console.log('/info       - Display server configuration');
      console.log('/config     - View current game configuration');
      console.log('/players    - List all connected players');
      console.log('/url        - Display ngrok public URL');
      console.log('/start      - Force start game (future)');
      console.log('/end        - End game session (future)');
      console.log('/stats      - Show statistics (future)');
      console.log('/export     - Export statistics (future)');
      console.log('/test-mode  - Toggle test mode (future)\n');
      break;

    case '/info':
      console.log('\nServer Information:');
      console.log(`Local URL: http://localhost:${PORT}`);
      console.log(`Connected clients: ${io.engine.clientsCount}`);
      console.log(`Status: Running\n`);
      break;

    case '/config':
      console.log('\nCurrent Game Configuration:');
      console.log(JSON.stringify(gameConfig, null, 2));
      console.log('');
      break;

    case '/players':
      const sockets = io.sockets.sockets;
      console.log(`\nConnected Players (${sockets.size}):`);
      sockets.forEach((socket) => {
        console.log(`  - ${socket.id}`);
      });
      console.log('');
      break;

    case '/url':
      console.log('\nUse /info to see the ngrok URL after startup\n');
      break;

    default:
      if (command.startsWith('/')) {
        console.log(`Unknown command: ${command}. Type /help for available commands.\n`);
      }
      break;
  }

  rl.prompt();
});

// Start server
server.listen(PORT, async () => {
  console.log('\n========================================');
  console.log('🎰 Blackjack Game Server Started!');
  console.log('========================================');
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log('Starting ngrok tunnel...');

  try {
    // Connect to ngrok
    const listener = await ngrok.connect({
      addr: PORT,
      authtoken_from_env: false
    });

    const publicUrl = listener.url();

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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');
  rl.close();
  server.close(() => {
    console.log('Server closed. Goodbye!');
    process.exit(0);
  });
});
