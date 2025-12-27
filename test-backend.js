// Backend Testing Script
// This simulates players connecting and playing a game

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const TEST_DELAY = 2000; // ms between actions

let player1Socket, player2Socket;

// Utility: Wait function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Log with timestamp
const log = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// Test Scenario
async function runTest() {
  console.log('\n========================================');
  console.log('Backend Testing Script');
  console.log('========================================\n');

  try {
    // Step 1: Wait for connection to establish
    log('Step 1: Waiting for connections...');

    await wait(1000);

    // Step 2: Join game
    log('\nStep 2: Joining game...');

    player1Socket.emit('join-game', { playerName: 'TestPlayer1' });
    await wait(500);

    player2Socket.emit('join-game', { playerName: 'TestPlayer2' });
    await wait(TEST_DELAY);

    // Step 3: Start the game (Player1 is host)
    log('\nStep 3: Starting game...');

    player1Socket.emit('start-game');
    await wait(TEST_DELAY);

    // Step 4: Place bets
    log('\nStep 4: Placing bets...');

    player1Socket.emit('place-bet', {
      mainBet: 50,
      sideBets: {
        perfectPairs: 10,
        bustIt: 10
      }
    });

    player2Socket.emit('place-bet', {
      mainBet: 100,
      sideBets: {
        twentyOnePlus3: 10
      }
    });

    await wait(1000);

    // Step 5: Ready up
    log('\nStep 5: Players ready...');

    player1Socket.emit('ready-bet', { ready: true });
    player2Socket.emit('ready-bet', { ready: true });

    await wait(TEST_DELAY);

    log('\n✅ Test scenario complete!');
    log('Now use admin console to:');
    log('1. Check game state with /state');
    log('2. View players with /players');
    log('3. Check statistics with /stats');
    log('4. Use /test-mode on to enable test mode');
    log('5. Use /scenario blackjack to test specific scenarios');
    log('\nPlayers will remain connected for testing.');
    log('Press Ctrl+C to disconnect players and exit.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    cleanup();
  }
}

// Setup event listeners
function setupListeners(socket, playerName) {
  socket.on('connect', () => {
    log(`${playerName} connected`);
  });

  socket.on('join-success', (data) => {
    log(`${playerName} joined successfully`, data);
  });

  socket.on('join-failed', (data) => {
    log(`${playerName} join failed`, data);
  });

  socket.on('bet-placed', () => {
    log(`${playerName} bet placed`);
  });

  socket.on('bet-failed', (data) => {
    log(`${playerName} bet failed`, data);
  });

  socket.on('ready-confirmed', () => {
    log(`${playerName} ready confirmed`);
  });

  socket.on('game-state', (state) => {
    log(`${playerName} received game state`, {
      phase: state.phase,
      round: state.roundNumber,
      players: state.players.length
    });
  });

  socket.on('betting-phase', (data) => {
    log(`${playerName} - Betting phase started`, data);
  });

  socket.on('card-dealt', (data) => {
    log('Card dealt', data);
  });

  socket.on('player-turn', (data) => {
    log('Player turn', data);
  });

  socket.on('round-results', (data) => {
    log('Round results', data);
  });

  socket.on('disconnect', () => {
    log(`${playerName} disconnected`);
  });

  socket.on('error', (error) => {
    log(`${playerName} error`, error);
  });
}

// Cleanup on exit
function cleanup() {
  console.log('\n\nCleaning up...');
  if (player1Socket) player1Socket.disconnect();
  if (player2Socket) player2Socket.disconnect();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main execution
console.log('Make sure the server is running on http://localhost:3000');
console.log('Starting test in 2 seconds...\n');

setTimeout(() => {
  // Setup listeners first
  if (!player1Socket) player1Socket = io(SERVER_URL);
  if (!player2Socket) player2Socket = io(SERVER_URL);

  setupListeners(player1Socket, 'Player1');
  setupListeners(player2Socket, 'Player2');

  runTest();
}, 2000);
