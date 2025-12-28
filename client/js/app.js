// Main client application logic

// ==================== GLOBAL STATE ====================

const gameState = {
    socket: null,
    connected: false,
    playerId: null,
    playerName: null,
    playerSeat: null,
    isHost: false,
    phase: 'lobby',
    roundNumber: 0,
    players: [],
    config: null,
    // Timer state
    timerInterval: null,
    timerEndTime: null,
    // Betting state persistence
    currentBets: null,
    // Ready system state
    readyRequestPending: false
};

// ==================== INITIALIZATION ====================

// Initialize socket connection
function initSocket() {
    // Configure Socket.IO with reconnection limits
    gameState.socket = io({
        reconnection: true,
        reconnectionAttempts: 5,        // Try 5 times then stop
        reconnectionDelay: 1000,         // Wait 1s before first retry
        reconnectionDelayMax: 5000,      // Max 5s between retries
        timeout: 10000                   // 10s connection timeout
    });

    // Connection events
    gameState.socket.on('connect', handleConnect);
    gameState.socket.on('disconnect', handleDisconnect);
    gameState.socket.on('connect_error', handleConnectError);
    gameState.socket.on('reconnect_failed', handleReconnectFailed);

    // Game events
    gameState.socket.on('join-success', handleJoinSuccess);
    gameState.socket.on('join-failed', handleJoinFailed);
    gameState.socket.on('game-state', handleGameState);
    gameState.socket.on('player-joined', handlePlayerJoined);
    gameState.socket.on('player-left', handlePlayerLeft);

    // Betting events
    gameState.socket.on('bet-placed', handleBetPlaced);
    gameState.socket.on('bet-failed', handleBetFailed);

    // Ready events
    gameState.socket.on('ready-confirmed', handleReadyConfirmed);
    gameState.socket.on('ready-failed', handleReadyFailed);

    // Insurance events
    gameState.socket.on('insurance-placed', handleInsurancePlaced);
    gameState.socket.on('insurance-failed', handleInsuranceFailed);

    // Action events
    gameState.socket.on('action-confirmed', handleActionConfirmed);
    gameState.socket.on('action-failed', handleActionFailed);
    gameState.socket.on('card-dealt', handleCardDealt);

    // Timer events
    gameState.socket.on('betting-phase', handleBettingPhaseTimer);
    gameState.socket.on('insurance-offered', handleInsuranceTimer);
    gameState.socket.on('player-turn', handlePlayerTurnTimer);

    // Results events
    gameState.socket.on('round-results', handleRoundResults);

    console.log('[App] Socket initialized');
}

// ==================== CONNECTION HANDLERS ====================

function handleConnect() {
    console.log('[App] Connected to server:', gameState.socket.id);
    gameState.connected = true;
    gameState.playerId = gameState.socket.id;

    // Update connection status in join screen
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    const joinButton = document.getElementById('joinButton');

    statusDiv.classList.remove('disconnected');
    statusDiv.classList.add('connected');
    statusText.textContent = 'Connected';
    joinButton.disabled = false;
}

function handleDisconnect(reason) {
    console.log('[App] Disconnected from server:', reason);
    gameState.connected = false;

    // Update connection status
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    const joinButton = document.getElementById('joinButton');

    if (statusDiv) {
        statusDiv.classList.remove('connected');
        statusDiv.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
        joinButton.disabled = true;
    }

    // Show notification for unexpected disconnects
    if (reason === 'io server disconnect' || reason === 'transport close') {
        showNotification('Connection lost. Attempting to reconnect...', 'error');
    }
}

function handleConnectError(error) {
    console.log('[App] Connection error:', error);
    gameState.connected = false;

    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    const joinButton = document.getElementById('joinButton');

    if (statusDiv) {
        statusDiv.classList.remove('connected');
        statusDiv.classList.add('disconnected');
        statusText.textContent = 'Connection Error';
        joinButton.disabled = true;
    }
}

function handleReconnectFailed() {
    console.log('[App] Reconnection failed after maximum attempts');
    gameState.connected = false;

    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');

    if (statusDiv) {
        statusDiv.classList.remove('connected');
        statusDiv.classList.add('disconnected');
        statusText.textContent = 'Reconnection Failed';
    }

    showNotification('Could not reconnect to server. Please refresh the page.', 'error');
}

// ==================== JOIN GAME ====================

function setupJoinForm() {
    const joinForm = document.getElementById('joinForm');
    const playerNameInput = document.getElementById('playerName');

    joinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const playerName = playerNameInput.value.trim();

        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        if (playerName.length > 20) {
            alert('Name must be 20 characters or less');
            return;
        }

        console.log('[App] Attempting to join game as:', playerName);
        gameState.socket.emit('join-game', { playerName });
    });
}

function handleJoinSuccess(data) {
    console.log('[App] Join successful:', data);
    console.log('[App] Setting isHost to:', data.player.isHost);

    gameState.playerName = data.player.name;
    gameState.playerSeat = data.seat;
    gameState.isHost = data.player.isHost;

    console.log('[App] gameState.isHost is now:', gameState.isHost);

    // Hide join screen, show game UI
    document.getElementById('joinScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'flex';

    // Update player info in header
    document.getElementById('playerNameDisplay').textContent = data.player.name + (data.player.isHost ? ' 👑' : '');
    document.getElementById('playerBankroll').textContent = '$' + data.player.bankroll;

    // Show host settings button if player is host
    if (data.player.isHost) {
        const hostSettingsBtn = document.getElementById('hostSettingsBtn');
        hostSettingsBtn.style.display = 'block';
        hostSettingsBtn.addEventListener('click', openSettingsModal);
    }

    console.log('[App] Joined as', data.player.name, 'in seat', data.seat);

    // Manually trigger controls update now that we know our host status
    // This ensures the start button appears for the host immediately
    console.log('[App] Current phase:', gameState.phase, 'isHost:', gameState.isHost);

    if ((gameState.phase === 'lobby' || !gameState.phase) && gameState.isHost) {
        console.log('[App] Host joined - showing start button');
        const controlsArea = document.getElementById('controlsArea');
        const actionControlsArea = document.getElementById('actionControlsArea');

        if (actionControlsArea) actionControlsArea.innerHTML = '';

        if (controlsArea) {
            controlsArea.innerHTML = `
                <button class="btn-game-action btn-start" id="startGameBtn">
                    Start Game
                </button>
            `;

            document.getElementById('startGameBtn').addEventListener('click', () => {
                console.log('[App] Starting game...');
                gameState.socket.emit('start-game');
            });
        }
    }
}

function handleJoinFailed(data) {
    console.error('[App] Join failed:', data.error);
    alert('Failed to join game: ' + data.error);
}

// ==================== GAME STATE HANDLERS ====================

function handleGameState(state) {
    console.log('[App] Game state update:', state);

    // Clear saved bets when leaving betting phase
    if (gameState.phase === 'betting' && state.phase !== 'betting') {
        gameState.currentBets = null;
        gameState.readyRequestPending = false; // Clear pending flag
    }

    // Update global state
    gameState.phase = state.phase;
    gameState.roundNumber = state.roundNumber;
    gameState.players = state.players;
    gameState.config = state.config;

    // Stop timer for phases that don't have timers
    if (!['betting', 'insurance', 'playing'].includes(state.phase)) {
        stopPhaseTimer();
    }

    // Update UI
    updatePhaseDisplay(state.phase, state.roundNumber);
    updatePlayerSeats(state.players, state.seats);
    updateTableMessage(state);

    // Render dealer cards (clear in lobby phase)
    if (state.phase === 'lobby') {
        // Clear dealer cards in lobby
        const dealerCardsEl = document.getElementById('dealerCards');
        const dealerValueEl = document.getElementById('dealerValue');
        if (dealerCardsEl) clearCards(dealerCardsEl);
        if (dealerValueEl) dealerValueEl.textContent = '-';
    } else if (state.dealer) {
        const hideHole = state.phase !== 'dealer' && state.phase !== 'results';
        renderDealerCards(state.dealer, hideHole);
    }

    // Render player cards (always call to clear cards when hands are empty)
    state.players.forEach(player => {
        renderPlayerCards(player.seat, player, state);
    });

    // Update current player's bankroll
    const currentPlayer = state.players.find(p => p.id === gameState.playerId);
    if (currentPlayer) {
        document.getElementById('playerBankroll').textContent = '$' + currentPlayer.bankroll;

        // Update unified action footer based on phase
        if (state.phase === 'betting') {
            syncBettingUIWithServerState(currentPlayer, state.config);
        } else if (state.phase === 'playing') {
            // Footer will be populated by showPlayerActionControls if it's player's turn
            // Otherwise hide it
            if (state.currentPlayer !== gameState.playerId) {
                renderUnifiedActionFooter('other', currentPlayer, state.config);
            }
        } else {
            renderUnifiedActionFooter('other', currentPlayer, state.config);
        }
    }
}

function handlePlayerJoined(data) {
    console.log('[App] Player joined:', data.playerName);
    // Game state update will handle UI refresh
}

function handlePlayerLeft(data) {
    console.log('[App] Player left:', data.playerId);
    // Game state update will handle UI refresh
}

function handleBetPlaced(data) {
    console.log('[App] Bet placed successfully:', data);
    showNotification('Bet placed successfully!', 'success');

    // After placing bet, show ready checkbox container and enable checkbox
    const readyCheckboxContainer = document.getElementById('readyCheckboxContainer');
    const readyCheckbox = document.getElementById('readyCheckbox');
    const placeBetBtn = document.getElementById('placeBetBtn');
    const cancelBetBtn = document.getElementById('cancelBetBtn');

    if (readyCheckboxContainer) {
        readyCheckboxContainer.style.display = 'block';
    }
    if (readyCheckbox) {
        readyCheckbox.disabled = false;
    }
    if (placeBetBtn) {
        placeBetBtn.style.display = 'none';
    }
    if (cancelBetBtn) {
        cancelBetBtn.style.display = 'inline-block';
        cancelBetBtn.disabled = false;
    }
}

function handleBetFailed(data) {
    console.error('[App] Bet failed:', data.error);
    showNotification('Bet failed: ' + data.error, 'error');

    // Re-enable betting controls
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.disabled = false;
        placeBetBtn.textContent = 'Place Bet';
    }

    // Re-enable all poker chips
    document.querySelectorAll('.poker-chip, .poker-chip-small').forEach(chip => {
        chip.disabled = false;
        chip.style.opacity = '1';
        chip.style.cursor = 'pointer';
    });

    // Re-enable clear buttons
    document.querySelectorAll('.btn-clear-bet, .btn-clear-side').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
}

function handleReadyConfirmed(data) {
    console.log('[App] Ready status confirmed:', data.ready);

    // Clear pending flag
    gameState.readyRequestPending = false;

    // Update new footer button
    const readyBtn = document.getElementById('readyBtnFooter');
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.textContent = '✓ Ready';
    }

    // Legacy support for old elements
    const readyCheckboxAction = document.getElementById('readyCheckboxAction');
    const cancelBetBtn = document.getElementById('cancelBetBtnAction');

    if (data.ready) {
        // Lock ready checkbox (can't uncheck)
        if (readyCheckboxAction) {
            readyCheckboxAction.disabled = true;
            readyCheckboxAction.checked = true;
        }

        // Disable cancel button when ready
        if (cancelBetBtn) {
            cancelBetBtn.disabled = true;
            cancelBetBtn.style.opacity = '0.5';
        }

        // Show success notification
        showNotification('Ready! Waiting for other players...', 'success');
    }
}

function handleReadyFailed(data) {
    console.error('[App] Ready failed:', data.error);

    // Clear pending flag
    gameState.readyRequestPending = false;

    // Update new footer button
    const readyBtn = document.getElementById('readyBtnFooter');
    if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.textContent = 'Ready';
    }

    // Legacy support for old elements
    const readyCheckboxAction = document.getElementById('readyCheckboxAction');

    // Uncheck checkbox and keep it enabled
    if (readyCheckboxAction) {
        readyCheckboxAction.checked = false;
        readyCheckboxAction.disabled = false;
    }

    // Show error notification
    showNotification('Ready failed: ' + data.error, 'error');
}

function handleInsurancePlaced(data) {
    console.log('[App] Insurance placed:', data);
    showNotification('Insurance placed', 'success');
}

function handleInsuranceFailed(data) {
    console.error('[App] Insurance failed:', data.error);
    showNotification('Insurance failed: ' + data.error, 'error');
}

function handleActionConfirmed(data) {
    console.log('[App] Action confirmed:', data);
}

function handleActionFailed(data) {
    console.error('[App] Action failed:', data.error);
    showNotification('Action failed: ' + data.error, 'error');
}

function handleCardDealt(data) {
    console.log('[App] Card dealt:', data);
    // Game state update will trigger card rendering
}

function handleRoundResults(data) {
    console.log('[App] Round results:', data);

    // Find current player's results
    const myResults = data.results.find(r => r.playerId === gameState.playerId);

    if (myResults) {
        showResultsModal(myResults, data);
    }
}

// ==================== UI UPDATES ====================

function updatePhaseDisplay(phase, roundNumber) {
    const phaseText = document.getElementById('phaseText');
    const roundBadge = document.getElementById('roundNumber');

    // Format phase name
    const phaseNames = {
        'lobby': 'Lobby',
        'betting': 'Betting',
        'insurance': 'Insurance',
        'dealing': 'Dealing',
        'playing': 'Playing',
        'dealer': 'Dealer Turn',
        'results': 'Results'
    };

    phaseText.textContent = phaseNames[phase] || phase;
    roundBadge.textContent = 'Round ' + roundNumber;
}

function updatePlayerSeats(players, seats) {
    // Reset all seats to empty
    for (let i = 1; i <= 5; i++) {
        const seatElement = document.querySelector(`.player-seat[data-seat="${i}"]`);
        if (seatElement) {
            seatElement.querySelector('.seat-empty').style.display = 'flex';
            seatElement.querySelector('.seat-occupied').style.display = 'none';
            seatElement.classList.remove('host', 'active', 'sitting-out');
        }
    }

    // Populate occupied seats
    players.forEach(player => {
        const seatElement = document.querySelector(`.player-seat[data-seat="${player.seat}"]`);
        if (!seatElement) return;

        // Show occupied, hide empty
        seatElement.querySelector('.seat-empty').style.display = 'none';
        seatElement.querySelector('.seat-occupied').style.display = 'flex';

        // Update player info
        seatElement.querySelector('.seat-player-name').textContent = player.name;
        seatElement.querySelector('.seat-bankroll').textContent = '$' + player.bankroll;

        // Show bet if exists
        if (player.currentBet > 0) {
            // Show main bet amount
            seatElement.querySelector('.bet-amount').textContent = '$' + player.currentBet;
            seatElement.querySelector('.seat-bet-info').style.display = 'block';

            // Show side bet indicators
            const sideBetsDisplay = seatElement.querySelector('.side-bets-display');
            if (sideBetsDisplay) {
                sideBetsDisplay.innerHTML = '';

                const sideBetIndicators = [];

                if (player.sideBets?.perfectPairs > 0) {
                    sideBetIndicators.push(`<span class="side-bet-indicator pp">PP: $${player.sideBets.perfectPairs}</span>`);
                }
                if (player.sideBets?.bustIt > 0) {
                    sideBetIndicators.push(`<span class="side-bet-indicator bi">BI: $${player.sideBets.bustIt}</span>`);
                }
                if (player.sideBets?.twentyOnePlus3 > 0) {
                    sideBetIndicators.push(`<span class="side-bet-indicator tp">21+3: $${player.sideBets.twentyOnePlus3}</span>`);
                }

                if (sideBetIndicators.length > 0) {
                    sideBetsDisplay.innerHTML = sideBetIndicators.join('');
                }
            }
        } else {
            seatElement.querySelector('.seat-bet-info').style.display = 'none';
        }

        // Add host class if host
        if (player.isHost) {
            seatElement.classList.add('host');
        }

        // Highlight if sitting out
        if (player.eliminated) {
            seatElement.classList.add('sitting-out');
        }

        // Highlight if current player
        if (player.id === gameState.playerId) {
            seatElement.style.borderColor = 'var(--accent-gold)';
        }
    });
}

function updateTableMessage(state) {
    const tableMessage = document.getElementById('tableMessage');
    const lobbySettings = document.getElementById('lobbySettings');

    if (state.phase === 'lobby') {
        if (gameState.isHost) {
            tableMessage.textContent = 'You are the host. Start the game when ready!';
        } else {
            tableMessage.textContent = 'Waiting for host to start the game...';
        }

        // Show lobby settings
        if (lobbySettings && state.config) {
            lobbySettings.style.display = 'block';
            updateLobbySettingsDisplay(state.config);
        }

        // Show start game button for host
        updateControlsArea(state);
    } else {
        // Hide lobby settings during game
        if (lobbySettings) {
            lobbySettings.style.display = 'none';
        }

        if (state.phase === 'betting') {
            tableMessage.textContent = 'Place your bets!';
        } else if (state.phase === 'playing') {
            tableMessage.textContent = 'Player turns in progress...';
        } else if (state.phase === 'dealer') {
            tableMessage.textContent = 'Dealer\'s turn...';
        } else if (state.phase === 'results') {
            tableMessage.textContent = 'Round complete!';
        } else {
            tableMessage.textContent = '';
        }

        // Update controls based on phase
        updateControlsArea(state);
    }
}

function updateControlsArea(state) {
    const controlsArea = document.getElementById('controlsArea');
    const actionControlsArea = document.getElementById('actionControlsArea');
    const currentPlayer = state.players.find(p => p.id === gameState.playerId);

    console.log('[App] updateControlsArea - phase:', state.phase, 'isHost:', gameState.isHost, 'playerId:', gameState.playerId);

    if (state.phase === 'lobby' && gameState.isHost) {
        // Clear action controls
        if (actionControlsArea) actionControlsArea.innerHTML = '';

        console.log('[App] Showing start game button');

        // Show start game button for host
        controlsArea.innerHTML = `
            <button class="btn-game-action btn-start" id="startGameBtn">
                Start Game
            </button>
        `;

        document.getElementById('startGameBtn').addEventListener('click', () => {
            console.log('[App] Starting game...');
            gameState.socket.emit('start-game');
        });
    } else if (state.phase === 'betting') {
        // Clear action controls
        if (actionControlsArea) actionControlsArea.innerHTML = '';

        // Show betting interface
        showBettingInterface(state);
    } else if (state.phase === 'insurance' && currentPlayer) {
        // Clear action controls
        if (actionControlsArea) actionControlsArea.innerHTML = '';

        // Show insurance controls
        showInsuranceControls(state);
    } else if (state.phase === 'playing' && currentPlayer) {
        // Show player action controls
        showPlayerActionControls(state, currentPlayer);
    } else {
        // Clear both controls for other phases (dealer, results, etc.)
        controlsArea.innerHTML = '';
        if (actionControlsArea) actionControlsArea.innerHTML = '';
    }
}

function updateLobbySettingsDisplay(config) {
    document.getElementById('displayBankroll').textContent = '$' + config.startingBankroll;
    document.getElementById('displayBetRange').textContent = '$' + config.minBet + ' - $' + (config.maxBet || 'Unlimited');
    document.getElementById('displayDecks').textContent = config.deckCount;
    document.getElementById('displayBJPayout').textContent = config.blackjackPayout;
}

// ==================== BETTING INTERFACE ====================

function showBettingInterface(state) {
    const controlsArea = document.getElementById('controlsArea');
    const config = state.config;
    const currentPlayer = state.players.find(p => p.id === gameState.playerId);

    if (!currentPlayer || !config) return;

    // If player already placed a bet, clear saved bet state
    if (currentPlayer.currentBet > 0) {
        gameState.currentBets = null;
    }

    const minBet = config.minBet;
    const maxBet = config.maxBet || currentPlayer.bankroll;

    // Define chip denominations
    const chipValues = [1, 5, 10, 25, 50, 100, 500];
    const availableChips = chipValues.filter(v => v <= maxBet);

    controlsArea.innerHTML = `
        <div class="betting-container">
            <div class="betting-main">
                <div class="bet-section">
                    <label class="bet-label">Main Bet</label>
                    <div class="bet-display-area">
                        <div class="bet-value-large">
                            <span id="mainBetValue">$0</span>
                        </div>
                        <button class="btn-clear-bet" id="clearMainBet">Clear</button>
                    </div>
                    <div class="poker-chips">
                        ${availableChips.map(value => `
                            <button class="poker-chip chip-${value}" data-value="${value}" data-bet-type="main">
                                <span class="chip-value">$${value}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="betting-side">
                <button class="side-bets-toggle" id="sideBetsToggle">
                    <span>Side Bets (Optional)</span>
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="side-bets-list" id="sideBetsList">
                    <div class="side-bet-option">
                        <div class="side-bet-header">
                            <span class="side-bet-name">Perfect Pairs</span>
                            <span class="side-bet-payout">25:1</span>
                        </div>
                        <div class="side-bet-controls">
                            <div class="side-bet-value" id="perfectPairsValue">$0</div>
                            <button class="btn-clear-side" data-side="perfectPairs">Clear</button>
                        </div>
                        <div class="poker-chips-small">
                            ${availableChips.slice(0, 5).map(value => `
                                <button class="poker-chip-small chip-${value}" data-value="${value}" data-bet-type="perfectPairs">
                                    $${value}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="side-bet-option">
                        <div class="side-bet-header">
                            <span class="side-bet-name">Bust It</span>
                            <span class="side-bet-payout">250:1</span>
                        </div>
                        <div class="side-bet-controls">
                            <div class="side-bet-value" id="bustItValue">$0</div>
                            <button class="btn-clear-side" data-side="bustIt">Clear</button>
                        </div>
                        <div class="poker-chips-small">
                            ${availableChips.slice(0, 5).map(value => `
                                <button class="poker-chip-small chip-${value}" data-value="${value}" data-bet-type="bustIt">
                                    $${value}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="side-bet-option">
                        <div class="side-bet-header">
                            <span class="side-bet-name">21+3</span>
                            <span class="side-bet-payout">100:1</span>
                        </div>
                        <div class="side-bet-controls">
                            <div class="side-bet-value" id="twentyOnePlus3Value">$0</div>
                            <button class="btn-clear-side" data-side="twentyOnePlus3">Clear</button>
                        </div>
                        <div class="poker-chips-small">
                            ${availableChips.slice(0, 5).map(value => `
                                <button class="poker-chip-small chip-${value}" data-value="${value}" data-bet-type="twentyOnePlus3">
                                    $${value}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // Set up event listeners
    setupBettingControls(minBet, maxBet);
}

// Helper function to update the footer Place Bet button
function updateFooterPlaceBetButton(mainBet, minBet) {
    const placeBetBtnFooter = document.getElementById('placeBetBtnFooter');
    if (placeBetBtnFooter) {
        if (mainBet >= minBet) {
            placeBetBtnFooter.disabled = false;
        } else {
            placeBetBtnFooter.disabled = true;
        }
    }
}

function setupBettingControls(minBet, maxBet) {
    // Track bet amounts - restore from saved state if available
    const bets = gameState.currentBets || {
        main: 0,
        perfectPairs: 0,
        bustIt: 0,
        twentyOnePlus3: 0
    };

    // Initialize display with saved values
    updateBetDisplay('main', bets.main);
    updateBetDisplay('perfectPairs', bets.perfectPairs);
    updateBetDisplay('bustIt', bets.bustIt);
    updateBetDisplay('twentyOnePlus3', bets.twentyOnePlus3);

    // Initialize footer button state
    updateFooterPlaceBetButton(bets.main, minBet);

    // Update displays helper function (defined before use)
    function updateBetDisplay(betType, amount) {
        if (betType === 'main') {
            const el = document.getElementById('mainBetValue');
            if (el) el.textContent = '$' + amount;
        } else {
            const el = document.getElementById(`${betType}Value`);
            if (el) el.textContent = '$' + amount;
        }
    }

    // Side bets toggle - use class instead of inline styles to work with media queries
    const sideBetsToggle = document.getElementById('sideBetsToggle');
    const sideBetsList = document.getElementById('sideBetsList');
    if (sideBetsToggle && sideBetsList) {
        sideBetsToggle.addEventListener('click', () => {
            const isOpen = sideBetsList.classList.contains('open');
            if (isOpen) {
                sideBetsList.classList.remove('open');
            } else {
                sideBetsList.classList.add('open');
            }
            const icon = sideBetsToggle.querySelector('.toggle-icon');
            if (icon) {
                icon.textContent = isOpen ? '▼' : '▲';
            }
        });
    }

    // Chip click handlers
    document.querySelectorAll('.poker-chip, .poker-chip-small').forEach(chip => {
        chip.addEventListener('click', () => {
            const value = parseInt(chip.dataset.value);
            const betType = chip.dataset.betType;

            // Add chip value to bet
            bets[betType] += value;

            // Don't exceed max bet
            const currentPlayer = gameState.players?.find(p => p.id === gameState.playerId);
            if (currentPlayer && bets[betType] > currentPlayer.bankroll) {
                bets[betType] = currentPlayer.bankroll;
            }

            updateBetDisplay(betType, bets[betType]);
            updatePlaceBetButton();
            updateFooterPlaceBetButton(bets.main, minBet);

            // Save to global state for persistence
            gameState.currentBets = { ...bets };

            // Visual feedback
            chip.classList.add('chip-clicked');
            setTimeout(() => chip.classList.remove('chip-clicked'), 200);
        });
    });

    // Clear buttons
    document.getElementById('clearMainBet')?.addEventListener('click', () => {
        bets.main = 0;
        updateBetDisplay('main', 0);
        updatePlaceBetButton();
        updateFooterPlaceBetButton(0, minBet);
        gameState.currentBets = { ...bets };
    });

    document.querySelectorAll('.btn-clear-side').forEach(btn => {
        btn.addEventListener('click', () => {
            const betType = btn.dataset.side;
            bets[betType] = 0;
            updateBetDisplay(betType, 0);
            gameState.currentBets = { ...bets };
        });
    });

    // Sticky action bar buttons - Place bet
    document.getElementById('placeBetBtnAction')?.addEventListener('click', () => {
        placeBet(bets);
    });

    // Sticky action bar buttons - Cancel bet
    document.getElementById('cancelBetBtnAction')?.addEventListener('click', () => {
        cancelBet();
    });

    // Sticky action bar buttons - Sit Out
    document.getElementById('sitOutBtnAction')?.addEventListener('click', () => {
        console.log('[App] Sitting out this round');
        gameState.socket.emit('sit-out', {});
    });

    // Sticky action bar buttons - Rejoin
    document.getElementById('rejoinBtnAction')?.addEventListener('click', () => {
        console.log('[App] Rejoining game');
        gameState.socket.emit('cancel-sit-out', {});
    });

    // Ready checkbox in action bar - with debouncing and loading state
    document.getElementById('readyCheckboxAction')?.addEventListener('change', (e) => {
        const isReady = e.target.checked;

        // Prevent double-clicking
        if (gameState.readyRequestPending) {
            console.log('[App] Ready request already pending');
            e.target.checked = !isReady; // Revert checkbox
            return;
        }

        // Only allow checking (ready = true), not unchecking
        if (!isReady) {
            console.log('[App] Cannot uncheck ready - ready is final');
            e.target.checked = true; // Force back to checked
            showNotification('Ready status cannot be changed once set', 'info');
            return;
        }

        console.log('[App] Sending ready signal to server...');

        // Set pending flag
        gameState.readyRequestPending = true;

        // Disable checkbox during request
        e.target.disabled = true;

        // Send ready signal
        gameState.socket.emit('ready-bet', { ready: true });

        // Timeout after 5 seconds if no response
        setTimeout(() => {
            if (gameState.readyRequestPending) {
                console.log('[App] Ready request timed out');
                gameState.readyRequestPending = false;

                // Re-enable checkbox and uncheck
                if (e.target) {
                    e.target.disabled = false;
                    e.target.checked = false;
                }

                showNotification('Request timed out. Please try again.', 'error');
            }
        }, 5000);
    });

    // Enable/disable place bet button based on minimum bet
    function updatePlaceBetButton() {
        const placeBetBtn = document.getElementById('placeBetBtnAction');
        if (placeBetBtn) {
            if (bets.main >= minBet) {
                placeBetBtn.disabled = false;
            } else {
                placeBetBtn.disabled = true;
            }
        }
    }

    // Initialize place bet button state
    updatePlaceBetButton();
}

function placeBet(bets) {
    const sideBets = {
        perfectPairs: bets.perfectPairs,
        bustIt: bets.bustIt,
        twentyOnePlus3: bets.twentyOnePlus3
    };

    console.log('[App] Placing bet:', { mainBet: bets.main, sideBets });

    gameState.socket.emit('place-bet', {
        mainBet: bets.main,
        sideBets
    });

    // Clear saved bets after placing
    gameState.currentBets = null;

    // Disable betting controls after placing bet
    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.disabled = true;
        placeBetBtn.textContent = 'Bet Placed ✓';
    }

    // Disable all chips
    document.querySelectorAll('.poker-chip, .poker-chip-small').forEach(chip => {
        chip.disabled = true;
        chip.style.opacity = '0.5';
        chip.style.cursor = 'not-allowed';
    });

    // Disable clear buttons
    document.querySelectorAll('.btn-clear-bet, .btn-clear-side').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

/**
 * Render the unified action footer based on game phase
 * @param {String} phase - Current game phase
 * @param {Object} player - Current player object
 * @param {Object} config - Game configuration (optional, for betting phase)
 */
function renderUnifiedActionFooter(phase, player, config) {
    const footer = document.getElementById('unifiedActionFooter');
    const content = document.getElementById('actionFooterContent');

    if (!footer || !content) return;

    // Set mobile phase data attribute for CSS targeting
    if (window.innerWidth <= 480) {
        if (phase === 'betting') {
            document.body.setAttribute('data-mobile-phase', 'betting');
        } else if (phase === 'playing' || phase === 'dealer' || phase === 'insurance') {
            // All game-in-progress phases should show the table
            document.body.setAttribute('data-mobile-phase', 'playing');
        } else {
            document.body.removeAttribute('data-mobile-phase');
        }
    }

    if (phase === 'betting' && player) {
        // Betting phase: Show appropriate buttons based on player state
        footer.style.display = 'block';

        const hasBet = player.currentBet > 0;
        const isReady = player.ready;
        const isEliminated = player.eliminated;

        // Check if minimum bet is met (for Place Bet button)
        const currentBets = gameState.currentBets || { main: 0 };
        const minBet = config?.minBet || 10;
        const canPlaceBet = currentBets.main >= minBet;

        // Determine which buttons to show
        // Left button: Sit Out (no bet) or Rejoin (eliminated) or empty
        // Right button: Place Bet (no bet) or Ready (has bet)

        content.innerHTML = `
            <div class="footer-buttons-betting">
                ${isEliminated ? `
                    <button class="btn-footer-action btn-footer-rejoin" id="rejoinBtnFooter">
                        Rejoin
                    </button>
                ` : !hasBet ? `
                    <button class="btn-footer-action btn-footer-sitout" id="sitOutBtnFooter">
                        Sit Out
                    </button>
                ` : '<div></div>'}

                ${!hasBet ? `
                    <button class="btn-footer-action btn-footer-ready" id="placeBetBtnFooter" ${!canPlaceBet ? 'disabled' : ''}>
                        Place Bet
                    </button>
                ` : `
                    <button class="btn-footer-action btn-footer-ready" id="readyBtnFooter" ${isReady ? 'disabled' : ''}>
                        ${isReady ? '✓ Ready' : 'Ready'}
                    </button>
                `}
            </div>
        `;

        // Attach event listeners
        const sitOutBtn = document.getElementById('sitOutBtnFooter');
        const rejoinBtn = document.getElementById('rejoinBtnFooter');
        const placeBetBtn = document.getElementById('placeBetBtnFooter');
        const readyBtn = document.getElementById('readyBtnFooter');

        if (sitOutBtn) {
            sitOutBtn.addEventListener('click', handleSitOut);
        }

        if (rejoinBtn) {
            rejoinBtn.addEventListener('click', handleRejoin);
        }

        if (placeBetBtn) {
            placeBetBtn.addEventListener('click', () => {
                // Get current bets from global state or calculate from UI
                const bets = gameState.currentBets || {
                    main: 0,
                    perfectPairs: 0,
                    bustIt: 0,
                    twentyOnePlus3: 0
                };
                placeBet(bets);
            });
        }

        if (readyBtn) {
            readyBtn.addEventListener('click', handleReadyClick);
        }

    } else if (phase === 'playing') {
        // Playing phase: Will be populated by showPlayerActionControls
        footer.style.display = 'block';
        // Content will be set by showPlayerActionControls
    } else if (phase === 'dealer' || phase === 'insurance') {
        // During dealer's turn or insurance phase, hide footer but keep mobile layout
        footer.style.display = 'none';
        content.innerHTML = '';
        // Mobile phase already set above for table display
    } else {
        // Lobby, results, or other phases
        footer.style.display = 'none';
        content.innerHTML = '';
        if (window.innerWidth <= 480) {
            document.body.removeAttribute('data-mobile-phase');
        }
    }
}

/**
 * Handler for Sit Out button
 */
function handleSitOut() {
    console.log('[App] Sitting out this round');
    gameState.socket.emit('sit-out', {});
}

/**
 * Handler for Rejoin button
 */
function handleRejoin() {
    console.log('[App] Rejoining game');
    gameState.socket.emit('cancel-sit-out', {});
}

/**
 * Handler for Ready button
 */
function handleReadyClick() {
    // Prevent double-clicking
    if (gameState.readyRequestPending) {
        console.log('[App] Ready request already pending');
        return;
    }

    console.log('[App] Sending ready signal to server...');
    gameState.readyRequestPending = true;

    // Disable button while processing
    const readyBtn = document.getElementById('readyBtnFooter');
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.textContent = 'Processing...';
    }

    // Send ready signal - same event as the old checkbox system
    gameState.socket.emit('ready-bet', { ready: true });

    // Timeout after 5 seconds if no response
    setTimeout(() => {
        if (gameState.readyRequestPending) {
            console.log('[App] Ready request timed out');
            gameState.readyRequestPending = false;

            // Re-enable button and reset text
            if (readyBtn) {
                readyBtn.disabled = false;
                readyBtn.textContent = 'Ready';
            }

            showNotification('Request timed out. Please try again.', 'error');
        }
    }, 5000);
}

/**
 * Sync betting UI elements with server game state
 * Ensures footer buttons match server truth
 * @param {Object} player - Current player object from server state
 * @param {Object} config - Game configuration
 */
function syncBettingUIWithServerState(player, config) {
    // Render the unified action footer for betting phase
    renderUnifiedActionFooter('betting', player, config);
}

function cancelBet() {
    console.log('[App] Canceling bet');

    gameState.socket.emit('cancel-bet', {});

    // Clear ready request pending flag
    gameState.readyRequestPending = false;

    // Re-enable all chips
    document.querySelectorAll('.poker-chip, .poker-chip-small').forEach(chip => {
        chip.disabled = false;
        chip.style.opacity = '1';
        chip.style.cursor = 'pointer';
    });

    // Re-enable clear buttons
    document.querySelectorAll('.btn-clear-bet, .btn-clear-side').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
}

// ==================== INSURANCE CONTROLS ====================

function showInsuranceControls(state) {
    const controlsArea = document.getElementById('controlsArea');
    const currentPlayer = state.players.find(p => p.id === gameState.playerId);

    if (!currentPlayer || !currentPlayer.hands || currentPlayer.hands.length === 0) {
        controlsArea.innerHTML = '';
        return;
    }

    const insuranceCost = Math.floor(currentPlayer.currentBet / 2);

    controlsArea.innerHTML = `
        <div class="insurance-container">
            <div class="insurance-message">
                <h3>Insurance Available</h3>
                <p>Dealer showing Ace. Would you like insurance?</p>
                <p class="insurance-cost">Cost: $${insuranceCost}</p>
            </div>
            <div class="insurance-actions">
                <button class="btn-game-action btn-insurance-yes" id="insuranceYesBtn">
                    Yes, Take Insurance
                </button>
                <button class="btn-game-action btn-insurance-no" id="insuranceNoBtn">
                    No Thanks
                </button>
            </div>
        </div>
    `;

    document.getElementById('insuranceYesBtn').addEventListener('click', () => {
        console.log('[App] Taking insurance');
        gameState.socket.emit('place-insurance', { takesInsurance: true });
        disableInsuranceButtons();
    });

    document.getElementById('insuranceNoBtn').addEventListener('click', () => {
        console.log('[App] Declining insurance');
        gameState.socket.emit('place-insurance', { takesInsurance: false });
        disableInsuranceButtons();
    });

    function disableInsuranceButtons() {
        const yesBtn = document.getElementById('insuranceYesBtn');
        const noBtn = document.getElementById('insuranceNoBtn');
        if (yesBtn) yesBtn.disabled = true;
        if (noBtn) noBtn.disabled = true;
    }
}

// ==================== PLAYER ACTION CONTROLS ====================

function showPlayerActionControls(state, currentPlayer) {
    const actionControlsArea = document.getElementById('actionControlsArea');
    const controlsArea = document.getElementById('controlsArea');
    const footer = document.getElementById('unifiedActionFooter');
    const content = document.getElementById('actionFooterContent');

    // Check if it's this player's turn
    const isMyTurn = state.currentPlayer === gameState.playerId;

    if (!isMyTurn) {
        if (actionControlsArea) actionControlsArea.innerHTML = '';
        if (controlsArea) controlsArea.innerHTML = '';
        renderUnifiedActionFooter('other', currentPlayer);
        return;
    }

    // Get current hand
    const handIndex = state.currentHandIndex || 0;
    const hand = currentPlayer.hands?.[handIndex];

    if (!hand) {
        if (actionControlsArea) actionControlsArea.innerHTML = '';
        if (controlsArea) controlsArea.innerHTML = '';
        renderUnifiedActionFooter('other', currentPlayer);
        return;
    }

    // Determine available actions
    // Handle hand.value being either an object {value, isSoft} or a number
    const handValue = typeof hand.value === 'object' ? hand.value.value : hand.value;
    const handIsSoft = typeof hand.value === 'object' ? hand.value.isSoft : false;

    const canHit = hand.status === 'active' && handValue < 21;
    const canStand = hand.status === 'active';

    // Can double if: exactly 2 cards, hand is active, and player has enough bankroll
    // The bet amount to match is the hand's bet (or current bet for first hand)
    const betToMatch = hand.bet || currentPlayer.currentBet;
    const canDouble = hand.cards && hand.cards.length === 2 &&
                      hand.status === 'active' &&
                      currentPlayer.bankroll >= betToMatch;

    // Check reasons for disabled double
    const doubleInsufficientFunds = hand.cards && hand.cards.length === 2 &&
                                    hand.status === 'active' &&
                                    currentPlayer.bankroll < betToMatch;

    // Debug logging for double button
    console.log('[App] Double button check:', {
        handCards: hand.cards?.length,
        handStatus: hand.status,
        betToMatch,
        playerBankroll: currentPlayer.bankroll,
        canDouble,
        doubleInsufficientFunds,
        handValue
    });

    // Check if can split - same rank OR both 10-value cards (10, J, Q, K)
    const isTenValue = (card) => ['10', 'J', 'Q', 'K'].includes(card.rank);
    const canSplit = hand.cards.length === 2 &&
                     (hand.cards[0].rank === hand.cards[1].rank ||
                      (isTenValue(hand.cards[0]) && isTenValue(hand.cards[1]))) &&
                     currentPlayer.bankroll >= currentPlayer.currentBet &&
                     currentPlayer.hands.length < 4;

    // Check reasons for disabled split
    const splitInsufficientFunds = hand.cards.length === 2 &&
                                   (hand.cards[0].rank === hand.cards[1].rank ||
                                    (isTenValue(hand.cards[0]) && isTenValue(hand.cards[1]))) &&
                                   currentPlayer.bankroll < currentPlayer.currentBet &&
                                   currentPlayer.hands.length < 4;

    // Clear old controls areas
    if (actionControlsArea) actionControlsArea.innerHTML = '';
    if (controlsArea) controlsArea.innerHTML = '';

    // Set mobile phase for playing
    if (window.innerWidth <= 480) {
        document.body.setAttribute('data-mobile-phase', 'playing');
    }

    // Show action controls in unified footer
    if (footer && content) {
        footer.style.display = 'block';
        content.innerHTML = `
            <div class="footer-buttons-playing">
                <button class="btn-footer-action btn-footer-hit" id="hitBtn" ${!canHit ? 'disabled' : ''}>
                    Hit
                </button>
                <button class="btn-footer-action btn-footer-stand" id="standBtn" ${!canStand ? 'disabled' : ''}>
                    Stand
                </button>
                <button class="btn-footer-action btn-footer-double ${doubleInsufficientFunds ? 'insufficient-funds' : ''}" id="doubleBtn" ${!canDouble ? 'disabled' : ''}>
                    <span class="button-main-text">Double</span>
                    ${doubleInsufficientFunds ? '<span class="button-sub-text">Insufficient Funds</span>' : ''}
                </button>
                <button class="btn-footer-action btn-footer-split ${splitInsufficientFunds ? 'insufficient-funds' : ''}" id="splitBtn" ${!canSplit ? 'disabled' : ''}>
                    <span class="button-main-text">Split</span>
                    ${splitInsufficientFunds ? '<span class="button-sub-text">Insufficient Funds</span>' : ''}
                </button>
            </div>
        `;

        // Add event listeners - only for enabled buttons
        if (canHit) {
            document.getElementById('hitBtn').addEventListener('click', () => {
                performAction('hit', handIndex);
            });
        }

        if (canStand) {
            document.getElementById('standBtn').addEventListener('click', () => {
                performAction('stand', handIndex);
            });
        }

        if (canDouble) {
            document.getElementById('doubleBtn').addEventListener('click', () => {
                performAction('double', handIndex);
            });
        }

        if (canSplit) {
            document.getElementById('splitBtn').addEventListener('click', () => {
                performAction('split', handIndex);
            });
        }
    }
}

function performAction(action, handIndex) {
    console.log(`[App] Performing action: ${action} on hand ${handIndex}`);

    gameState.socket.emit('player-action', { action, handIndex });

    // Disable all action buttons while processing
    document.querySelectorAll('.btn-action, .btn-footer-action').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

// ==================== SETTINGS MODAL ====================

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');

    // Populate modal with current config
    if (gameState.config) {
        document.getElementById('settingStartingBankroll').value = gameState.config.startingBankroll;
        document.getElementById('settingMinBet').value = gameState.config.minBet;
        document.getElementById('settingMaxBet').value = gameState.config.maxBet || '';
        document.getElementById('settingDeckCount').value = gameState.config.deckCount;
        document.getElementById('settingBlackjackPayout').value = gameState.config.blackjackPayout;
        document.getElementById('settingInsurancePayout').value = gameState.config.insurancePayout;
        document.getElementById('settingSplitAcesBlackjack').checked = gameState.config.splitAcesBlackjack;
        document.getElementById('settingRoundDelay').value = gameState.config.roundDelay;
    }

    modal.style.display = 'flex';
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const errorDiv = document.getElementById('settingsError');

    modal.style.display = 'none';
    errorDiv.style.display = 'none';
}

function saveSettings() {
    const config = {
        startingBankroll: parseInt(document.getElementById('settingStartingBankroll').value),
        minBet: parseInt(document.getElementById('settingMinBet').value),
        maxBet: parseInt(document.getElementById('settingMaxBet').value) || null,
        deckCount: parseInt(document.getElementById('settingDeckCount').value),
        blackjackPayout: document.getElementById('settingBlackjackPayout').value,
        insurancePayout: document.getElementById('settingInsurancePayout').value,
        splitAcesBlackjack: document.getElementById('settingSplitAcesBlackjack').checked,
        roundDelay: parseInt(document.getElementById('settingRoundDelay').value)
    };

    // Validate
    if (config.maxBet !== null && config.minBet >= config.maxBet) {
        showSettingsError('Minimum bet must be less than maximum bet!');
        return;
    }

    if (config.startingBankroll < config.minBet) {
        showSettingsError('Starting bankroll must be at least the minimum bet!');
        return;
    }

    console.log('[App] Saving settings:', config);
    gameState.socket.emit('save-config', config);

    // Close modal on successful save
    closeSettingsModal();
}

function showSettingsError(message) {
    const errorDiv = document.getElementById('settingsError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function setupSettingsModal() {
    // Close button
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsModal);

    // Cancel button
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettingsModal);

    // Save button
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Close on background click
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettingsModal();
        }
    });

    // Listen for config update
    gameState.socket.on('config-update', (data) => {
        console.log('[App] Config updated:', data.config);
        gameState.config = data.config;
        updateLobbySettingsDisplay(data.config);
    });

    // Listen for config save failure
    gameState.socket.on('config-failed', (data) => {
        console.error('[App] Config save failed:', data.error);
        showSettingsError(data.error);
    });
}

// ==================== TIMER HANDLERS ====================

function handleBettingPhaseTimer(data) {
    console.log('[App] Betting phase timer:', data.timeLimit);
    startPhaseTimer(data.timeLimit);
}

function handleInsuranceTimer(data) {
    console.log('[App] Insurance timer:', data.timeLimit);
    startPhaseTimer(data.timeLimit);
}

function handlePlayerTurnTimer(data) {
    console.log('[App] Player turn timer:', data.timeLimit);
    startPhaseTimer(data.timeLimit);
}

function startPhaseTimer(timeLimit) {
    // Clear any existing timer
    stopPhaseTimer();

    // Set end time
    gameState.timerEndTime = Date.now() + (timeLimit * 1000);

    // Show timer badge
    const timerEl = document.getElementById('phaseTimer');
    if (timerEl) {
        timerEl.style.display = 'inline-block';
        timerEl.classList.remove('warning');
    }

    // Update timer every 100ms for smooth countdown
    gameState.timerInterval = setInterval(updatePhaseTimer, 100);
    updatePhaseTimer(); // Update immediately
}

function updatePhaseTimer() {
    const timerEl = document.getElementById('phaseTimer');
    if (!timerEl || !gameState.timerEndTime) return;

    const remaining = Math.max(0, gameState.timerEndTime - Date.now());
    const seconds = Math.ceil(remaining / 1000);

    timerEl.textContent = `⏱ ${seconds}s`;

    // Add warning style when less than 5 seconds
    if (seconds <= 5 && seconds > 0) {
        timerEl.classList.add('warning');
    } else {
        timerEl.classList.remove('warning');
    }

    // Stop timer when reached 0
    if (remaining <= 0) {
        stopPhaseTimer();
    }
}

function stopPhaseTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    gameState.timerEndTime = null;

    // Hide timer badge
    const timerEl = document.getElementById('phaseTimer');
    if (timerEl) {
        timerEl.style.display = 'none';
        timerEl.classList.remove('warning');
    }
}

// ==================== RESULTS MODAL ====================

function showResultsModal(myResults, roundData) {
    const modal = document.getElementById('resultsModal');
    const resultsBody = document.getElementById('resultsBody');

    // Calculate net profit/loss
    let totalBet = 0;
    myResults.hands.forEach(hand => {
        totalBet += hand.bet;
    });

    // Add side bets to total bet
    if (myResults.sideBets.perfectPairs) totalBet += myResults.sideBets.perfectPairs.bet;
    if (myResults.sideBets.bustIt) totalBet += myResults.sideBets.bustIt.bet;
    if (myResults.sideBets.twentyOnePlus3) totalBet += myResults.sideBets.twentyOnePlus3.bet;

    const netProfit = myResults.totalWinnings - totalBet;
    const isWin = netProfit > 0;
    const isPush = netProfit === 0;

    // Build results HTML
    let html = `
        <div class="results-summary ${isWin ? 'win' : isPush ? 'push' : 'loss'}">
            <div class="results-outcome">
                ${isWin ? '🎉 You Win!' : isPush ? '🤝 Push' : '😔 You Lose'}
            </div>
            <div class="results-profit">
                ${netProfit > 0 ? '+' : ''}$${netProfit}
            </div>
        </div>

        <div class="results-breakdown">
            <h3>Hand Results</h3>
    `;

    // Show each hand result
    myResults.hands.forEach((hand, index) => {
        const resultLabel = {
            'win': 'Win',
            'loss': 'Loss',
            'push': 'Push',
            'blackjack': 'Blackjack!'
        }[hand.result] || hand.result;

        const resultClass = hand.result === 'blackjack' ? 'win' : hand.result;

        html += `
            <div class="result-item ${resultClass}">
                <div class="result-label">
                    ${myResults.hands.length > 1 ? `Hand ${index + 1}: ` : ''}${resultLabel}
                </div>
                <div class="result-details">
                    <span>Bet: $${hand.bet}</span>
                    <span class="result-payout">Payout: $${hand.payout}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Show side bet results if any
    const hasSideBets = myResults.sideBets.perfectPairs || myResults.sideBets.bustIt || myResults.sideBets.twentyOnePlus3;
    if (hasSideBets) {
        html += `<div class="results-breakdown"><h3>Side Bets</h3>`;

        if (myResults.sideBets.perfectPairs) {
            const sb = myResults.sideBets.perfectPairs;
            html += `
                <div class="result-item ${sb.won ? 'win' : 'loss'}">
                    <div class="result-label">Perfect Pairs ${sb.won ? '✓' : '✗'}</div>
                    <div class="result-details">
                        <span>Bet: $${sb.bet}</span>
                        <span class="result-payout">Payout: $${sb.payout}</span>
                    </div>
                </div>
            `;
        }

        if (myResults.sideBets.bustIt) {
            const sb = myResults.sideBets.bustIt;
            html += `
                <div class="result-item ${sb.won ? 'win' : 'loss'}">
                    <div class="result-label">Bust It ${sb.won ? '✓' : '✗'}</div>
                    <div class="result-details">
                        <span>Bet: $${sb.bet}</span>
                        <span class="result-payout">Payout: $${sb.payout}</span>
                    </div>
                </div>
            `;
        }

        if (myResults.sideBets.twentyOnePlus3) {
            const sb = myResults.sideBets.twentyOnePlus3;
            html += `
                <div class="result-item ${sb.won ? 'win' : 'loss'}">
                    <div class="result-label">21+3 ${sb.won ? '✓' : '✗'}</div>
                    <div class="result-details">
                        <span>Bet: $${sb.bet}</span>
                        <span class="result-payout">Payout: $${sb.payout}</span>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    }

    // Show bankroll summary
    html += `
        <div class="results-summary-footer">
            <div class="bankroll-update">
                <div class="bankroll-label">New Bankroll</div>
                <div class="bankroll-value">$${myResults.newBankroll}</div>
            </div>
        </div>
    `;

    resultsBody.innerHTML = html;
    modal.style.display = 'flex';
}

function closeResultsModal() {
    const modal = document.getElementById('resultsModal');
    modal.style.display = 'none';
}

// ==================== UTILITY FUNCTIONS ====================

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ==================== STARTUP ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM loaded, initializing...');

    // Initialize socket connection
    initSocket();

    // Setup join form
    setupJoinForm();

    // Setup settings modal
    setupSettingsModal();

    // Setup results modal
    document.getElementById('closeResultsBtn')?.addEventListener('click', closeResultsModal);

    console.log('[App] Initialization complete');
});
