// GameRoom - manages game state, lobby, and game flow

const Player = require('./Player');
const Dealer = require('./Dealer');
const Deck = require('./Deck');
const GameRules = require('./GameRules');
const SideBets = require('./SideBets');

const MAX_SEATS = 5;
const BETTING_TIME_LIMIT = 30; // seconds
const ACTION_TIME_LIMIT = 30; // seconds
const INSURANCE_TIME_LIMIT = 10; // seconds

class GameRoom {
  constructor(io, config) {
    this.io = io;
    this.config = {
      startingBankroll: config.startingBankroll || 1000,
      minBet: config.minBet || 10,
      maxBet: config.maxBet || 500,
      deckCount: config.deckCount || 6,
      blackjackPayout: config.blackjackPayout || '3:2',
      insurancePayout: config.insurancePayout || '2:1',
      splitAcesBlackjack: config.splitAcesBlackjack !== undefined ? config.splitAcesBlackjack : true,
      roundDelay: config.roundDelay || 5 // seconds between rounds
    };

    // Game state
    this.phase = 'lobby'; // 'lobby' | 'betting' | 'insurance' | 'dealing' | 'playing' | 'dealer' | 'results'
    this.roundNumber = 0;

    // Test mode reference (set later)
    this.testMode = null;

    // Player management
    this.players = new Map(); // socketId -> Player instance
    this.seats = new Array(MAX_SEATS + 1).fill(null); // [null, player1, player2, null, null, player5]
    this.hostId = null;

    // Game objects
    this.dealer = new Dealer();
    this.deck = new Deck(this.config.deckCount);

    // Turn tracking
    this.currentPlayerIndex = 0; // Index in seat order
    this.currentHandIndex = 0; // For handling splits

    // Timers
    this.bettingTimer = null;
    this.actionTimer = null;
    this.insuranceTimer = null;
    this.roundDelayTimer = null;

    // Insurance tracking
    this.insuranceBets = new Map(); // socketId -> amount

    // Pre-action tracking
    this.preActions = new Map(); // socketId -> {handIndex, action}

    // Session ID
    this.sessionId = this.generateSessionId();
  }

  // ==================== PLAYER MANAGEMENT ====================

  /**
   * Add a player to the game
   * @param {String} socketId - Socket ID
   * @param {String} name - Player name
   * @returns {Object} {success, seat, error}
   */
  addPlayer(socketId, name) {
    // Check if game already started
    if (this.phase !== 'lobby') {
      return { success: false, error: 'Game already in progress' };
    }

    // Check if player already exists
    if (this.players.has(socketId)) {
      return { success: false, error: 'Already in game' };
    }

    // Find lowest available seat
    const seat = this.findAvailableSeat();
    if (!seat) {
      return { success: false, error: 'Game is full' };
    }

    // Create player
    const player = new Player(socketId, name, seat, this.config.startingBankroll);

    // First player becomes host
    if (this.players.size === 0) {
      player.isHost = true;
      this.hostId = socketId;
    }

    // Add to game
    this.players.set(socketId, player);
    this.seats[seat] = socketId;

    console.log(`[GameRoom] Player ${name} joined in seat ${seat}`);

    // Broadcast to all players
    this.broadcastGameState();

    return { success: true, seat, player: player.toJSON() };
  }

  /**
   * Remove a player from the game
   * @param {String} socketId - Socket ID
   */
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    console.log(`[GameRoom] Player ${player.name} left from seat ${player.seat}`);

    // Clear seat
    this.seats[player.seat] = null;

    // Remove player
    this.players.delete(socketId);

    // Handle host transfer if host left
    if (socketId === this.hostId) {
      this.transferHostToNext();
    }

    // Handle mid-game disconnection
    if (this.phase === 'playing' && this.isCurrentPlayer(socketId)) {
      // Auto-stand on all active hands
      this.autoStandPlayer(player);
      this.nextTurn();
    }

    // Broadcast updated state
    this.broadcastGameState();

    // End game if no players left
    if (this.players.size === 0) {
      this.endGame();
    }
  }

  /**
   * Find the lowest available seat number
   * @returns {Number|null} Seat number or null if full
   */
  findAvailableSeat() {
    for (let i = 1; i <= MAX_SEATS; i++) {
      if (this.seats[i] === null) {
        return i;
      }
    }
    return null;
  }

  /**
   * Transfer host privileges to a specific player
   * @param {String} newHostId - Socket ID of new host
   * @returns {Boolean} Success
   */
  transferHost(newHostId) {
    const newHost = this.players.get(newHostId);
    if (!newHost) return false;

    // Remove host from current
    if (this.hostId) {
      const oldHost = this.players.get(this.hostId);
      if (oldHost) oldHost.isHost = false;
    }

    // Set new host
    newHost.isHost = true;
    this.hostId = newHostId;

    console.log(`[GameRoom] Host transferred to ${newHost.name}`);

    // Broadcast
    this.io.emit('host-transferred', {
      newHostId: newHostId,
      newHostName: newHost.name
    });

    this.broadcastGameState();
    return true;
  }

  /**
   * Transfer host to next available player
   */
  transferHostToNext() {
    if (this.players.size === 0) {
      this.hostId = null;
      return;
    }

    // Get first player
    const nextPlayer = this.players.values().next().value;
    this.transferHost(nextPlayer.id);
  }

  /**
   * Update player profile (name and color)
   * @param {String} socketId - Socket ID
   * @param {String} playerName - New player name
   * @param {String} playerColor - Player color (hex)
   * @returns {Object} {success, error}
   */
  updateProfile(socketId, playerName, playerColor) {
    const player = this.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Only allow updates in lobby phase
    if (this.phase !== 'lobby') {
      // Allow name/color changes during betting phase too
      if (this.phase !== 'betting') {
        return { success: false, error: 'Cannot update profile during active gameplay' };
      }
    }

    // Update name if provided
    if (playerName && playerName.trim()) {
      let newName = playerName.trim();
      if (newName.length > 20) {
        newName = newName.substring(0, 20);
      }

      // Check for duplicate names and append suffix if needed
      let finalName = newName;
      let suffix = 2;
      while (this.isNameTaken(finalName, socketId)) {
        finalName = `${newName} (${suffix})`;
        suffix++;
      }

      player.name = finalName;
    }

    // Update color if provided
    if (playerColor) {
      player.color = playerColor;
    }

    console.log(`[GameRoom] Profile updated for ${player.name}: ${player.color}`);

    // Broadcast updated state
    this.broadcastGameState();

    return { success: true };
  }

  /**
   * Check if a name is already taken by another player
   * @param {String} name - Name to check
   * @param {String} excludeId - Socket ID to exclude from check
   * @returns {Boolean}
   */
  isNameTaken(name, excludeId) {
    for (const [id, player] of this.players) {
      if (id !== excludeId && player.name === name) {
        return true;
      }
    }
    return false;
  }

  // ==================== GAME FLOW ====================

  /**
   * Start the game from lobby
   */
  startGame() {
    if (this.phase !== 'lobby') {
      console.log('[GameRoom] Cannot start game - not in lobby');
      return;
    }

    if (this.players.size === 0) {
      console.log('[GameRoom] Cannot start game - no players');
      return;
    }

    console.log('[GameRoom] Starting game');
    this.phase = 'betting';
    this.roundNumber = 0;

    this.broadcastGameState();
    this.startBettingPhase();
  }

  /**
   * End the current game session
   */
  endGame() {
    console.log('[GameRoom] Ending game session');
    this.clearAllTimers();
    this.phase = 'lobby';
    this.roundNumber = 0;
    this.broadcastGameState();
  }

  /**
   * Start a new round
   */
  startNewRound() {
    console.log(`[GameRoom] Starting round ${this.roundNumber + 1}`);
    this.roundNumber++;

    // Reset dealer
    this.dealer.clearHand();

    // Reset players for new round
    for (const player of this.players.values()) {
      player.newRound();
    }

    // Clear insurance and pre-actions
    this.insuranceBets.clear();
    this.preActions.clear();

    this.startBettingPhase();
  }

  // ==================== BETTING PHASE ====================

  /**
   * Start the betting phase
   */
  startBettingPhase() {
    this.phase = 'betting';
    console.log('[GameRoom] Betting phase started');

    // Emit betting phase event
    this.io.emit('betting-phase', {
      timeLimit: BETTING_TIME_LIMIT,
      minBet: this.config.minBet,
      maxBet: this.config.maxBet
    });

    this.broadcastGameState();

    // Start betting timer (only if autoplay is enabled)
    if (this.isAutoplayEnabled()) {
      this.bettingTimer = setTimeout(() => {
        this.endBettingPhase();
      }, BETTING_TIME_LIMIT * 1000);
    } else {
      console.log('[GameRoom] Autoplay disabled - use /next to advance');
    }
  }

  /**
   * Handle player placing a bet
   * @param {String} socketId - Socket ID
   * @param {Number} mainBet - Main bet amount
   * @param {Object} sideBets - Side bets {perfectPairs, bustIt, twentyOnePlus3}
   */
  placeBet(socketId, mainBet, sideBets = {}) {
    const player = this.players.get(socketId);
    if (!player || this.phase !== 'betting') return;

    try {
      // Place main bet
      player.placeBet(mainBet, this.config);

      // Place side bets
      if (sideBets.perfectPairs) {
        player.placeSideBet('perfectPairs', sideBets.perfectPairs, this.config);
      }
      if (sideBets.bustIt) {
        player.placeSideBet('bustIt', sideBets.bustIt, this.config);
      }
      if (sideBets.twentyOnePlus3) {
        player.placeSideBet('twentyOnePlus3', sideBets.twentyOnePlus3, this.config);
      }

      console.log(`[GameRoom] ${player.name} bet $${mainBet}`);

      // DO NOT auto-mark as ready - player must check the ready checkbox
      // player.setReady(true); // REMOVED

      this.broadcastGameState();

      // DO NOT check if all ready here - only when ready checkbox is checked
      // Players must explicitly click ready after betting

      return { success: true };

    } catch (error) {
      console.log(`[GameRoom] Bet error for ${player.name}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle player ready status
   * @param {String} socketId - Socket ID
   * @param {Boolean} ready - Ready status
   */
  setPlayerReady(socketId, ready) {
    const player = this.players.get(socketId);
    if (!player || this.phase !== 'betting') {
      return { success: false, error: 'Cannot set ready status at this time' };
    }

    // Must have placed a bet to be ready
    if (ready && player.currentBet === 0) {
      return { success: false, error: 'Must place a bet first' };
    }

    // Once ready, cannot unready (ready is final)
    if (!ready && player.ready) {
      return { success: false, error: 'Ready status cannot be changed once set' };
    }

    player.setReady(ready);
    console.log(`[GameRoom] ${player.name} ready: ${ready}`);

    this.broadcastGameState();

    // Check if all players have decided (bet+ready or sat out)
    if (this.allPlayersReady()) {
      console.log('[GameRoom] All players have decided - ending betting phase');
      this.endBettingPhase();
    }

    return { success: true };
  }

  /**
   * Check if all players have made a decision (bet placed AND ready, or eliminated)
   * @returns {Boolean}
   */
  allPlayersReady() {
    for (const player of this.players.values()) {
      // Player must be either:
      // 1. Eliminated/sitting out
      // 2. Has placed a bet AND clicked ready
      if (!player.eliminated && !player.ready) {
        return false;
      }
    }
    return true;
  }

  /**
   * Cancel a player's bet
   * @param {String} socketId - Socket ID
   * @returns {Object} {success, message}
   */
  cancelBet(socketId) {
    const player = this.players.get(socketId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.phase !== 'betting') {
      return { success: false, error: 'Can only cancel bet during betting phase' };
    }

    if (player.currentBet === 0) {
      return { success: false, error: 'No bet to cancel' };
    }

    console.log(`[GameRoom] ${player.name} cancelled their bet`);

    // NOTE: Bets are not deducted from bankroll until endBettingPhase(),
    // so we should NOT add money back here. Just clear the bet.
    // player.bankroll += player.getTotalBets(); // REMOVED - this was giving free money!

    // Clear bets and ready status
    player.clearBets();
    player.setReady(false);

    this.broadcastGameState();

    return { success: true };
  }

  /**
   * Player sits out for this round
   * @param {String} socketId - Socket ID
   * @returns {Object} {success, message}
   */
  sitOutPlayer(socketId) {
    const player = this.players.get(socketId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.phase !== 'betting') {
      return { success: false, error: 'Can only sit out during betting phase' };
    }

    console.log(`[GameRoom] ${player.name} is sitting out this round`);

    // Mark player as eliminated and ready (sitting out IS a decision)
    player.eliminated = true;
    player.ready = true; // Sitting out means you've decided
    player.clearBets();
    player.clearHands();

    this.broadcastGameState();

    // Check if all players have made their decision
    if (this.allPlayersReady()) {
      console.log('[GameRoom] All players have decided - ending betting phase');
      this.endBettingPhase();
    }

    return { success: true };
  }

  /**
   * Cancel sit out decision
   * @param {String} socketId - Socket ID
   * @returns {Object} {success, message}
   */
  cancelSitOut(socketId) {
    const player = this.players.get(socketId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.phase !== 'betting') {
      return { success: false, error: 'Can only cancel sit out during betting phase' };
    }

    console.log(`[GameRoom] ${player.name} cancelled sit out`);

    // Re-enable player for this round
    player.eliminated = false;
    player.ready = false; // No longer decided

    this.broadcastGameState();

    return { success: true };
  }

  /**
   * End betting phase and start dealing
   */
  endBettingPhase() {
    if (this.phase !== 'betting') return;

    this.clearTimer(this.bettingTimer);

    console.log('[GameRoom] Betting phase ended');

    // Auto-fold players who didn't bet (even if they didn't ready up)
    // If a player placed a bet, they play regardless of ready status
    for (const player of this.players.values()) {
      if (player.currentBet === 0) {
        console.log(`[GameRoom] ${player.name} auto-folded (no bet)`);
        player.eliminated = true;
        player.clearHands(); // Ensure hands are cleared for eliminated players
      }
    }

    // Deduct bets from all players
    for (const player of this.players.values()) {
      if (!player.eliminated) {
        try {
          const totalBets = player.getTotalBets();

          // Validate player can afford their bet before deducting
          if (totalBets > player.bankroll) {
            console.log(`[GameRoom] WARNING: ${player.name} cannot afford bet ($${totalBets} > $${player.bankroll}). Auto-folding player.`);
            player.eliminated = true;
            player.clearBets();
            player.clearHands();

            // Notify clients about this player being auto-folded
            this.io.emit('player-auto-folded', {
              playerId: player.id,
              playerName: player.name,
              reason: 'insufficient_funds'
            });
            continue;
          }

          player.deductAllBets();
          player.initializeHand();
        } catch (error) {
          // Catch any unexpected errors during bet deduction
          console.log(`[GameRoom] ERROR: Failed to deduct bets for ${player.name}: ${error.message}`);
          console.log(`[GameRoom] Player state - Bankroll: $${player.bankroll}, Bet: $${player.currentBet}, Side bets: ${JSON.stringify(player.sideBets)}`);

          // Auto-fold player to prevent game from being stuck
          player.eliminated = true;
          player.clearBets();
          player.clearHands();

          this.io.emit('player-auto-folded', {
            playerId: player.id,
            playerName: player.name,
            reason: 'bet_deduction_error'
          });
        }
      }
    }

    this.startDealingPhase();
  }

  // ==================== DEALING PHASE ====================

  /**
   * Deal initial cards to all players and dealer
   */
  startDealingPhase() {
    this.phase = 'dealing';
    console.log('[GameRoom] Dealing phase started');

    // Deal in order: each player gets 1 card, dealer gets 1 card face up
    // Then: each player gets 2nd card, dealer gets 2nd card face down

    const activePlayers = this.getActivePlayers();

    // First card to each player
    for (const player of activePlayers) {
      const card = this.deck.draw();
      player.addCard(card, 0);
      this.io.emit('card-dealt', {
        playerId: player.id,
        card,
        handIndex: 0
      });
    }

    // First card to dealer (face up)
    const dealerCard1 = this.deck.draw();
    this.dealer.addCard(dealerCard1, true);
    this.io.emit('dealer-card', {
      card: dealerCard1,
      faceUp: true
    });

    // Second card to each player
    for (const player of activePlayers) {
      const card = this.deck.draw();
      player.addCard(card, 0);
      this.io.emit('card-dealt', {
        playerId: player.id,
        card,
        handIndex: 0
      });
    }

    // Second card to dealer (face down)
    const dealerCard2 = this.deck.draw();
    this.dealer.addCard(dealerCard2, false);
    this.io.emit('dealer-card', {
      card: { rank: '?', suit: '?', value: 0 },
      faceUp: false
    });

    this.broadcastGameState();

    // Check for dealer blackjack or insurance
    if (this.dealer.showsAce()) {
      this.startInsurancePhase();
    } else if (this.dealer.checkBlackjack()) {
      // Dealer has blackjack, go straight to results
      this.dealer.isComplete = true;
      this.startResultsPhase();
    } else {
      // Check for player blackjacks
      this.checkPlayerBlackjacks();
      this.startPlayingPhase();
    }
  }

  /**
   * Check for player blackjacks and pay immediately
   */
  checkPlayerBlackjacks() {
    for (const player of this.players.values()) {
      if (player.eliminated || player.hands.length === 0) continue;

      const hand = player.hands[0];
      if (hand.status === 'blackjack') {
        console.log(`[GameRoom] ${player.name} has blackjack!`);
        player.recordBlackjack();
        // Payout happens in results phase
      }
    }
  }

  // ==================== INSURANCE PHASE ====================

  /**
   * Offer insurance when dealer shows Ace
   */
  startInsurancePhase() {
    this.phase = 'insurance';
    console.log('[GameRoom] Insurance phase started');

    this.io.emit('insurance-offered', {
      timeLimit: INSURANCE_TIME_LIMIT
    });

    this.broadcastGameState();

    // Start insurance timer (only if autoplay is enabled)
    if (this.isAutoplayEnabled()) {
      this.insuranceTimer = setTimeout(() => {
        this.endInsurancePhase();
      }, INSURANCE_TIME_LIMIT * 1000);
    } else {
      console.log('[GameRoom] Autoplay disabled - use /next to advance');
    }
  }

  /**
   * Handle player insurance bet
   * @param {String} socketId - Socket ID
   * @param {Boolean} takesInsurance - Whether player takes insurance
   */
  placeInsurance(socketId, takesInsurance) {
    if (this.phase !== 'insurance') return { success: false };

    const player = this.players.get(socketId);
    if (!player || player.eliminated) return { success: false };

    if (takesInsurance) {
      const insuranceAmount = player.currentBet / 2;

      if (!player.canAffordBet(insuranceAmount)) {
        return { success: false, error: 'Insufficient funds for insurance' };
      }

      this.insuranceBets.set(socketId, insuranceAmount);
      player.deductBet(insuranceAmount);

      console.log(`[GameRoom] ${player.name} took insurance ($${insuranceAmount})`);
    }

    return { success: true };
  }

  /**
   * End insurance phase and check for dealer blackjack
   */
  endInsurancePhase() {
    if (this.phase !== 'insurance') return;

    this.clearTimer(this.insuranceTimer);
    console.log('[GameRoom] Insurance phase ended');

    const dealerHasBlackjack = this.dealer.checkBlackjack();

    // Pay insurance bets
    if (dealerHasBlackjack) {
      console.log('[GameRoom] Dealer has blackjack - paying insurance');

      for (const [socketId, insuranceAmount] of this.insuranceBets.entries()) {
        const player = this.players.get(socketId);
        if (player) {
          const payout = insuranceAmount * (GameRules.parsePayoutRatio(this.config.insurancePayout) + 1);
          player.addWinnings(payout);
          player.recordInsurance(true);
          console.log(`[GameRoom] ${player.name} won $${payout} from insurance`);
        }
      }

      // Dealer has blackjack - go to results
      this.dealer.isComplete = true;
      this.startResultsPhase();
    } else {
      // Dealer doesn't have blackjack - continue with player turns
      console.log('[GameRoom] Dealer does not have blackjack');

      // Record insurance losses
      for (const [socketId] of this.insuranceBets.entries()) {
        const player = this.players.get(socketId);
        if (player) {
          player.recordInsurance(false);
        }
      }

      this.checkPlayerBlackjacks();
      this.startPlayingPhase();
    }

    this.broadcastGameState();
  }

  // ==================== PLAYING PHASE ====================

  /**
   * Start player turns
   */
  startPlayingPhase() {
    this.phase = 'playing';
    this.currentPlayerIndex = 0;
    this.currentHandIndex = 0;

    console.log('[GameRoom] Playing phase started');

    // Check if any active players have hands
    const activePlayers = this.getActivePlayers();

    // Filter to only players with active hands
    const playersWithActiveHands = activePlayers.filter(p =>
      p.hands && p.hands.length > 0 && !p.allHandsComplete()
    );

    console.log(`[GameRoom] ${activePlayers.length} active players, ${playersWithActiveHands.length} with active hands`);

    if (playersWithActiveHands.length === 0) {
      console.log('[GameRoom] No players with active hands, skipping to dealer turn');
      this.startDealerTurn();
      return;
    }

    this.broadcastGameState();
    this.startNextTurn();
  }

  /**
   * Start the next player's turn
   */
  startNextTurn() {
    const currentPlayer = this.getCurrentPlayer();

    if (!currentPlayer) {
      // All players done - dealer's turn
      this.startDealerTurn();
      return;
    }

    // Skip eliminated players or players with no active hands
    if (currentPlayer.eliminated || currentPlayer.allHandsComplete()) {
      this.nextTurn();
      return;
    }

    console.log(`[GameRoom] ${currentPlayer.name}'s turn (hand ${this.currentHandIndex + 1})`);

    // Emit turn event
    this.io.emit('player-turn', {
      playerId: currentPlayer.id,
      handIndex: this.currentHandIndex,
      timeLimit: ACTION_TIME_LIMIT,
      availableActions: currentPlayer.getAvailableActions(this.currentHandIndex)
    });

    this.broadcastGameState();

    // Check for pre-selected action
    const preAction = this.preActions.get(currentPlayer.id);
    if (preAction && preAction.handIndex === this.currentHandIndex) {
      // Execute pre-action after a brief delay
      setTimeout(() => {
        this.handlePlayerAction(currentPlayer.id, preAction.action, this.currentHandIndex);
      }, 500);
      return;
    }

    // Start action timer (only if autoplay is enabled)
    if (this.isAutoplayEnabled()) {
      this.actionTimer = setTimeout(() => {
        this.autoStandCurrentHand();
      }, ACTION_TIME_LIMIT * 1000);
    } else {
      console.log('[GameRoom] Autoplay disabled - use /next to advance');
    }
  }

  /**
   * Handle player action (hit, stand, double, split)
   * @param {String} socketId - Socket ID
   * @param {String} action - Action type
   * @param {Number} handIndex - Hand index
   */
  handlePlayerAction(socketId, action, handIndex) {
    const player = this.players.get(socketId);
    if (!player || this.phase !== 'playing') return { success: false };

    // Verify it's this player's turn
    if (!this.isCurrentPlayer(socketId) || this.currentHandIndex !== handIndex) {
      return { success: false, error: 'Not your turn' };
    }

    this.clearTimer(this.actionTimer);

    try {
      console.log(`[GameRoom] ${player.name} ${action}s (hand ${handIndex})`);

      switch (action) {
        case 'hit':
          player.hit(handIndex);
          const card = this.deck.draw();
          player.addCard(card, handIndex);

          this.io.emit('card-dealt', {
            playerId: socketId,
            card,
            handIndex
          });

          // Check if hand is complete after hit
          if (player.hands[handIndex].status !== 'active') {
            this.nextTurn();
          } else {
            // Continue same turn (can hit again)
            this.startNextTurn();
          }
          break;

        case 'stand':
          player.stand(handIndex);
          this.nextTurn();
          break;

        case 'double':
          player.double(handIndex);
          const doubleCard = this.deck.draw();
          player.addCard(doubleCard, handIndex);

          this.io.emit('card-dealt', {
            playerId: socketId,
            card: doubleCard,
            handIndex
          });

          // Automatically stand after double (only if still active)
          // Note: addCard() may have already changed status to 'bust' or 'stand'
          if (player.hands[handIndex].status === 'active') {
            player.stand(handIndex);
          }
          this.nextTurn();
          break;

        case 'split':
          player.split(handIndex);

          // Deal one card to each new hand
          const card1 = this.deck.draw();
          const card2 = this.deck.draw();

          player.addCard(card1, handIndex);
          player.addCard(card2, handIndex + 1);

          this.io.emit('card-dealt', {
            playerId: socketId,
            card: card1,
            handIndex
          });

          this.io.emit('card-dealt', {
            playerId: socketId,
            card: card2,
            handIndex: handIndex + 1
          });

          // Continue with first split hand
          this.startNextTurn();
          break;

        default:
          return { success: false, error: 'Invalid action' };
      }

      this.broadcastGameState();
      return { success: true };

    } catch (error) {
      console.log(`[GameRoom] Action error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store a pre-selected action
   * @param {String} socketId - Socket ID
   * @param {String} action - Action type
   * @param {Number} handIndex - Hand index
   */
  setPreAction(socketId, action, handIndex) {
    this.preActions.set(socketId, { action, handIndex });
    return { success: true };
  }

  /**
   * Auto-stand current player's current hand (on timeout)
   */
  autoStandCurrentHand() {
    const player = this.getCurrentPlayer();
    if (!player) return;

    console.log(`[GameRoom] Auto-stand ${player.name} (timeout)`);

    try {
      player.stand(this.currentHandIndex);
    } catch (error) {
      // Hand may already be complete
    }

    this.nextTurn();
  }

  /**
   * Auto-stand all active hands for a player (on disconnect)
   * @param {Player} player - Player instance
   */
  autoStandPlayer(player) {
    for (let i = 0; i < player.hands.length; i++) {
      if (player.hands[i].status === 'active') {
        try {
          player.stand(i);
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Move to next turn (next hand or next player)
   */
  nextTurn() {
    const player = this.getCurrentPlayer();
    if (!player) {
      this.startDealerTurn();
      return;
    }

    // Move to next hand for this player
    this.currentHandIndex++;

    // If player has more hands, continue with next hand
    if (this.currentHandIndex < player.hands.length) {
      this.startNextTurn();
      return;
    }

    // Player finished all hands - move to next player
    this.currentPlayerIndex++;
    this.currentHandIndex = 0;
    this.startNextTurn();
  }

  /**
   * Get current player
   * @returns {Player|null}
   */
  getCurrentPlayer() {
    const activePlayers = this.getActivePlayers();
    if (this.currentPlayerIndex >= activePlayers.length) {
      return null;
    }
    return activePlayers[this.currentPlayerIndex];
  }

  /**
   * Check if a socket ID is the current player
   * @param {String} socketId - Socket ID
   * @returns {Boolean}
   */
  isCurrentPlayer(socketId) {
    const current = this.getCurrentPlayer();
    return current && current.id === socketId;
  }

  // ==================== DEALER TURN ====================

  /**
   * Execute dealer's turn
   */
  async startDealerTurn() {
    this.phase = 'dealer';
    console.log('[GameRoom] Dealer turn started');

    // Reveal hole card
    this.io.emit('dealer-reveal', {
      holeCard: this.dealer.holeCard
    });

    this.broadcastGameState();

    // Delay for reveal animation
    await this.delay(2000);

    // Dealer hits until 17 or bust
    while (this.dealer.shouldHit()) {
      const card = this.deck.draw();
      this.dealer.addCard(card);

      this.io.emit('dealer-card', {
        card,
        faceUp: true
      });

      this.io.emit('dealer-card-count', {
        count: this.dealer.getCardCount()
      });

      this.broadcastGameState();

      // Delay between cards
      await this.delay(1000);
    }

    console.log(`[GameRoom] Dealer finished with ${this.dealer.getHandValue().value}`);

    this.startResultsPhase();
  }

  // ==================== RESULTS PHASE ====================

  /**
   * Calculate results and pay winnings
   */
  startResultsPhase() {
    this.phase = 'results';
    console.log('[GameRoom] Results phase started');

    const dealerValue = this.dealer.getHandValue().value;
    const dealerBlackjack = this.dealer.hasBlackjack;

    const results = [];

    // Calculate results for each player
    for (const player of this.players.values()) {
      if (player.eliminated || player.hands.length === 0) continue;

      const playerResults = {
        playerId: player.id,
        name: player.name,
        hands: [],
        sideBets: {},
        totalWinnings: 0,
        newBankroll: 0
      };

      // Evaluate each hand
      for (let i = 0; i < player.hands.length; i++) {
        const hand = player.hands[i];
        const handValue = player.getHandValue(i).value;
        const isBlackjack = hand.status === 'blackjack';

        let result = 'loss';
        let payout = 0;

        if (isBlackjack && !dealerBlackjack) {
          result = 'blackjack';
          payout = GameRules.calculatePayout(hand.bet, 'blackjack', this.config.blackjackPayout);
        } else {
          result = GameRules.compareHands(handValue, dealerValue, isBlackjack, dealerBlackjack);
          payout = GameRules.calculatePayout(hand.bet, result, this.config.blackjackPayout);
        }

        playerResults.hands.push({
          handIndex: i,
          cards: hand.cards,
          value: handValue,
          bet: hand.bet,
          result,
          payout
        });

        playerResults.totalWinnings += payout;

        // Record result
        player.recordHandResult(result, payout);
      }

      // Evaluate side bets
      if (player.sideBets.perfectPairs > 0) {
        const perfectPairsPayout = SideBets.evaluatePerfectPairs(player.hands[0].cards, player.sideBets.perfectPairs);
        playerResults.sideBets.perfectPairs = {
          bet: player.sideBets.perfectPairs,
          payout: perfectPairsPayout,
          won: perfectPairsPayout > 0
        };
        playerResults.totalWinnings += perfectPairsPayout;
      }

      if (player.sideBets.bustIt > 0) {
        const bustItPayout = SideBets.evaluateBustIt(this.dealer.hand, player.sideBets.bustIt);
        playerResults.sideBets.bustIt = {
          bet: player.sideBets.bustIt,
          payout: bustItPayout,
          won: bustItPayout > 0
        };
        playerResults.totalWinnings += bustItPayout;
      }

      if (player.sideBets.twentyOnePlus3 > 0) {
        const twentyOnePlus3Payout = SideBets.evaluate21Plus3(
          player.hands[0].cards,
          this.dealer.upCard,
          player.sideBets.twentyOnePlus3
        );
        playerResults.sideBets.twentyOnePlus3 = {
          bet: player.sideBets.twentyOnePlus3,
          payout: twentyOnePlus3Payout,
          won: twentyOnePlus3Payout > 0
        };
        playerResults.totalWinnings += twentyOnePlus3Payout;
      }

      // Add winnings to bankroll
      if (playerResults.totalWinnings > 0) {
        player.addWinnings(playerResults.totalWinnings);
      }

      playerResults.newBankroll = player.bankroll;

      results.push(playerResults);
    }

    // Emit results
    this.io.emit('round-results', {
      dealerHand: this.dealer.hand,
      dealerValue,
      dealerBlackjack,
      dealerBust: this.dealer.isBust,
      results
    });

    this.broadcastGameState();

    // Start next round after delay (only if autoplay is enabled)
    if (this.isAutoplayEnabled()) {
      this.roundDelayTimer = setTimeout(() => {
        this.startNewRound();
      }, this.config.roundDelay * 1000);
    } else {
      console.log('[GameRoom] Autoplay disabled - use /next to advance');
    }
  }

  // ==================== UTILITY ====================

  /**
   * Get all active (non-eliminated) players in seat order
   * @returns {Array<Player>}
   */
  getActivePlayers() {
    const active = [];
    for (let i = 1; i <= MAX_SEATS; i++) {
      const socketId = this.seats[i];
      if (socketId) {
        const player = this.players.get(socketId);
        if (player && !player.eliminated) {
          active.push(player);
        }
      }
    }
    return active;
  }

  /**
   * Broadcast full game state to all clients
   */
  broadcastGameState() {
    const state = {
      phase: this.phase,
      roundNumber: this.roundNumber,
      config: this.config,
      players: Array.from(this.players.values()).map(p => p.toJSON()),
      seats: this.seats,
      dealer: this.dealer.toJSON(this.phase !== 'dealer' && this.phase !== 'results'),
      currentPlayer: this.getCurrentPlayer()?.id || null,
      currentHandIndex: this.currentHandIndex,
      deckPenetration: this.deck.getPenetration()
    };

    this.io.emit('game-state', state);
  }

  /**
   * Check if autoplay is enabled (for testing)
   * @returns {Boolean}
   */
  isAutoplayEnabled() {
    return !this.testMode || this.testMode.isAutoplayEnabled();
  }

  /**
   * Manually advance to the next phase (for testing with autoplay disabled)
   * @returns {Object} {success, message, nextPhase}
   */
  advancePhase() {
    console.log(`[GameRoom] Manual phase advance from '${this.phase}'`);

    switch (this.phase) {
      case 'betting':
        this.endBettingPhase();
        return { success: true, message: 'Advanced from betting to dealing', nextPhase: 'dealing' };

      case 'insurance':
        this.endInsurancePhase();
        return { success: true, message: 'Advanced from insurance', nextPhase: this.phase };

      case 'playing':
        // Auto-stand current player and move to next
        this.autoStandCurrentHand();
        return { success: true, message: 'Advanced to next player turn', nextPhase: this.phase };

      case 'results':
        this.startNewRound();
        return { success: true, message: 'Started new round', nextPhase: 'betting' };

      case 'lobby':
        return { success: false, message: 'Cannot advance from lobby. Use start-game event or have host start the game.' };

      case 'dealing':
        return { success: false, message: 'Dealing phase is instant, already advanced' };

      case 'dealer':
        return { success: false, message: 'Dealer phase is automatic, already in progress' };

      default:
        return { success: false, message: `Cannot advance from unknown phase: ${this.phase}` };
    }
  }

  /**
   * Clear a specific timer
   * @param {Timeout} timer - Timer to clear
   */
  clearTimer(timer) {
    if (timer) {
      clearTimeout(timer);
    }
  }

  /**
   * Clear all active timers
   */
  clearAllTimers() {
    this.clearTimer(this.bettingTimer);
    this.clearTimer(this.actionTimer);
    this.clearTimer(this.insuranceTimer);
    this.clearTimer(this.roundDelayTimer);
  }

  /**
   * Delay helper for async operations
   * @param {Number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique session ID
   * @returns {String}
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update game configuration (only allowed in lobby with no players or before game starts)
   * @param {Object} newConfig - New configuration object
   * @returns {Object} {success, message}
   */
  updateConfig(newConfig) {
    // Only allow config changes in lobby
    if (this.phase !== 'lobby') {
      return {
        success: false,
        message: 'Cannot change configuration during active game'
      };
    }

    // Update config
    this.config = {
      startingBankroll: newConfig.startingBankroll || this.config.startingBankroll,
      minBet: newConfig.minBet || this.config.minBet,
      maxBet: newConfig.maxBet !== undefined ? newConfig.maxBet : this.config.maxBet,
      deckCount: newConfig.deckCount || this.config.deckCount,
      blackjackPayout: newConfig.blackjackPayout || this.config.blackjackPayout,
      insurancePayout: newConfig.insurancePayout || this.config.insurancePayout,
      splitAcesBlackjack: newConfig.splitAcesBlackjack !== undefined ? newConfig.splitAcesBlackjack : this.config.splitAcesBlackjack,
      roundDelay: newConfig.roundDelay !== undefined ? newConfig.roundDelay : this.config.roundDelay
    };

    // Recreate deck with new deck count if changed
    if (newConfig.deckCount && newConfig.deckCount !== this.deck.deckCount) {
      this.deck = new Deck(this.config.deckCount);
    }

    console.log('[GameRoom] Configuration updated');

    return {
      success: true,
      message: 'Configuration updated successfully'
    };
  }
}

module.exports = GameRoom;
