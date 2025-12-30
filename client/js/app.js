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

// ==================== STATS TRACKING SYSTEM ====================

const gameStats = {
    // Initialize or load stats from localStorage
    init() {
        const saved = localStorage.getItem('blackjackStats');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
            } catch (e) {
                console.error('[Stats] Failed to load stats:', e);
                this.reset();
            }
        } else {
            this.reset();
        }
    },

    // Reset all stats
    reset() {
        this.totalRounds = 0;
        this.wins = 0;
        this.losses = 0;
        this.pushes = 0;
        this.blackjacks = 0;
        this.busts = 0;
        this.totalWagered = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.biggestWin = 0;
        this.biggestLoss = 0;
        this.currentStreak = 0;
        this.streakType = null; // 'win' or 'loss'
        this.bestWinStreak = 0;
        this.bestLossStreak = 0;
        this.recentRounds = []; // Last 10 rounds
        this.sideBetsPlayed = 0;
        this.sideBetsWon = 0;
        this.doubles = 0;
        this.splits = 0;
        this.insuranceTaken = 0;
        this.insuranceWon = 0;
        this.save();
    },

    // Save to localStorage
    save() {
        try {
            const data = {
                totalRounds: this.totalRounds,
                wins: this.wins,
                losses: this.losses,
                pushes: this.pushes,
                blackjacks: this.blackjacks,
                busts: this.busts,
                totalWagered: this.totalWagered,
                totalWon: this.totalWon,
                totalLost: this.totalLost,
                biggestWin: this.biggestWin,
                biggestLoss: this.biggestLoss,
                currentStreak: this.currentStreak,
                streakType: this.streakType,
                bestWinStreak: this.bestWinStreak,
                bestLossStreak: this.bestLossStreak,
                recentRounds: this.recentRounds,
                sideBetsPlayed: this.sideBetsPlayed,
                sideBetsWon: this.sideBetsWon,
                doubles: this.doubles,
                splits: this.splits,
                insuranceTaken: this.insuranceTaken,
                insuranceWon: this.insuranceWon
            };
            localStorage.setItem('blackjackStats', JSON.stringify(data));
        } catch (e) {
            console.error('[Stats] Failed to save stats:', e);
        }
    },

    // Record a round result
    recordRound(result) {
        this.totalRounds++;

        // Update win/loss/push counts
        if (result.outcome === 'win' || result.outcome === 'blackjack') {
            this.wins++;
            if (result.outcome === 'blackjack') this.blackjacks++;

            // Update streak
            if (this.streakType === 'win') {
                this.currentStreak++;
            } else {
                this.currentStreak = 1;
                this.streakType = 'win';
            }
            this.bestWinStreak = Math.max(this.bestWinStreak, this.currentStreak);
        } else if (result.outcome === 'loss' || result.outcome === 'bust') {
            this.losses++;
            if (result.outcome === 'bust') this.busts++;

            // Update streak
            if (this.streakType === 'loss') {
                this.currentStreak++;
            } else {
                this.currentStreak = 1;
                this.streakType = 'loss';
            }
            this.bestLossStreak = Math.max(this.bestLossStreak, this.currentStreak);
        } else if (result.outcome === 'push') {
            this.pushes++;
            this.currentStreak = 0;
            this.streakType = null;
        }

        // Track money
        this.totalWagered += result.betAmount || 0;
        const profit = (result.profit || 0);

        if (profit > 0) {
            this.totalWon += profit;
            this.biggestWin = Math.max(this.biggestWin, profit);
        } else if (profit < 0) {
            this.totalLost += Math.abs(profit);
            this.biggestLoss = Math.max(this.biggestLoss, Math.abs(profit));
        }

        // Track side bets
        if (result.sideBetsWagered && result.sideBetsWagered > 0) {
            this.sideBetsPlayed++;
            if (result.sideBetsProfit && result.sideBetsProfit > 0) {
                this.sideBetsWon++;
            }
        }

        // Track actions
        if (result.doubled) this.doubles++;
        if (result.split) this.splits++;
        if (result.insurance) {
            this.insuranceTaken++;
            if (result.insuranceWon) this.insuranceWon++;
        }

        // Add to recent rounds (keep last 10)
        this.recentRounds.unshift({
            round: this.totalRounds,
            outcome: result.outcome,
            profit: profit,
            betAmount: result.betAmount,
            timestamp: Date.now()
        });
        if (this.recentRounds.length > 10) {
            this.recentRounds.pop();
        }

        this.save();
    },

    // Get computed stats
    getStats() {
        const winRate = this.totalRounds > 0 ? ((this.wins / this.totalRounds) * 100).toFixed(1) : '0.0';
        const netProfit = this.totalWon - this.totalLost;
        const avgBet = this.totalRounds > 0 ? (this.totalWagered / this.totalRounds).toFixed(0) : 0;
        const sideBetWinRate = this.sideBetsPlayed > 0 ? ((this.sideBetsWon / this.sideBetsPlayed) * 100).toFixed(1) : '0.0';
        const insuranceWinRate = this.insuranceTaken > 0 ? ((this.insuranceWon / this.insuranceTaken) * 100).toFixed(1) : '0.0';

        return {
            // Overall stats
            totalRounds: this.totalRounds,
            wins: this.wins,
            losses: this.losses,
            pushes: this.pushes,
            winRate: winRate,

            // Special outcomes
            blackjacks: this.blackjacks,
            busts: this.busts,

            // Money stats
            totalWagered: this.totalWagered,
            totalWon: this.totalWon,
            totalLost: this.totalLost,
            netProfit: netProfit,
            avgBet: avgBet,
            biggestWin: this.biggestWin,
            biggestLoss: this.biggestLoss,

            // Streaks
            currentStreak: this.currentStreak,
            streakType: this.streakType,
            bestWinStreak: this.bestWinStreak,
            bestLossStreak: this.bestLossStreak,

            // Side bets & actions
            sideBetsPlayed: this.sideBetsPlayed,
            sideBetsWon: this.sideBetsWon,
            sideBetWinRate: sideBetWinRate,
            doubles: this.doubles,
            splits: this.splits,
            insuranceTaken: this.insuranceTaken,
            insuranceWon: this.insuranceWon,
            insuranceWinRate: insuranceWinRate,

            // Recent history
            recentRounds: this.recentRounds
        };
    }
};

// ==================== FLOATING CARDS ANIMATION ====================

function initFloatingCards() {
    const container = document.getElementById('floatingCardsBg');
    if (!container) return;

    const cards = [
        { symbol: 'A♠', color: 'black' },
        { symbol: 'K♥', color: 'red' },
        { symbol: 'Q♦', color: 'red' },
        { symbol: 'J♣', color: 'black' },
        { symbol: '10♠', color: 'black' },
        { symbol: '9♥', color: 'red' },
        { symbol: '8♦', color: 'red' },
        { symbol: '7♣', color: 'black' }
    ];

    const floatingCards = [];
    const numCards = 8;

    // Create card elements
    for (let i = 0; i < numCards; i++) {
        const cardData = cards[i % cards.length];
        const card = document.createElement('div');
        card.className = `floating-card ${cardData.color}`;
        card.textContent = cardData.symbol;

        // Random starting position
        const x = Math.random() * (window.innerWidth - 60);
        const y = Math.random() * (window.innerHeight - 85);

        card.style.left = x + 'px';
        card.style.top = y + 'px';

        container.appendChild(card);

        // Store card data for animation
        floatingCards.push({
            element: card,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2, // Random velocity X (-1 to 1)
            vy: (Math.random() - 0.5) * 2, // Random velocity Y (-1 to 1)
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2
        });
    }

    // Animation loop
    function animate() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width <= 480;
        const cardWidth = isMobile ? 45 : 60;
        const cardHeight = isMobile ? 64 : 85;

        floatingCards.forEach(card => {
            // Update position
            card.x += card.vx;
            card.y += card.vy;
            card.rotation += card.rotationSpeed;

            // Bounce off edges
            if (card.x <= 0 || card.x >= width - cardWidth) {
                card.vx *= -1;
                card.x = Math.max(0, Math.min(width - cardWidth, card.x));
            }
            if (card.y <= 0 || card.y >= height - cardHeight) {
                card.vy *= -1;
                card.y = Math.max(0, Math.min(height - cardHeight, card.y));
            }

            // Apply position and rotation
            card.element.style.left = card.x + 'px';
            card.element.style.top = card.y + 'px';
            card.element.style.transform = `rotate(${card.rotation}deg)`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}

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
    gameState.socket.on('host-transferred', handleHostTransferred);
    gameState.socket.on('player-auto-folded', handlePlayerAutoFolded);

    // Betting events
    gameState.socket.on('bet-placed', handleBetPlaced);
    gameState.socket.on('bet-failed', handleBetFailed);
    gameState.socket.on('bet-cancelled', handleBetCancelled);
    gameState.socket.on('cancel-bet-failed', handleCancelBetFailed);

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
    const charCounter = document.getElementById('charCounter');
    const validationMsg = document.getElementById('validationMsg');
    const joinButton = document.getElementById('joinButton');

    // Real-time validation and character counter
    function validateInput() {
        const value = playerNameInput.value;
        const length = value.length;

        // Update character counter
        charCounter.textContent = `${length}/20`;

        // Validation logic
        if (length === 0) {
            playerNameInput.classList.remove('valid', 'invalid');
            validationMsg.textContent = '';
            validationMsg.classList.remove('success', 'error');
            joinButton.disabled = true;
        } else if (length < 2) {
            playerNameInput.classList.remove('valid');
            playerNameInput.classList.add('invalid');
            validationMsg.textContent = 'Too short';
            validationMsg.classList.remove('success');
            validationMsg.classList.add('error');
            joinButton.disabled = true;
        } else if (length > 20) {
            playerNameInput.classList.remove('valid');
            playerNameInput.classList.add('invalid');
            validationMsg.textContent = 'Too long';
            validationMsg.classList.remove('success');
            validationMsg.classList.add('error');
            joinButton.disabled = true;
        } else {
            playerNameInput.classList.remove('invalid');
            playerNameInput.classList.add('valid');
            validationMsg.textContent = 'Looks good!';
            validationMsg.classList.remove('error');
            validationMsg.classList.add('success');
            joinButton.disabled = !gameState.connected;
        }
    }

    // Listen for input changes
    playerNameInput.addEventListener('input', validateInput);
    playerNameInput.addEventListener('keyup', validateInput);

    joinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const playerName = playerNameInput.value.trim();

        if (!playerName || playerName.length < 2) {
            return;
        }

        if (playerName.length > 20) {
            return;
        }

        console.log('[App] Attempting to join game as:', playerName);
        gameState.socket.emit('join-game', { playerName });
    });
}

function setupEasterEgg() {
    const title = document.querySelector('.join-container h1');
    if (!title) return;

    let clickCount = 0;
    let clickTimeout = null;

    title.addEventListener('click', () => {
        clickCount++;

        // Reset after 2 seconds of no clicks
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            clickCount = 0;
        }, 2000);

        // Easter egg trigger
        if (clickCount === 3) {
            clickCount = 0;
            dealEasterEggHand();
        }
    });
}

function dealEasterEggHand() {
    // Define all possible cards
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Generate random hand (2 cards)
    function getRandomCard() {
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const isRed = suit === '♥' || suit === '♦';
        return { display: rank + suit, isRed };
    }

    const card1 = getRandomCard();
    const card2 = getRandomCard();

    // Calculate hand value
    function getCardValue(card) {
        const rank = card.display.slice(0, -1); // Remove suit
        if (rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    let total = getCardValue(card1) + getCardValue(card2);
    let hasAce = card1.display.startsWith('A') || card2.display.startsWith('A');

    // Adjust for ace if busting
    if (total > 21 && hasAce) {
        total -= 10;
    }

    // Determine message
    let message;
    let emoji;
    if (total === 21 && (card1.display.startsWith('A') || card2.display.startsWith('A'))) {
        message = 'Blackjack! Perfect start!';
        emoji = '🎉';
    } else if (total === 21) {
        message = 'Lucky 21! Great hand!';
        emoji = '🎊';
    } else if (total >= 17 && total <= 20) {
        message = `Strong ${total}! Good odds!`;
        emoji = '✨';
    } else if (total >= 12 && total <= 16) {
        message = `${total} - Play it safe!`;
        emoji = '🎲';
    } else {
        message = `${total} - Hit or stand?`;
        emoji = '🃏';
    }

    // Create overlay for the easter egg
    const overlay = document.createElement('div');
    overlay.className = 'easter-egg-overlay';
    overlay.innerHTML = `
        <div class="easter-egg-content">
            <h2>${emoji} Your Hand!</h2>
            <div class="easter-egg-cards">
                <div class="easter-egg-card ${card1.isRed ? 'red' : ''}">${card1.display}</div>
                <div class="easter-egg-card ${card2.isRed ? 'red' : ''}">${card2.display}</div>
            </div>
            <p>${message}</p>
            <button class="easter-egg-close">Continue</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate cards in
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);

    // Close button
    overlay.querySelector('.easter-egg-close').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    });
}

function setupCarousel() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');

    function showSlide(index) {
        // Wrap around
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }

        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        // Add active class to current slide and dot
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    // Navigation buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            showSlide(currentSlide - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            showSlide(currentSlide + 1);
        });
    }

    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const joinScreen = document.getElementById('joinScreen');
        if (joinScreen && joinScreen.style.display !== 'none') {
            if (e.key === 'ArrowLeft') {
                showSlide(currentSlide - 1);
            } else if (e.key === 'ArrowRight') {
                showSlide(currentSlide + 1);
            }
        }
    });
}

function handleJoinSuccess(data) {
    console.log('[App] Join successful:', data);
    console.log('[App] Setting isHost to:', data.player.isHost);
    console.log('[App] Player ID from join-success:', data.player.id);
    console.log('[App] Current socket ID:', gameState.socket.id);

    gameState.playerId = data.player.id; // Ensure we use the server's player ID
    gameState.playerName = data.player.name;
    gameState.playerSeat = data.seat;
    gameState.isHost = data.player.isHost;

    console.log('[App] gameState.isHost is now:', gameState.isHost);
    console.log('[App] gameState.playerId set to:', gameState.playerId);

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
    console.log('[App] gameState.playerId:', gameState.playerId);
    console.log('[App] state.players:', state.players.map(p => ({ id: p.id, name: p.name })));

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

    // Check if current player is still in the game
    const currentPlayer = state.players.find(p => p.id === gameState.playerId);
    console.log('[App] currentPlayer found:', currentPlayer ? currentPlayer.name : 'NOT FOUND');

    if (!currentPlayer && gameState.playerId) {
        // Player was kicked or removed from the game
        console.log('[App] Player was removed from the game');
        showNotification('You have been removed from the game', 'error');

        // Reset game state
        gameState.playerId = null;
        gameState.playerName = null;
        gameState.playerSeat = null;
        gameState.isHost = false;

        // Return to join screen
        document.getElementById('gameUI').style.display = 'none';
        document.getElementById('joinScreen').style.display = 'flex';

        return; // Don't continue with UI updates
    }

    // Update isHost status from server data if player exists
    if (currentPlayer) {
        const wasHost = gameState.isHost;
        gameState.isHost = currentPlayer.isHost;

        // Update host crown in display
        document.getElementById('playerNameDisplay').textContent = currentPlayer.name + (currentPlayer.isHost ? ' 👑' : '');

        // Show/hide host settings button
        const hostSettingsBtn = document.getElementById('hostSettingsBtn');
        if (hostSettingsBtn) {
            hostSettingsBtn.style.display = currentPlayer.isHost ? 'block' : 'none';
        }

        // If host status changed, update controls
        if (wasHost !== currentPlayer.isHost) {
            console.log('[App] Host status changed - was:', wasHost, 'now:', currentPlayer.isHost);
            // Controls will be updated below in updateControlsArea
        }
    }

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
    if (currentPlayer) {
        document.getElementById('playerBankroll').textContent = '$' + currentPlayer.bankroll;

        // Update unified action footer based on phase
        if (state.phase === 'betting') {
            syncBettingUIWithServerState(currentPlayer, state.config);
        } else if (state.phase === 'playing') {
            // Footer will be populated by showPlayerActionControls if it's player's turn
            // Otherwise hide it
            if (state.currentPlayer !== gameState.playerId) {
                renderUnifiedActionFooter(state.phase, currentPlayer, state.config);
            }
        } else if (state.phase === 'insurance') {
            // Hide footer during insurance phase
            renderUnifiedActionFooter('insurance', currentPlayer, state.config);
        } else {
            // Lobby, dealer, results phases
            renderUnifiedActionFooter(state.phase, currentPlayer, state.config);
        }
    }
}

function handlePlayerJoined(data) {
    console.log('[App] Player joined:', data.playerName);
    showNotification(`${data.playerName} joined the game`, 'success');
    // Game state update will handle UI refresh
}

function handlePlayerLeft(data) {
    console.log('[App] Player left:', data.playerId);

    // Check if the player who left is the current user
    if (data.playerId === gameState.playerId) {
        console.log('[App] Current user was kicked from the game');
        showNotification('You have been kicked from the game', 'error');

        // Reset game state
        gameState.playerId = null;
        gameState.playerName = null;
        gameState.playerSeat = null;
        gameState.isHost = false;

        // Return to join screen
        document.getElementById('gameUI').style.display = 'none';
        document.getElementById('joinScreen').style.display = 'flex';
    }

    // Game state update will handle UI refresh for other players
}

function handleHostTransferred(data) {
    console.log('[App] Host transferred to:', data.newHostName);

    // Check if the new host is the current user
    if (data.newHostId === gameState.playerId) {
        showNotification('You are now the host!', 'success');
        gameState.isHost = true;

        // Update host crown in display
        const currentPlayerName = gameState.playerName || '';
        document.getElementById('playerNameDisplay').textContent = currentPlayerName + ' 👑';

        // Show host settings button
        const hostSettingsBtn = document.getElementById('hostSettingsBtn');
        if (hostSettingsBtn) {
            hostSettingsBtn.style.display = 'block';
        }
    } else {
        showNotification(`${data.newHostName} is now the host`, 'info');

        // Remove host status if we had it
        if (gameState.isHost) {
            gameState.isHost = false;

            // Update display (remove crown)
            const currentPlayerName = gameState.playerName || '';
            document.getElementById('playerNameDisplay').textContent = currentPlayerName;

            // Hide host settings button
            const hostSettingsBtn = document.getElementById('hostSettingsBtn');
            if (hostSettingsBtn) {
                hostSettingsBtn.style.display = 'none';
            }
        }
    }

    // Game state update will handle the rest of the UI refresh
}

function handlePlayerAutoFolded(data) {
    console.log('[App] Player auto-folded:', data.playerName, 'reason:', data.reason);

    // Check if it's the current player
    if (data.playerId === gameState.playerId) {
        if (data.reason === 'insufficient_funds') {
            showNotification('You were auto-folded: Insufficient funds for bet', 'warning');
        } else if (data.reason === 'bet_deduction_error') {
            showNotification('You were auto-folded: Error processing bet', 'error');
        }
    } else {
        // Notify about other players being auto-folded
        showNotification(`${data.playerName} was auto-folded`, 'info');
    }
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

function handleBetCancelled(data) {
    console.log('[App] Bet cancelled successfully');
    showNotification('Bet cancelled', 'success');
    // Game state update will handle UI refresh
}

function handleCancelBetFailed(data) {
    console.error('[App] Cancel bet failed:', data.error);
    showNotification('Failed to cancel bet: ' + data.error, 'error');
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
        // Clear both control areas - betting now happens in overlay
        controlsArea.innerHTML = '';
        if (actionControlsArea) actionControlsArea.innerHTML = '';
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

/**
 * Generate betting interface HTML
 * @param {Object} config - Game configuration
 * @param {Number} maxBet - Maximum bet amount
 * @returns {String} HTML string for betting interface
 */
function generateBettingInterfaceHTML(config, maxBet) {
    // Define chip denominations
    const chipValues = [1, 5, 10, 25, 50, 100, 500];
    const availableChips = chipValues.filter(v => v <= maxBet);

    const html = `
        <div class="betting-container">
            <!-- Total Bet Display -->
            <div class="total-bet-display">
                <div class="total-bet-label">Total Bet</div>
                <div class="total-bet-value" id="totalBetValue">$0</div>
            </div>

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

            <div class="betting-footer" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-light); text-align: center;">
                <button class="btn-primary" id="placeBetBtnModal" style="min-width: 200px; padding: 16px 32px; font-size: 1.1rem;">
                    Place Bet
                </button>
            </div>
        </div>
    `;

    return html;
}

/**
 * Open the betting overlay modal
 * @param {Boolean} editMode - If true, load player's current bet from server state
 */
function openBettingOverlay(editMode = false) {
    console.log('[App] Opening betting overlay, editMode:', editMode);

    const modal = document.getElementById('bettingModal');
    const modalBody = document.getElementById('bettingModalBody');

    if (!modal) {
        console.error('[App] Betting modal not found!');
        return;
    }

    if (!modalBody) {
        console.error('[App] Betting modal body not found!');
        return;
    }

    if (!gameState.config) {
        console.error('[App] No game config available');
        return;
    }

    const currentPlayer = gameState.players?.find(p => p.id === gameState.playerId);
    if (!currentPlayer) {
        console.error('[App] Current player not found');
        return;
    }

    const minBet = gameState.config.minBet;
    const maxBet = gameState.config.maxBet || currentPlayer.bankroll;

    console.log('[App] Generating betting interface HTML...');
    // Generate and insert betting interface
    const html = generateBettingInterfaceHTML(gameState.config, maxBet);
    console.log('[App] HTML generated, length:', html?.length);

    modalBody.innerHTML = html;

    console.log('[App] Setting up betting controls...');
    // Set up event listeners
    setupBettingControls(minBet, maxBet, editMode, currentPlayer);

    console.log('[App] Showing modal...');
    // Show modal
    modal.style.display = 'flex';

    console.log('[App] Modal should now be visible');
}

/**
 * Close the betting overlay modal
 * Discards any in-progress bets that haven't been placed
 */
function closeBettingOverlay() {
    console.log('[App] Closing betting overlay');
    const modal = document.getElementById('bettingModal');

    if (modal) {
        modal.style.display = 'none';
    }

    // Clear in-progress bets (discard changes)
    gameState.currentBets = null;
    console.log('[App] Betting overlay closed, in-progress bets cleared');
}

function showBettingInterface(state) {
    // This function is no longer used - betting happens in the overlay
    // Keep it for now in case of fallback, but it does nothing
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

function setupBettingControls(minBet, maxBet, editMode = false, currentPlayer = null) {
    // Track bet amounts
    let bets;

    if (editMode && currentPlayer && currentPlayer.currentBet > 0) {
        // Edit mode: Load player's current bet from server state
        bets = {
            main: currentPlayer.currentBet,
            perfectPairs: currentPlayer.sideBets?.perfectPairs || 0,
            bustIt: currentPlayer.sideBets?.bustIt || 0,
            twentyOnePlus3: currentPlayer.sideBets?.twentyOnePlus3 || 0
        };
    } else {
        // New bet: Start fresh (no saved state in overlay)
        bets = {
            main: 0,
            perfectPairs: 0,
            bustIt: 0,
            twentyOnePlus3: 0
        };
    }

    // Initialize display with bet values
    updateBetDisplay('main', bets.main);
    updateBetDisplay('perfectPairs', bets.perfectPairs);
    updateBetDisplay('bustIt', bets.bustIt);
    updateBetDisplay('twentyOnePlus3', bets.twentyOnePlus3);
    updateTotalBetDisplay();

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

    // Update total bet display
    function updateTotalBetDisplay() {
        const total = bets.main + bets.perfectPairs + bets.bustIt + bets.twentyOnePlus3;
        const totalEl = document.getElementById('totalBetValue');
        if (totalEl) {
            totalEl.textContent = '$' + total;
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
            updateTotalBetDisplay();
            updatePlaceBetModalButton();

            // Visual feedback
            chip.classList.add('chip-clicked');
            setTimeout(() => chip.classList.remove('chip-clicked'), 200);
        });
    });

    // Clear buttons
    document.getElementById('clearMainBet')?.addEventListener('click', () => {
        bets.main = 0;
        updateBetDisplay('main', 0);
        updateTotalBetDisplay();
        updatePlaceBetModalButton();
    });

    document.querySelectorAll('.btn-clear-side').forEach(btn => {
        btn.addEventListener('click', () => {
            const betType = btn.dataset.side;
            bets[betType] = 0;
            updateBetDisplay(betType, 0);
            updateTotalBetDisplay();
        });
    });

    // Modal Place Bet button
    document.getElementById('placeBetBtnModal')?.addEventListener('click', () => {
        if (bets.main < minBet) {
            showNotification(`Minimum bet is $${minBet}`, 'error');
            return;
        }

        // Place the bet
        placeBet(bets);

        // Close the overlay on success (server will send game state update)
        closeBettingOverlay();
    });

    // Enable/disable modal place bet button based on minimum bet
    function updatePlaceBetModalButton() {
        const placeBetBtn = document.getElementById('placeBetBtnModal');
        if (placeBetBtn) {
            if (bets.main >= minBet) {
                placeBetBtn.disabled = false;
            } else {
                placeBetBtn.disabled = true;
            }
        }
    }

    // Initialize modal place bet button state
    updatePlaceBetModalButton();
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
        if (phase === 'playing' || phase === 'dealer' || phase === 'insurance') {
            // All game-in-progress phases should show the table
            document.body.setAttribute('data-mobile-phase', 'playing');
        } else {
            // For betting and other phases, don't set mobile phase
            // Betting now happens in modal overlay, table stays visible
            document.body.removeAttribute('data-mobile-phase');
        }
    }

    if (phase === 'betting' && player) {
        // Betting phase: Show appropriate buttons based on player state
        footer.style.display = 'block';

        const hasBet = player.currentBet > 0;
        const isReady = player.ready;
        const isEliminated = player.eliminated;

        // Determine which buttons to show
        // No bet: Sit Out | Place Bet
        // Bet placed, not ready: Cancel Bet | Edit Bet | Ready
        // Ready: ✓ Ready (disabled)

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
                ` : hasBet && !isReady ? `
                    <button class="btn-footer-action btn-footer-cancel" id="cancelBetBtnFooter">
                        Cancel Bet
                    </button>
                ` : '<div></div>'}

                ${hasBet && !isReady ? `
                    <button class="btn-footer-action btn-footer-edit" id="editBetBtnFooter">
                        Edit Bet
                    </button>
                ` : ''}

                ${!hasBet ? `
                    <button class="btn-footer-action btn-footer-ready" id="placeBetBtnFooter">
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
        const cancelBetBtn = document.getElementById('cancelBetBtnFooter');
        const editBetBtn = document.getElementById('editBetBtnFooter');

        if (sitOutBtn) {
            sitOutBtn.addEventListener('click', handleSitOut);
        }

        if (rejoinBtn) {
            rejoinBtn.addEventListener('click', handleRejoin);
        }

        if (placeBetBtn) {
            placeBetBtn.addEventListener('click', () => {
                // Open betting overlay
                openBettingOverlay(false);
            });
        }

        if (readyBtn) {
            readyBtn.addEventListener('click', handleReadyClick);
        }

        if (cancelBetBtn) {
            cancelBetBtn.addEventListener('click', cancelBet);
        }

        if (editBetBtn) {
            editBetBtn.addEventListener('click', () => {
                // Open betting overlay in edit mode
                openBettingOverlay(true);
            });
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

    // Record stats
    const hasBlackjack = myResults.hands.some(h => h.result === 'blackjack');
    const hasBust = myResults.hands.some(h => h.result === 'bust');
    const hadDouble = myResults.hands.some(h => h.doubled);
    const hadSplit = myResults.hands.length > 1;

    // Calculate side bets wagered and profit
    let sideBetsWagered = 0;
    let sideBetsProfit = 0;

    if (myResults.sideBets.perfectPairs) {
        sideBetsWagered += myResults.sideBets.perfectPairs.bet;
        sideBetsProfit += (myResults.sideBets.perfectPairs.payout - myResults.sideBets.perfectPairs.bet);
    }
    if (myResults.sideBets.bustIt) {
        sideBetsWagered += myResults.sideBets.bustIt.bet;
        sideBetsProfit += (myResults.sideBets.bustIt.payout - myResults.sideBets.bustIt.bet);
    }
    if (myResults.sideBets.twentyOnePlus3) {
        sideBetsWagered += myResults.sideBets.twentyOnePlus3.bet;
        sideBetsProfit += (myResults.sideBets.twentyOnePlus3.payout - myResults.sideBets.twentyOnePlus3.bet);
    }

    // Determine outcome for stats
    let outcome;
    if (hasBlackjack && isWin) {
        outcome = 'blackjack';
    } else if (hasBust) {
        outcome = 'bust';
    } else if (isPush) {
        outcome = 'push';
    } else if (isWin) {
        outcome = 'win';
    } else {
        outcome = 'loss';
    }

    // Record round in stats
    gameStats.recordRound({
        outcome: outcome,
        betAmount: totalBet,
        profit: netProfit,
        doubled: hadDouble,
        split: hadSplit,
        sideBetsWagered: sideBetsWagered,
        sideBetsProfit: sideBetsProfit,
        insurance: myResults.insurance || false,
        insuranceWon: myResults.insuranceWon || false
    });

    console.log('[App] Stats recorded for round:', outcome, 'Profit:', netProfit);

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

// ==================== RULES MODAL ====================

function setupRulesModal() {
    const rulesBtn = document.getElementById('rulesBtn');
    const closeBtn = document.getElementById('closeRulesBtn');
    const closeBtn2 = document.getElementById('closeRulesBtn2');

    // Open modal
    if (rulesBtn) {
        rulesBtn.addEventListener('click', openRulesModal);
    }

    // Close buttons
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRulesModal);
    }
    if (closeBtn2) {
        closeBtn2.addEventListener('click', closeRulesModal);
    }

    // Tab switching
    const tabs = document.querySelectorAll('.rules-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchRulesTab(tabName);
        });
    });

    // Close on backdrop click
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'rulesModal') {
                closeRulesModal();
            }
        });
    }
}

function openRulesModal() {
    console.log('[App] Opening rules modal');
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeRulesModal() {
    console.log('[App] Closing rules modal');
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function switchRulesTab(tabName) {
    console.log('[App] Switching to tab:', tabName);

    // Remove active class from all tabs and content
    document.querySelectorAll('.rules-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.rules-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`.rules-tab[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}-tab`);

    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
}

// ==================== STATS MODAL ====================

function setupStatsModal() {
    const statsBtn = document.getElementById('statsBtn');
    const closeBtn = document.getElementById('closeStatsBtn');
    const closeBtn2 = document.getElementById('closeStatsBtn2');
    const resetBtn = document.getElementById('resetStatsBtn');

    // Open modal
    if (statsBtn) {
        statsBtn.addEventListener('click', openStatsModal);
    }

    // Close buttons
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStatsModal);
    }
    if (closeBtn2) {
        closeBtn2.addEventListener('click', closeStatsModal);
    }

    // Reset stats
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
                gameStats.reset();
                renderStatsContent();
                showNotification('Stats reset successfully', 'success');
            }
        });
    }

    // Close on backdrop click
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'statsModal') {
                closeStatsModal();
            }
        });
    }
}

function openStatsModal() {
    console.log('[App] Opening stats modal');

    // Auto sit-out if in betting phase and not already sitting out
    if (gameState.phase === 'betting') {
        const currentPlayer = gameState.players?.find(p => p.id === gameState.playerId);
        if (currentPlayer && !currentPlayer.sittingOut && !currentPlayer.ready) {
            console.log('[App] Auto sitting out to view stats');
            gameState.socket.emit('sit-out', {});
            showNotification('Sitting out this round to view stats', 'info');
        }
    }

    // Render stats content
    renderStatsContent();

    // Show modal
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeStatsModal() {
    console.log('[App] Closing stats modal');
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderStatsContent() {
    const modalBody = document.getElementById('statsModalBody');
    if (!modalBody) return;

    const stats = gameStats.getStats();

    // Check if there are any stats
    if (stats.totalRounds === 0) {
        modalBody.innerHTML = `
            <div class="no-stats-message">
                <h3>No Statistics Yet</h3>
                <p>Play some rounds to start tracking your performance!</p>
            </div>
        `;
        return;
    }

    const netProfitClass = stats.netProfit > 0 ? 'positive' : stats.netProfit < 0 ? 'negative' : 'neutral';
    const streakText = stats.streakType === 'win' ? `${stats.currentStreak} Win Streak 🔥` :
                       stats.streakType === 'loss' ? `${stats.currentStreak} Loss Streak` :
                       'No Streak';

    modalBody.innerHTML = `
        <div class="stats-grid">
            <!-- Overall Performance -->
            <div class="stat-category">
                <h3>📈 Overall Performance</h3>
                <div class="stat-item">
                    <span class="stat-label">Total Rounds</span>
                    <span class="stat-value">${stats.totalRounds}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Wins</span>
                    <span class="stat-value positive">${stats.wins}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Losses</span>
                    <span class="stat-value negative">${stats.losses}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pushes</span>
                    <span class="stat-value neutral">${stats.pushes}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Win Rate</span>
                    <span class="stat-value">${stats.winRate}%</span>
                </div>
            </div>

            <!-- Special Outcomes -->
            <div class="stat-category">
                <h3>⭐ Special Outcomes</h3>
                <div class="stat-item">
                    <span class="stat-label">Blackjacks</span>
                    <span class="stat-value">${stats.blackjacks}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Busts</span>
                    <span class="stat-value">${stats.busts}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Doubles</span>
                    <span class="stat-value">${stats.doubles}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Splits</span>
                    <span class="stat-value">${stats.splits}</span>
                </div>
            </div>

            <!-- Money Stats -->
            <div class="stat-category">
                <h3>💰 Money</h3>
                <div class="stat-item">
                    <span class="stat-label">Total Wagered</span>
                    <span class="stat-value">$${stats.totalWagered}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Won</span>
                    <span class="stat-value positive">$${stats.totalWon}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Lost</span>
                    <span class="stat-value negative">$${stats.totalLost}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Net Profit</span>
                    <span class="stat-value ${netProfitClass}">$${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Average Bet</span>
                    <span class="stat-value">$${stats.avgBet}</span>
                </div>
            </div>

            <!-- Streaks & Records -->
            <div class="stat-category">
                <h3>🏆 Records</h3>
                <div class="stat-item">
                    <span class="stat-label">Current Streak</span>
                    <span class="stat-value">${streakText}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Best Win Streak</span>
                    <span class="stat-value positive">${stats.bestWinStreak}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Worst Loss Streak</span>
                    <span class="stat-value negative">${stats.bestLossStreak}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Biggest Win</span>
                    <span class="stat-value positive">$${stats.biggestWin}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Biggest Loss</span>
                    <span class="stat-value negative">$${stats.biggestLoss}</span>
                </div>
            </div>

            <!-- Side Bets & Insurance -->
            <div class="stat-category">
                <h3>🎲 Side Bets & Insurance</h3>
                <div class="stat-item">
                    <span class="stat-label">Side Bets Played</span>
                    <span class="stat-value">${stats.sideBetsPlayed}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Side Bets Won</span>
                    <span class="stat-value">${stats.sideBetsWon}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Side Bet Win Rate</span>
                    <span class="stat-value">${stats.sideBetWinRate}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Insurance Taken</span>
                    <span class="stat-value">${stats.insuranceTaken}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Insurance Win Rate</span>
                    <span class="stat-value">${stats.insuranceWinRate}%</span>
                </div>
            </div>
        </div>

        ${stats.recentRounds.length > 0 ? `
            <div class="recent-rounds">
                <h3>📜 Recent Rounds</h3>
                <div class="round-history">
                    ${stats.recentRounds.map(round => {
                        const outcomeClass = round.outcome === 'win' || round.outcome === 'blackjack' ? 'win' :
                                           round.outcome === 'push' ? 'push' : 'loss';
                        const profitClass = round.profit > 0 ? 'positive' : round.profit < 0 ? 'negative' : 'neutral';
                        const profitSign = round.profit > 0 ? '+' : '';

                        return `
                            <div class="round-item ${outcomeClass}">
                                <div class="round-info">
                                    <span class="round-number">Round ${round.round}</span>
                                    <span class="round-outcome">${round.outcome}</span>
                                </div>
                                <span class="round-profit ${profitClass}">$${profitSign}${round.profit}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// ==================== STARTUP ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM loaded, initializing...');

    // Initialize stats system
    gameStats.init();
    console.log('[App] Stats system initialized');

    // Initialize floating cards animation
    initFloatingCards();

    // Initialize socket connection
    initSocket();

    // Setup join form
    setupJoinForm();

    // Setup carousel
    setupCarousel();

    // Setup easter egg
    setupEasterEgg();

    // Setup settings modal
    setupSettingsModal();

    // Setup results modal
    document.getElementById('closeResultsBtn')?.addEventListener('click', closeResultsModal);

    // Setup betting modal
    document.getElementById('closeBettingBtn')?.addEventListener('click', closeBettingOverlay);

    // Close modals on ESC key (desktop)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const bettingModal = document.getElementById('bettingModal');
            const rulesModal = document.getElementById('rulesModal');
            const statsModal = document.getElementById('statsModal');

            if (bettingModal && bettingModal.style.display === 'flex') {
                closeBettingOverlay();
            } else if (rulesModal && rulesModal.style.display === 'flex') {
                closeRulesModal();
            } else if (statsModal && statsModal.style.display === 'flex') {
                closeStatsModal();
            }
        }
    });

    // Close betting modal on backdrop click (desktop)
    document.getElementById('bettingModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'bettingModal') {
            closeBettingOverlay();
        }
    });

    // Setup rules modal
    setupRulesModal();

    // Setup stats modal
    setupStatsModal();

    console.log('[App] Initialization complete');
});
