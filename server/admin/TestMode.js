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
    const scenarios = {
      'blackjack': {
        description: 'Player gets blackjack, dealer gets 20',
        cards: ['AS', 'KH', '10D', 'KD', '10H', '9H']
      },
      'bust': {
        description: 'Player busts, dealer stands on 17',
        cards: ['10H', '7D', '8S', 'AH', '6D', '10S']
      },
      'split-aces': {
        description: 'Player gets pair of aces',
        cards: ['AS', 'AH', '7D', '10H', 'KH', 'QD']
      },
      'split-tens': {
        description: 'Player gets pair of tens',
        cards: ['10H', '10D', '7S', 'KH', 'QD', '9H']
      },
      'dealer-bust': {
        description: 'Dealer busts with many cards (for Bust It)',
        cards: ['10H', '9D', 'AH', '5D', '4H', '3S', '10S']
      },
      'perfect-pair': {
        description: 'Player gets perfect pair (same suit)',
        cards: ['KH', 'KH', '7D', '10S', 'AH', '6D']
      },
      'dealer-blackjack': {
        description: 'Dealer gets blackjack (for insurance)',
        cards: ['7H', '8D', 'AH', 'KS', '10H', '9D']
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
      { name: 'blackjack', description: 'Player gets blackjack' },
      { name: 'bust', description: 'Player busts' },
      { name: 'split-aces', description: 'Player gets pair of aces' },
      { name: 'split-tens', description: 'Player gets pair of tens' },
      { name: 'dealer-bust', description: 'Dealer busts with many cards' },
      { name: 'perfect-pair', description: 'Player gets perfect pair' },
      { name: 'dealer-blackjack', description: 'Dealer gets blackjack' }
    ];
  }
}

module.exports = TestMode;
