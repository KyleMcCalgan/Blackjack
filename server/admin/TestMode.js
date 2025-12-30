// TestMode - pre-dealt card testing functionality

class TestMode {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.enabled = false;
    this.preDealtCards = [];
    this.cardIndex = 0;
    this.originalDeckDraw = null;
    this.autoplay = true; // Auto-advance through game phases
  }

  // ==================== MODE CONTROL ====================

  /**
   * Enable test mode with pre-dealt cards
   * @returns {Object} {success, message}
   */
  enable() {
    if (this.enabled) {
      return { success: false, message: 'Test mode already enabled' };
    }

    // Can only enable before round starts
    if (this.gameRoom.phase !== 'lobby' && this.gameRoom.phase !== 'betting') {
      return {
        success: false,
        message: 'Test mode can only be enabled in lobby or before dealing'
      };
    }

    this.enabled = true;
    this.cardIndex = 0;

    // Override deck draw method
    this.patchDeckDraw();

    console.log('[TestMode] Enabled - Use /deal to set cards');

    return {
      success: true,
      message: 'Test mode enabled. Use /deal to specify cards.'
    };
  }

  /**
   * Disable test mode and restore normal deck behavior
   * @returns {Object} {success, message}
   */
  disable() {
    if (!this.enabled) {
      return { success: false, message: 'Test mode not enabled' };
    }

    this.enabled = false;
    this.preDealtCards = [];
    this.cardIndex = 0;

    // Restore original deck draw
    this.restoreDeckDraw();

    console.log('[TestMode] Disabled');

    return {
      success: true,
      message: 'Test mode disabled'
    };
  }

  /**
   * Check if test mode is enabled
   * @returns {Boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Enable or disable autoplay
   * @param {Boolean} enabled - True to enable autoplay, false to disable
   * @returns {Object} {success, message}
   */
  setAutoplay(enabled) {
    this.autoplay = enabled;
    console.log(`[TestMode] Autoplay ${enabled ? 'enabled' : 'disabled'}`);

    return {
      success: true,
      message: `Autoplay ${enabled ? 'enabled' : 'disabled'}. ${enabled ? 'Game will auto-advance.' : 'Use /next to advance phases.'}`
    };
  }

  /**
   * Check if autoplay is enabled
   * @returns {Boolean}
   */
  isAutoplayEnabled() {
    return this.autoplay;
  }

  // ==================== CARD CONFIGURATION ====================

  /**
   * Set pre-dealt cards from a string
   * Example: "AS KH QD 7C 8S" or ["AS", "KH", "QD", "7C", "8S"]
   * @param {String|Array} cardsInput - Cards to pre-deal
   * @returns {Object} {success, cards, message, error}
   */
  setCards(cardsInput) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Test mode not enabled. Use /test-mode on first.'
      };
    }

    try {
      // Parse input
      const cardStrings = Array.isArray(cardsInput)
        ? cardsInput
        : cardsInput.split(/\s+/).filter(s => s.length > 0);

      if (cardStrings.length === 0) {
        return {
          success: false,
          error: 'No cards specified'
        };
      }

      // Convert to card objects
      const cards = [];
      for (const cardStr of cardStrings) {
        const card = this.parseCard(cardStr);
        if (!card) {
          return {
            success: false,
            error: `Invalid card: ${cardStr}. Use format like AS, KH, 10D, 7C`
          };
        }
        cards.push(card);
      }

      // Validate card count doesn't exceed deck
      const maxCards = this.gameRoom.deck.totalCards;
      if (cards.length > maxCards) {
        return {
          success: false,
          error: `Too many cards. Maximum is ${maxCards} (${this.gameRoom.config.deckCount} decks)`
        };
      }

      // Set the cards
      this.preDealtCards = cards;
      this.cardIndex = 0;

      console.log(`[TestMode] Set ${cards.length} pre-dealt cards`);

      return {
        success: true,
        cards: cards.map(c => this.formatCard(c)),
        message: `Set ${cards.length} pre-dealt cards: ${cards.map(c => this.formatCard(c)).join(', ')}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all pre-dealt cards
   */
  clearCards() {
    this.preDealtCards = [];
    this.cardIndex = 0;
    console.log('[TestMode] Cleared pre-dealt cards');
    return { success: true, message: 'Pre-dealt cards cleared' };
  }

  /**
   * Reset card index for new round (keeps the cards, just resets index to 0)
   * This allows the same card sequence to be used across multiple rounds
   */
  resetForNewRound() {
    if (this.enabled && this.preDealtCards.length > 0) {
      this.cardIndex = 0;
      console.log(`[TestMode] Reset card index for new round - ${this.preDealtCards.length} cards will be re-dealt`);
    }
  }

  /**
   * Get current test mode status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      enabled: this.enabled,
      autoplay: this.autoplay,
      cardsSet: this.preDealtCards.length,
      cardsDealt: this.cardIndex,
      cardsRemaining: this.preDealtCards.length - this.cardIndex,
      nextCards: this.preDealtCards.slice(this.cardIndex, this.cardIndex + 5).map(c => this.formatCard(c))
    };
  }

  // ==================== CARD PARSING ====================

  /**
   * Parse a card string into a card object
   * Example: "AS" -> {rank: 'A', suit: 'spades', value: [1, 11]}
   * @param {String} cardStr - Card string (e.g., "AS", "10H", "KD")
   * @returns {Object|null} Card object or null if invalid
   */
  parseCard(cardStr) {
    if (!cardStr || typeof cardStr !== 'string') return null;

    const str = cardStr.toUpperCase().trim();

    // Extract rank and suit
    let rank, suitChar;

    if (str.length === 2) {
      // Single digit rank (A, 2-9, J, Q, K)
      rank = str[0];
      suitChar = str[1];
    } else if (str.length === 3 && str.startsWith('10')) {
      // 10 requires 3 characters
      rank = '10';
      suitChar = str[2];
    } else {
      return null;
    }

    // Validate rank
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    if (!validRanks.includes(rank)) {
      return null;
    }

    // Parse suit
    const suitMap = {
      'H': 'hearts',
      'D': 'diamonds',
      'C': 'clubs',
      'S': 'spades'
    };

    const suit = suitMap[suitChar];
    if (!suit) {
      return null;
    }

    // Get card value
    const value = this.getCardValue(rank);

    return { rank, suit, value };
  }

  /**
   * Get card value for a rank
   * @param {String} rank - Card rank
   * @returns {Number|Array} Value or array for aces
   */
  getCardValue(rank) {
    if (rank === 'A') {
      return [1, 11];
    } else if (['J', 'Q', 'K'].includes(rank)) {
      return 10;
    } else {
      return parseInt(rank);
    }
  }

  /**
   * Format a card object as a string
   * @param {Object} card - Card object
   * @returns {String} Formatted card (e.g., "A♠")
   */
  formatCard(card) {
    const suitSymbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };

    return `${card.rank}${suitSymbols[card.suit] || card.suit[0].toUpperCase()}`;
  }

  // ==================== DECK PATCHING ====================

  /**
   * Patch the deck's draw method to use pre-dealt cards
   */
  patchDeckDraw() {
    const deck = this.gameRoom.deck;

    // Save original method
    if (!this.originalDeckDraw) {
      this.originalDeckDraw = deck.draw.bind(deck);
    }

    // Override with test mode draw
    const testMode = this;
    deck.draw = function() {
      return testMode.drawTestCard() || testMode.originalDeckDraw();
    };
  }

  /**
   * Restore the original deck draw method
   */
  restoreDeckDraw() {
    if (this.originalDeckDraw) {
      this.gameRoom.deck.draw = this.originalDeckDraw;
      this.originalDeckDraw = null;
    }
  }

  /**
   * Draw a card from pre-dealt cards
   * @returns {Object|null} Card object or null if no more pre-dealt cards
   */
  drawTestCard() {
    if (!this.enabled) return null;
    if (this.cardIndex >= this.preDealtCards.length) {
      console.log('[TestMode] No more pre-dealt cards, using normal deck');
      return null;
    }

    const card = this.preDealtCards[this.cardIndex];
    this.cardIndex++;

    console.log(`[TestMode] Drew pre-dealt card: ${this.formatCard(card)} (${this.cardIndex}/${this.preDealtCards.length})`);

    return card;
  }

  // ==================== PRESET SCENARIOS ====================

  /**
   * Set up a preset scenario for testing
   * @param {String} scenario - Scenario name
   * @returns {Object} {success, message}
   */
  setScenario(scenario) {
    // Card dealing order for 1 player:
    // Card 1: Player first card
    // Card 2: Dealer upcard (face up)
    // Card 3: Player second card
    // Card 4: Dealer hole card (face down)
    // Card 5+: Hit cards, etc.
    const scenarios = {
      'blackjack': {
        description: 'Player gets blackjack (A♠ K♥), dealer gets 19 (10♦ 9♥)',
        cards: ['AS', '10D', 'KH', '9H']
      },
      'dealer-blackjack': {
        description: 'Dealer gets blackjack (A♥ K♠), player gets 15 (7♥ 8♦) - Insurance test',
        cards: ['7H', 'AH', '8D', 'KS']
      },
      'bust': {
        description: 'Player busts (10♥ 7♦ + 8♠ = 25), dealer has A♥ 6♦',
        cards: ['10H', 'AH', '7D', '6D', '8S']
      },
      'colored-pair': {
        description: 'Player gets colored pair (6♥ 6♦ both red) - 12:1 payout',
        cards: ['6H', '7D', '6D', '10S']
      },
      'perfect-pair': {
        description: 'Player gets perfect pair (K♥ K♥ same suit) - 25:1 payout',
        cards: ['KH', '7D', 'KH', '10S']
      },
      // Bust It scenarios
      'bust-it-3cards': {
        description: 'Dealer busts with 3 cards (5♦ 10♦ 10♠ = 25) - Bust It 2:1',
        cards: ['10H', '5D', '9H', '10D', '10S']
      },
      'bust-it-4cards': {
        description: 'Dealer busts with 4 cards (5♦ 5♥ 5♠ 7♠ = 22) - Bust It 4:1',
        cards: ['10H', '5D', '9H', '5H', '5S', '7S']
      },
      'bust-it-5cards': {
        description: 'Dealer busts with 5 cards (2♦ 3♥ 4♠ 5♠ 8♠ = 22) - Bust It 15:1',
        cards: ['10H', '2D', '9H', '3H', '4S', '5S', '8S']
      },
      'bust-it-6cards': {
        description: 'Dealer busts with 6 cards (2♦ 2♥ 3♠ 4♠ 5♠ 10♠ = 26) - Bust It 50:1',
        cards: ['10H', '2D', '9H', '2H', '3S', '4S', '5S', '10S']
      },
      'bust-it-7cards': {
        description: 'Dealer busts with 7 cards (2♦ 2♥ 2♠ 2♣ 3♠ 4♠ 10♠ = 25) - Bust It 100:1',
        cards: ['10H', '2D', '9H', '2H', '2S', '2C', '3S', '4S', '10S']
      },
      'bust-it-8cards': {
        description: 'Dealer busts with 8 cards (A♦ A♥ 2♠ 2♦ 3♠ 4♠ A♠ 10♠ = 24) - Bust It 250:1',
        cards: ['10H', 'AD', '9H', 'AH', '2S', '2D', '3S', '4S', 'AS', '10S']
      },
      // 21+3 scenarios
      '21plus3-flush': {
        description: 'Player 5♥ 7♥ + Dealer 9♥ = Flush (all hearts) - 21+3 5:1',
        cards: ['5H', '9H', '7H', '10D']
      },
      '21plus3-straight': {
        description: 'Player 5♥ 7♠ + Dealer 6♦ = Straight (5-6-7) - 21+3 10:1',
        cards: ['5H', '6D', '7S', '10H']
      },
      '21plus3-three-kind': {
        description: 'Player 8♥ 8♠ + Dealer 8♦ = Three of a Kind - 21+3 30:1',
        cards: ['8H', '8D', '8S', '10H']
      },
      '21plus3-straight-flush': {
        description: 'Player 5♥ 7♥ + Dealer 6♥ = Straight Flush (5-6-7 hearts) - 21+3 40:1',
        cards: ['5H', '6H', '7H', '10D']
      },
      '21plus3-suited-three': {
        description: 'Player K♥ K♥ + Dealer K♥ = Suited Three of a Kind - 21+3 100:1',
        cards: ['KH', 'KH', 'KH', '10D']
      },
      'split-aces': {
        description: 'Player gets pair of aces (A♠ A♥)',
        cards: ['AS', '7D', 'AH', '10H', 'KH', 'QD']
      },
      'split-tens': {
        description: 'Player gets pair of tens (10♥ 10♦)',
        cards: ['10H', '7S', '10D', 'KH', 'QD', '9H']
      }
    };

    const preset = scenarios[scenario];
    if (!preset) {
      return {
        success: false,
        error: `Unknown scenario. Available: ${Object.keys(scenarios).join(', ')}`
      };
    }

    const result = this.setCards(preset.cards);
    if (result.success) {
      result.message = `Scenario '${scenario}': ${preset.description}\n${result.message}`;
    }

    return result;
  }

  /**
   * Get list of available scenarios
   * @returns {Array} Array of scenario names and descriptions
   */
  getScenarios() {
    return [
      // Basic scenarios
      { name: 'blackjack', description: 'Player gets blackjack (A♠ K♥)' },
      { name: 'dealer-blackjack', description: 'Dealer gets blackjack - Insurance test' },
      { name: 'bust', description: 'Player busts' },
      // Perfect Pairs
      { name: 'colored-pair', description: 'Colored Pair (12:1)' },
      { name: 'perfect-pair', description: 'Perfect Pair (25:1)' },
      // Bust It
      { name: 'bust-it-3cards', description: 'Bust It - 3 Cards (2:1)' },
      { name: 'bust-it-4cards', description: 'Bust It - 4 Cards (4:1)' },
      { name: 'bust-it-5cards', description: 'Bust It - 5 Cards (15:1)' },
      { name: 'bust-it-6cards', description: 'Bust It - 6 Cards (50:1)' },
      { name: 'bust-it-7cards', description: 'Bust It - 7 Cards (100:1)' },
      { name: 'bust-it-8cards', description: 'Bust It - 8+ Cards (250:1)' },
      // 21+3
      { name: '21plus3-flush', description: '21+3 - Flush (5:1)' },
      { name: '21plus3-straight', description: '21+3 - Straight (10:1)' },
      { name: '21plus3-three-kind', description: '21+3 - Three of a Kind (30:1)' },
      { name: '21plus3-straight-flush', description: '21+3 - Straight Flush (40:1)' },
      { name: '21plus3-suited-three', description: '21+3 - Suited Three of a Kind (100:1)' },
      // Splits
      { name: 'split-aces', description: 'Player gets pair of aces' },
      { name: 'split-tens', description: 'Player gets pair of tens' }
    ];
  }
}

module.exports = TestMode;
