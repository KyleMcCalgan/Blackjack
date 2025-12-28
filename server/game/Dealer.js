// Dealer - dealer logic and behavior

const GameRules = require('./GameRules');

class Dealer {
  constructor() {
    // Dealer's hand
    this.hand = [];

    // Track specific cards for game logic
    this.upCard = null;      // Face-up card (first card dealt)
    this.holeCard = null;    // Face-down card (second card dealt)

    // Status
    this.hasBlackjack = false;
    this.isBust = false;
    this.isComplete = false;
  }

  // ==================== CARD MANAGEMENT ====================

  /**
   * Add a card to dealer's hand
   * @param {Object} card - Card object {rank, suit, value}
   * @param {Boolean} faceUp - Whether card is face up
   */
  addCard(card, faceUp = true) {
    this.hand.push(card);

    // Track upCard and holeCard
    if (this.hand.length === 1) {
      this.upCard = card;
    } else if (this.hand.length === 2) {
      this.holeCard = card;
    }

    // Update status
    this.updateStatus();
  }

  /**
   * Reveal the hole card
   * @returns {Object} The hole card
   */
  revealHoleCard() {
    return this.holeCard;
  }

  /**
   * Get dealer's current hand value
   * @returns {Object} {value, isSoft}
   */
  getHandValue() {
    return GameRules.calculateHandValue(this.hand);
  }

  /**
   * Get visible value (only upCard visible before reveal)
   * @returns {Object} {value, isSoft}
   */
  getVisibleValue() {
    if (this.hand.length === 0) {
      return { value: 0, isSoft: false };
    }

    // Before hole card reveal, only count upCard
    if (this.hand.length >= 2 && !this.isComplete) {
      return GameRules.calculateHandValue([this.upCard]);
    }

    // After reveal, show full value
    return this.getHandValue();
  }

  /**
   * Clear dealer's hand for new round
   */
  clearHand() {
    this.hand = [];
    this.upCard = null;
    this.holeCard = null;
    this.hasBlackjack = false;
    this.isBust = false;
    this.isComplete = false;
  }

  // ==================== GAME LOGIC ====================

  /**
   * Update dealer's status based on current hand
   */
  updateStatus() {
    const { value } = this.getHandValue();

    // Check for blackjack (only with exactly 2 cards)
    if (this.hand.length === 2) {
      this.hasBlackjack = GameRules.isBlackjack(this.hand);
    }

    // Check for bust
    if (GameRules.isBust(value)) {
      this.isBust = true;
      this.isComplete = true;
    }

    // Check if dealer should stand
    if (value >= 17) {
      this.isComplete = true;
    }
  }

  /**
   * Determine if dealer should hit
   * @returns {Boolean}
   */
  shouldHit() {
    // Don't hit if already complete (busted or reached 17+)
    if (this.isComplete || this.isBust) {
      return false;
    }

    const { value, isSoft } = this.getHandValue();
    return GameRules.dealerShouldHit(value, isSoft);
  }

  /**
   * Check if dealer shows an Ace (for insurance)
   * @returns {Boolean}
   */
  showsAce() {
    return this.upCard && this.upCard.rank === 'A';
  }

  /**
   * Check if dealer has blackjack
   * @returns {Boolean}
   */
  checkBlackjack() {
    if (this.hand.length !== 2) return false;
    this.hasBlackjack = GameRules.isBlackjack(this.hand);
    return this.hasBlackjack;
  }

  /**
   * Get card count (for Bust It side bet tracking)
   * @returns {Number}
   */
  getCardCount() {
    return this.hand.length;
  }

  // ==================== UTILITY ====================

  /**
   * Serialize dealer data for client
   * @param {Boolean} hideHole - Whether to hide hole card (before reveal)
   * @returns {Object}
   */
  toJSON(hideHole = false) {
    const { value, isSoft } = this.getHandValue();

    let cards = [...this.hand];

    // Hide hole card if requested (before dealer turn)
    // hideHole parameter takes precedence over isComplete status
    if (hideHole && this.hand.length >= 2) {
      cards = [
        this.upCard,
        { rank: '?', suit: '?', value: 0 } // Hidden card
      ];
    }

    return {
      cards,
      upCard: this.upCard,
      cardCount: this.hand.length,
      value: hideHole ? null : value,
      isSoft: hideHole ? null : isSoft,
      hasBlackjack: this.hasBlackjack,
      isBust: this.isBust,
      isComplete: this.isComplete
    };
  }

  /**
   * Get dealer statistics for a session
   * @returns {Object}
   */
  getStats() {
    return {
      hasBlackjack: this.hasBlackjack,
      isBust: this.isBust,
      finalValue: this.getHandValue().value,
      cardCount: this.hand.length
    };
  }
}

module.exports = Dealer;
