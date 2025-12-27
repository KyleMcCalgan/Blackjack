// Player - player state management and actions

const GameRules = require('./GameRules');

class Player {
  constructor(socketId, name, seat, bankroll = 1000) {
    // Identity
    this.id = socketId;
    this.name = name;
    this.seat = seat;

    // Status
    this.isHost = false;
    this.connected = true;
    this.eliminated = false;
    this.ready = false;

    // Bankroll
    this.bankroll = bankroll;

    // Betting
    this.currentBet = 0;
    this.sideBets = {
      perfectPairs: 0,
      bustIt: 0,
      twentyOnePlus3: 0
    };

    // Hands - array to support splits
    // Each hand: {cards: [], bet: 0, status: 'active'|'stand'|'bust'|'blackjack', isDoubled: false, fromSplit: false, hasActed: false}
    this.hands = [];

    // Statistics tracking
    this.statistics = {
      handsPlayed: 0,
      handsWon: 0,
      handsLost: 0,
      handsPushed: 0,
      blackjacks: 0,
      totalWagered: 0,
      netProfit: 0,
      biggestWin: 0,
      biggestLoss: 0,
      splits: 0,
      doubles: 0,
      busts: 0,
      insuranceWins: 0,
      insuranceLosses: 0
    };
  }

  // ==================== BETTING METHODS ====================

  /**
   * Place main bet for the round
   * @param {Number} amount - Bet amount
   * @param {Object} config - Game configuration {minBet, maxBet}
   * @throws {Error} If bet is invalid
   */
  placeBet(amount, config) {
    const validation = GameRules.validateBet(
      amount,
      config.minBet,
      config.maxBet,
      this.bankroll
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.currentBet = amount;
    return true;
  }

  /**
   * Place a side bet
   * @param {String} betType - 'perfectPairs' | 'bustIt' | 'twentyOnePlus3'
   * @param {Number} amount - Bet amount
   * @param {Object} config - Game configuration {minBet, maxBet}
   * @throws {Error} If bet is invalid
   */
  placeSideBet(betType, amount, config) {
    if (!['perfectPairs', 'bustIt', 'twentyOnePlus3'].includes(betType)) {
      throw new Error(`Invalid side bet type: ${betType}`);
    }

    const validation = GameRules.validateBet(
      amount,
      config.minBet,
      config.maxBet,
      this.bankroll
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.sideBets[betType] = amount;
    return true;
  }

  /**
   * Get total amount of all bets placed
   * @returns {Number} Total bet amount
   */
  getTotalBets() {
    const sideBetTotal = Object.values(this.sideBets).reduce((sum, bet) => sum + bet, 0);
    return this.currentBet + sideBetTotal;
  }

  /**
   * Clear all bets (main + side bets)
   */
  clearBets() {
    this.currentBet = 0;
    this.sideBets = {
      perfectPairs: 0,
      bustIt: 0,
      twentyOnePlus3: 0
    };
  }

  /**
   * Check if player can afford a bet
   * @param {Number} amount - Amount to check
   * @returns {Boolean}
   */
  canAffordBet(amount) {
    return this.bankroll >= amount;
  }

  /**
   * Set ready status for betting phase
   * @param {Boolean} ready - Ready status
   */
  setReady(ready) {
    this.ready = ready;
  }

  // ==================== HAND MANAGEMENT ====================

  /**
   * Initialize a new hand for the round
   */
  initializeHand() {
    this.hands = [{
      cards: [],
      bet: this.currentBet,
      status: 'active',
      isDoubled: false,
      fromSplit: false,
      hasActed: false
    }];
  }

  /**
   * Add a card to a specific hand
   * @param {Object} card - Card object {rank, suit, value}
   * @param {Number} handIndex - Index of hand to add card to (default 0)
   */
  addCard(card, handIndex = 0) {
    if (handIndex >= this.hands.length) {
      throw new Error(`Invalid hand index: ${handIndex}`);
    }

    this.hands[handIndex].cards.push(card);

    // Update hand status based on new value
    this.updateHandStatus(handIndex);
  }

  /**
   * Update hand status based on current cards
   * @param {Number} handIndex - Index of hand to update
   */
  updateHandStatus(handIndex) {
    const hand = this.hands[handIndex];
    const { value } = this.getHandValue(handIndex);

    // Check for blackjack (only on initial 2 cards)
    if (hand.cards.length === 2 && !hand.hasActed) {
      if (GameRules.isBlackjack(hand.cards, hand.fromSplit)) {
        hand.status = 'blackjack';
        return;
      }
    }

    // Check for bust
    if (GameRules.isBust(value)) {
      hand.status = 'bust';
      this.recordBust();
      return;
    }

    // Auto-stand on 21
    if (value === 21 && hand.status === 'active') {
      hand.status = 'stand';
    }
  }

  /**
   * Get hand value for a specific hand
   * @param {Number} handIndex - Index of hand
   * @returns {Object} {value, isSoft}
   */
  getHandValue(handIndex = 0) {
    if (handIndex >= this.hands.length) {
      return { value: 0, isSoft: false };
    }

    return GameRules.calculateHandValue(this.hands[handIndex].cards);
  }

  /**
   * Get all hand values
   * @returns {Array} Array of {value, isSoft} objects
   */
  getAllHandValues() {
    return this.hands.map((_, index) => this.getHandValue(index));
  }

  /**
   * Clear all hands
   */
  clearHands() {
    this.hands = [];
  }

  /**
   * Check if all hands are complete (no active hands remaining)
   * @returns {Boolean}
   */
  allHandsComplete() {
    return this.hands.every(hand => hand.status !== 'active');
  }

  // ==================== PLAYER ACTIONS ====================

  /**
   * Hit - request another card
   * @param {Number} handIndex - Index of hand to hit
   * @throws {Error} If hit is not allowed
   * @returns {Boolean}
   */
  hit(handIndex = 0) {
    const hand = this.hands[handIndex];
    const { value } = this.getHandValue(handIndex);

    if (!GameRules.canHit(value, hand.status)) {
      throw new Error('Cannot hit on this hand');
    }

    hand.hasActed = true;
    return true;
  }

  /**
   * Stand - end turn for this hand
   * @param {Number} handIndex - Index of hand to stand
   * @throws {Error} If stand is not allowed
   * @returns {Boolean}
   */
  stand(handIndex = 0) {
    const hand = this.hands[handIndex];

    if (hand.status !== 'active') {
      throw new Error('Cannot stand on this hand');
    }

    hand.status = 'stand';
    hand.hasActed = true;
    return true;
  }

  /**
   * Double down - double bet, get one card, auto-stand
   * @param {Number} handIndex - Index of hand to double
   * @throws {Error} If double is not allowed
   * @returns {Number} Additional bet amount needed
   */
  double(handIndex = 0) {
    const hand = this.hands[handIndex];

    if (!GameRules.canDouble(hand.cards, hand.hasActed)) {
      throw new Error('Cannot double on this hand');
    }

    if (!this.canAffordBet(hand.bet)) {
      throw new Error('Insufficient funds to double');
    }

    // Double the bet
    this.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;
    hand.hasActed = true;

    this.recordDouble();
    return hand.bet / 2; // Return additional amount bet
  }

  /**
   * Split - split a pair into two hands
   * @param {Number} handIndex - Index of hand to split
   * @throws {Error} If split is not allowed
   * @returns {Boolean}
   */
  split(handIndex = 0) {
    const hand = this.hands[handIndex];

    if (!GameRules.canSplit(hand.cards)) {
      throw new Error('Cannot split this hand');
    }

    if (!this.canAffordBet(hand.bet)) {
      throw new Error('Insufficient funds to split');
    }

    // Deduct bet for second hand
    this.bankroll -= hand.bet;

    // Create second hand with one of the cards
    const secondCard = hand.cards.pop();
    const newHand = {
      cards: [secondCard],
      bet: hand.bet,
      status: 'active',
      isDoubled: false,
      fromSplit: true,
      hasActed: false
    };

    // Mark first hand as from split
    hand.fromSplit = true;

    // Insert new hand right after current hand
    this.hands.splice(handIndex + 1, 0, newHand);

    this.recordSplit();
    return true;
  }

  /**
   * Check if a specific action is valid for a hand
   * @param {String} action - 'hit' | 'stand' | 'double' | 'split'
   * @param {Number} handIndex - Index of hand
   * @returns {Boolean}
   */
  canPerformAction(action, handIndex = 0) {
    if (handIndex >= this.hands.length) {
      return false;
    }

    const hand = this.hands[handIndex];
    const { value } = this.getHandValue(handIndex);

    switch (action) {
      case 'hit':
        return GameRules.canHit(value, hand.status);

      case 'stand':
        return hand.status === 'active';

      case 'double':
        return GameRules.canDouble(hand.cards, hand.hasActed) && this.canAffordBet(hand.bet);

      case 'split':
        return GameRules.canSplit(hand.cards) && this.canAffordBet(hand.bet);

      default:
        return false;
    }
  }

  // ==================== BANKROLL MANAGEMENT ====================

  /**
   * Add winnings to bankroll
   * @param {Number} amount - Amount to add
   * @returns {Number} New bankroll
   */
  addWinnings(amount) {
    this.bankroll += amount;

    // Track statistics
    const profit = amount - this.currentBet;
    this.statistics.netProfit += profit;

    if (profit > this.statistics.biggestWin) {
      this.statistics.biggestWin = profit;
    }

    return this.bankroll;
  }

  /**
   * Deduct bet from bankroll
   * @param {Number} amount - Amount to deduct
   * @throws {Error} If insufficient funds
   */
  deductBet(amount) {
    if (amount > this.bankroll) {
      throw new Error('Insufficient funds');
    }

    this.bankroll -= amount;
    this.statistics.totalWagered += amount;
  }

  /**
   * Deduct all current bets from bankroll (called at start of round)
   */
  deductAllBets() {
    const totalBets = this.getTotalBets();
    this.deductBet(totalBets);
  }

  /**
   * Check if player is bankrupt
   * @returns {Boolean}
   */
  isBankrupt() {
    return this.bankroll <= 0;
  }

  /**
   * Check if player has enough funds
   * @param {Number} amount - Amount to check
   * @returns {Boolean}
   */
  hasEnoughFor(amount) {
    return this.bankroll >= amount;
  }

  // ==================== STATISTICS ====================

  /**
   * Record result of a hand
   * @param {String} result - 'win' | 'loss' | 'push' | 'blackjack'
   * @param {Number} winnings - Amount won (0 if loss)
   */
  recordHandResult(result, winnings = 0) {
    this.statistics.handsPlayed++;

    switch (result) {
      case 'win':
      case 'blackjack':
        this.statistics.handsWon++;
        break;

      case 'loss':
        this.statistics.handsLost++;
        const loss = this.currentBet;
        if (loss > this.statistics.biggestLoss) {
          this.statistics.biggestLoss = loss;
        }
        break;

      case 'push':
        this.statistics.handsPushed++;
        break;
    }
  }

  /**
   * Record a blackjack
   */
  recordBlackjack() {
    this.statistics.blackjacks++;
  }

  /**
   * Record a split
   */
  recordSplit() {
    this.statistics.splits++;
  }

  /**
   * Record a double down
   */
  recordDouble() {
    this.statistics.doubles++;
  }

  /**
   * Record a bust
   */
  recordBust() {
    this.statistics.busts++;
  }

  /**
   * Record insurance result
   * @param {Boolean} won - Whether insurance bet won
   */
  recordInsurance(won) {
    if (won) {
      this.statistics.insuranceWins++;
    } else {
      this.statistics.insuranceLosses++;
    }
  }

  /**
   * Get player statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return { ...this.statistics };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Reset player for new game session
   * @param {Number} bankroll - Starting bankroll
   */
  reset(bankroll = 1000) {
    this.bankroll = bankroll;
    this.eliminated = false;
    this.ready = false;
    this.clearBets();
    this.clearHands();

    // Keep statistics (they persist across resets)
  }

  /**
   * Prepare for new round (between hands)
   */
  newRound() {
    this.ready = false;
    this.clearBets();
    this.clearHands();

    // Check if bankrupt
    if (this.isBankrupt()) {
      this.eliminated = true;
    } else {
      // Re-enable players who have money
      this.eliminated = false;
    }
  }

  /**
   * Serialize player data for client
   * @param {Boolean} includeStats - Whether to include statistics
   * @returns {Object} Player data object
   */
  toJSON(includeStats = false) {
    const data = {
      id: this.id,
      name: this.name,
      seat: this.seat,
      isHost: this.isHost,
      connected: this.connected,
      eliminated: this.eliminated,
      ready: this.ready,
      bankroll: this.bankroll,
      currentBet: this.currentBet,
      sideBets: { ...this.sideBets },
      hands: this.hands.map(hand => ({
        cards: hand.cards,
        bet: hand.bet,
        status: hand.status,
        isDoubled: hand.isDoubled,
        fromSplit: hand.fromSplit,
        value: GameRules.calculateHandValue(hand.cards)
      }))
    };

    if (includeStats) {
      data.statistics = this.getStatistics();
    }

    return data;
  }

  /**
   * Get available actions for a specific hand
   * @param {Number} handIndex - Index of hand
   * @returns {Array} Array of available action strings
   */
  getAvailableActions(handIndex = 0) {
    const actions = [];

    if (this.canPerformAction('hit', handIndex)) actions.push('hit');
    if (this.canPerformAction('stand', handIndex)) actions.push('stand');
    if (this.canPerformAction('double', handIndex)) actions.push('double');
    if (this.canPerformAction('split', handIndex)) actions.push('split');

    return actions;
  }
}

module.exports = Player;
