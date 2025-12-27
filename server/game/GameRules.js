// GameRules - Core blackjack rule engine and hand evaluation

class GameRules {
  /**
   * Calculate the best possible value for a hand
   * Handles soft/hard ace logic automatically
   * @param {Array} cards - Array of card objects {rank, suit, value}
   * @returns {Object} {value: number, isSoft: boolean}
   */
  static calculateHandValue(cards) {
    if (!cards || cards.length === 0) {
      return { value: 0, isSoft: false };
    }

    let total = 0;
    let aceCount = 0;

    // First pass: count aces and add all other cards
    for (const card of cards) {
      if (card.rank === 'A') {
        aceCount++;
      } else {
        total += card.value;
      }
    }

    // Second pass: add aces optimally
    // Start by treating all aces as 11, then convert to 1 as needed
    let acesAsEleven = aceCount;

    while (aceCount > 0) {
      // Try treating this ace as 11
      if (total + 11 + (aceCount - 1) <= 21) {
        total += 11;
        acesAsEleven = aceCount; // Track how many aces are 11
      } else {
        total += 1;
        acesAsEleven--;
      }
      aceCount--;
    }

    // Hand is "soft" if it contains an ace counted as 11
    const isSoft = acesAsEleven > 0;

    return { value: total, isSoft };
  }

  /**
   * Check if a hand is a natural blackjack (21 in first 2 cards)
   * @param {Array} cards - Array of card objects
   * @param {Boolean} fromSplit - Whether this hand came from a split
   * @param {Boolean} splitAcesIsBlackjack - Game config option
   * @returns {Boolean}
   */
  static isBlackjack(cards, fromSplit = false, splitAcesIsBlackjack = true) {
    // Must be exactly 2 cards
    if (cards.length !== 2) return false;

    // If from split and config says split aces don't count as blackjack
    if (fromSplit && !splitAcesIsBlackjack) return false;

    const { value } = this.calculateHandValue(cards);
    if (value !== 21) return false;

    // Must have an ace and a 10-value card
    const hasAce = cards.some(card => card.rank === 'A');
    const hasTen = cards.some(card => ['10', 'J', 'Q', 'K'].includes(card.rank));

    return hasAce && hasTen;
  }

  /**
   * Check if a hand is bust (over 21)
   * @param {Number} value - Hand value
   * @returns {Boolean}
   */
  static isBust(value) {
    return value > 21;
  }

  /**
   * Compare player hand to dealer hand and determine result
   * @param {Number} playerValue - Player's hand value
   * @param {Number} dealerValue - Dealer's hand value
   * @param {Boolean} playerBlackjack - Is player's hand a blackjack
   * @param {Boolean} dealerBlackjack - Is dealer's hand a blackjack
   * @returns {String} 'win' | 'loss' | 'push'
   */
  static compareHands(playerValue, dealerValue, playerBlackjack = false, dealerBlackjack = false) {
    // Both blackjack = push
    if (playerBlackjack && dealerBlackjack) return 'push';

    // Player blackjack beats dealer non-blackjack
    if (playerBlackjack && !dealerBlackjack) return 'win';

    // Dealer blackjack beats player non-blackjack
    if (dealerBlackjack && !playerBlackjack) return 'loss';

    // Player bust = loss
    if (this.isBust(playerValue)) return 'loss';

    // Dealer bust (player not bust) = win
    if (this.isBust(dealerValue)) return 'win';

    // Compare values
    if (playerValue > dealerValue) return 'win';
    if (playerValue < dealerValue) return 'loss';
    return 'push';
  }

  /**
   * Check if a hand can be split (pair of same rank or both 10-value cards)
   * @param {Array} cards - Array of card objects
   * @returns {Boolean}
   */
  static canSplit(cards) {
    // Must be exactly 2 cards
    if (!cards || cards.length !== 2) return false;

    // Both cards must have same rank OR both must be 10-value cards
    const card1 = cards[0];
    const card2 = cards[1];

    // Same rank (traditional split)
    if (card1.rank === card2.rank) return true;

    // Both are 10-value cards (10, J, Q, K)
    const isTenValue = (card) => ['10', 'J', 'Q', 'K'].includes(card.rank);
    return isTenValue(card1) && isTenValue(card2);
  }

  /**
   * Check if a hand can be doubled (exactly 2 cards, not already acted)
   * @param {Array} cards - Array of card objects
   * @param {Boolean} hasActed - Whether player has taken any action on this hand
   * @returns {Boolean}
   */
  static canDouble(cards, hasActed = false) {
    // Can only double on first action with exactly 2 cards
    return cards && cards.length === 2 && !hasActed;
  }

  /**
   * Check if a hand can be hit (not bust, not stood, not blackjack)
   * @param {Number} value - Current hand value
   * @param {String} status - Hand status ('active', 'stand', 'bust', 'blackjack')
   * @returns {Boolean}
   */
  static canHit(value, status) {
    if (status !== 'active') return false;
    if (this.isBust(value)) return false;
    if (value === 21) return false; // Standing on 21 automatically
    return true;
  }

  /**
   * Calculate payout for a winning hand
   * @param {Number} bet - Original bet amount
   * @param {String} result - 'win' | 'loss' | 'push' | 'blackjack'
   * @param {String} blackjackPayout - Payout ratio (e.g., '3:2', '6:5')
   * @returns {Number} Total payout (includes original bet if won/pushed)
   */
  static calculatePayout(bet, result, blackjackPayout = '3:2') {
    switch (result) {
      case 'loss':
        return 0; // Lose bet

      case 'push':
        return bet; // Get bet back

      case 'win':
        return bet * 2; // Win 1:1 plus original bet

      case 'blackjack':
        const [numerator, denominator] = blackjackPayout.split(':').map(Number);
        const winnings = bet * (numerator / denominator);
        return bet + winnings; // Original bet plus blackjack winnings

      default:
        return 0;
    }
  }

  /**
   * Determine if dealer should hit (dealer stands on all 17s)
   * @param {Number} value - Dealer's hand value
   * @param {Boolean} isSoft - Is the hand soft (ace as 11)
   * @returns {Boolean}
   */
  static dealerShouldHit(value, isSoft = false) {
    // Dealer stands on all 17s (both hard and soft)
    return value < 17;
  }

  /**
   * Parse payout ratio string to decimal
   * @param {String} ratio - e.g., '3:2', '6:5', '2:1'
   * @returns {Number} Decimal representation
   */
  static parsePayoutRatio(ratio) {
    const [numerator, denominator] = ratio.split(':').map(Number);
    return numerator / denominator;
  }

  /**
   * Validate a bet amount against min/max limits
   * @param {Number} amount - Bet amount to validate
   * @param {Number} minBet - Minimum bet allowed
   * @param {Number} maxBet - Maximum bet allowed (null = no limit)
   * @param {Number} bankroll - Player's available bankroll
   * @returns {Object} {valid: boolean, error: string}
   */
  static validateBet(amount, minBet, maxBet, bankroll) {
    if (typeof amount !== 'number' || amount < 0) {
      return { valid: false, error: 'Bet amount must be a positive number' };
    }

    if (amount < minBet) {
      return { valid: false, error: `Minimum bet is $${minBet}` };
    }

    if (maxBet !== null && amount > maxBet) {
      return { valid: false, error: `Maximum bet is $${maxBet}` };
    }

    if (amount > bankroll) {
      return { valid: false, error: 'Insufficient funds' };
    }

    return { valid: true };
  }
}

module.exports = GameRules;
