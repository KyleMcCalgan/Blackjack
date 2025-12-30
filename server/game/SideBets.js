// SideBets - side bet calculations (Perfect Pairs, Bust It, 21+3)

class SideBets {
  // ==================== PERFECT PAIRS ====================

  /**
   * Evaluate Perfect Pairs side bet
   * Wins if first two cards form a pair
   * @param {Array} cards - Player's first two cards
   * @param {Number} betAmount - Bet amount
   * @returns {Object} { payout, handType, multiplier } or { payout: 0 } if loss
   */
  static evaluatePerfectPairs(cards, betAmount) {
    console.log('[PerfectPairs] Evaluating with cards:', cards, 'Bet:', betAmount);

    // Must have exactly 2 cards
    if (!cards || cards.length !== 2) {
      console.log('[PerfectPairs] Not exactly 2 cards, returning 0');
      return { payout: 0 };
    }

    const [card1, card2] = cards;

    // Must be same rank to be a pair
    if (card1.rank !== card2.rank) {
      console.log('[PerfectPairs] Different ranks:', card1.rank, 'vs', card2.rank, '- No pair');
      return { payout: 0 };
    }

    // Determine pair type
    let multiplier = 0;
    let handType = '';

    if (card1.suit === card2.suit) {
      // Perfect Pair - same suit
      multiplier = 25;
      handType = 'Perfect Pair';
    } else if (this.sameColor(card1, card2)) {
      // Colored Pair - same color, different suit
      multiplier = 12;
      handType = 'Colored Pair';
    } else {
      // Mixed Pair - different color
      multiplier = 6;
      handType = 'Mixed Pair';
    }

    const payout = betAmount + (betAmount * multiplier);
    console.log(`[PerfectPairs] ${handType} (${multiplier}:1): ${card1.rank}${card1.suit[0]} + ${card2.rank}${card2.suit[0]} | Payout: $${payout}`);

    // Return payout info
    return { payout, handType, multiplier };
  }

  /**
   * Check if two cards are the same color
   * @param {Object} card1 - First card
   * @param {Object} card2 - Second card
   * @returns {Boolean}
   */
  static sameColor(card1, card2) {
    const redSuits = ['hearts', 'diamonds'];
    const card1Red = redSuits.includes(card1.suit);
    const card2Red = redSuits.includes(card2.suit);
    return card1Red === card2Red;
  }

  // ==================== BUST IT ====================

  /**
   * Evaluate Bust It side bet
   * Wins if dealer busts, with payout based on card count
   * @param {Array} dealerHand - Dealer's complete hand
   * @param {Number} betAmount - Bet amount
   * @returns {Object} { payout, handType, multiplier, cardCount } or { payout: 0 } if loss
   */
  static evaluateBustIt(dealerHand, betAmount) {
    if (!dealerHand || dealerHand.length === 0) return { payout: 0 };

    // Calculate dealer's hand value
    const dealerValue = this.calculateHandValue(dealerHand);

    // Dealer must bust for this bet to win
    if (dealerValue <= 21) return { payout: 0 };

    const cardCount = dealerHand.length;

    // Payout table based on card count
    const payoutTable = {
      3: 2,
      4: 4,
      5: 15,
      6: 50,
      7: 100,
      8: 250
    };

    // 8+ cards all pay 250:1
    const multiplier = cardCount >= 8 ? payoutTable[8] : (payoutTable[cardCount] || 0);

    if (multiplier === 0) return { payout: 0 };

    const payout = betAmount + (betAmount * multiplier);
    const handType = cardCount >= 8 ? '8+ Cards' : `${cardCount} Cards`;

    // Return payout info
    return { payout, handType, multiplier, cardCount };
  }

  // ==================== 21+3 ====================

  /**
   * Evaluate 21+3 side bet
   * Combines player's first two cards + dealer's upcard for poker hands
   * @param {Array} playerCards - Player's first two cards
   * @param {Object} dealerUpCard - Dealer's face-up card
   * @param {Number} betAmount - Bet amount
   * @returns {Object} { payout, handType, multiplier } or { payout: 0 } if loss
   */
  static evaluate21Plus3(playerCards, dealerUpCard, betAmount) {
    if (!playerCards || playerCards.length < 2 || !dealerUpCard) return { payout: 0 };

    // Combine first two player cards with dealer upcard
    const threeCards = [playerCards[0], playerCards[1], dealerUpCard];

    let multiplier = 0;
    let handType = '';

    // Check hands in order from highest to lowest payout
    if (this.isSuitedThreeOfKind(threeCards)) {
      multiplier = 100;
      handType = 'Suited Three of a Kind';
    } else if (this.isStraightFlush(threeCards)) {
      multiplier = 40;
      handType = 'Straight Flush';
    } else if (this.isThreeOfKind(threeCards)) {
      multiplier = 30;
      handType = 'Three of a Kind';
    } else if (this.isStraight(threeCards)) {
      multiplier = 10;
      handType = 'Straight';
    } else if (this.isFlush(threeCards)) {
      multiplier = 5;
      handType = 'Flush';
    } else {
      // No winning hand
      return { payout: 0 };
    }

    const payout = betAmount + (betAmount * multiplier);
    return { payout, handType, multiplier };
  }

  // ==================== POKER HAND EVALUATORS ====================

  /**
   * Check for suited three of a kind (all same rank AND suit)
   * @param {Array} cards - Three cards
   * @returns {Boolean}
   */
  static isSuitedThreeOfKind(cards) {
    if (cards.length !== 3) return false;

    // All three cards must have same rank AND same suit
    return (
      cards[0].rank === cards[1].rank &&
      cards[1].rank === cards[2].rank &&
      cards[0].suit === cards[1].suit &&
      cards[1].suit === cards[2].suit
    );
  }

  /**
   * Check for three of a kind (all same rank)
   * @param {Array} cards - Three cards
   * @returns {Boolean}
   */
  static isThreeOfKind(cards) {
    if (cards.length !== 3) return false;

    return (
      cards[0].rank === cards[1].rank &&
      cards[1].rank === cards[2].rank
    );
  }

  /**
   * Check for flush (all same suit)
   * @param {Array} cards - Three cards
   * @returns {Boolean}
   */
  static isFlush(cards) {
    if (cards.length !== 3) return false;

    return (
      cards[0].suit === cards[1].suit &&
      cards[1].suit === cards[2].suit
    );
  }

  /**
   * Check for straight (three consecutive ranks)
   * @param {Array} cards - Three cards
   * @returns {Boolean}
   */
  static isStraight(cards) {
    if (cards.length !== 3) return false;

    // Convert ranks to numeric values for comparison
    const values = cards.map(card => this.rankToValue(card.rank)).sort((a, b) => a - b);

    // Check for consecutive values
    if (values[0] + 1 === values[1] && values[1] + 1 === values[2]) {
      return true;
    }

    // Special case: Ace can be low (A-2-3) or high (Q-K-A)
    // Check for A-2-3 (values would be [1, 2, 3] after sort)
    if (values[0] === 1 && values[1] === 2 && values[2] === 3) {
      return true;
    }

    // Check for Q-K-A (treat Ace as 14)
    const highAceValues = cards.map(card => {
      if (card.rank === 'A') return 14;
      return this.rankToValue(card.rank);
    }).sort((a, b) => a - b);

    if (highAceValues[0] + 1 === highAceValues[1] && highAceValues[1] + 1 === highAceValues[2]) {
      return true;
    }

    return false;
  }

  /**
   * Check for straight flush (straight AND flush)
   * @param {Array} cards - Three cards
   * @returns {Boolean}
   */
  static isStraightFlush(cards) {
    return this.isStraight(cards) && this.isFlush(cards);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Convert card rank to numeric value for straight detection
   * @param {String} rank - Card rank
   * @returns {Number} Numeric value
   */
  static rankToValue(rank) {
    const rankMap = {
      'A': 1,  // Ace low by default (also handled as 14 for high straights)
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      'J': 11,
      'Q': 12,
      'K': 13
    };

    return rankMap[rank] || 0;
  }

  /**
   * Calculate hand value (for Bust It evaluation)
   * Simplified version - handles aces optimally
   * @param {Array} cards - Array of cards
   * @returns {Number} Hand value
   */
  static calculateHandValue(cards) {
    let total = 0;
    let aceCount = 0;

    // Count aces and sum other cards
    for (const card of cards) {
      if (card.rank === 'A') {
        aceCount++;
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        total += 10;
      } else {
        total += parseInt(card.rank);
      }
    }

    // Add aces optimally
    for (let i = 0; i < aceCount; i++) {
      if (total + 11 <= 21 && i === aceCount - 1) {
        // Use last ace as 11 if it doesn't bust
        total += 11;
      } else if (total + 11 + (aceCount - i - 1) <= 21) {
        // Use this ace as 11 if remaining aces can be 1
        total += 11;
      } else {
        // Use ace as 1
        total += 1;
      }
    }

    return total;
  }

  /**
   * Get payout multiplier for a specific side bet result
   * Useful for displaying payout tables to players
   * @param {String} betType - 'perfectPairs' | 'bustIt' | '21+3'
   * @param {String} handType - Specific hand type
   * @returns {Number} Multiplier
   */
  static getPayoutMultiplier(betType, handType) {
    const payouts = {
      perfectPairs: {
        'perfect': 25,
        'colored': 12,
        'mixed': 6
      },
      bustIt: {
        '3cards': 2,
        '4cards': 4,
        '5cards': 15,
        '6cards': 50,
        '7cards': 100,
        '8+cards': 250
      },
      '21+3': {
        'suitedThreeOfKind': 100,
        'straightFlush': 40,
        'threeOfKind': 30,
        'straight': 10,
        'flush': 5
      }
    };

    return payouts[betType]?.[handType] || 0;
  }

  /**
   * Get all payout tables (for UI display)
   * @returns {Object} Complete payout information
   */
  static getPayoutTables() {
    return {
      perfectPairs: {
        name: 'Perfect Pairs',
        description: 'First two cards form a pair',
        payouts: [
          { name: 'Perfect Pair (same suit)', multiplier: 25 },
          { name: 'Colored Pair (same color)', multiplier: 12 },
          { name: 'Mixed Pair (different color)', multiplier: 6 }
        ]
      },
      bustIt: {
        name: 'Bust It',
        description: 'Dealer busts',
        payouts: [
          { name: '8+ cards', multiplier: 250 },
          { name: '7 cards', multiplier: 100 },
          { name: '6 cards', multiplier: 50 },
          { name: '5 cards', multiplier: 15 },
          { name: '4 cards', multiplier: 4 },
          { name: '3 cards', multiplier: 2 }
        ]
      },
      '21+3': {
        name: '21+3',
        description: 'First two cards + dealer upcard form poker hand',
        payouts: [
          { name: 'Suited Three of a Kind', multiplier: 100 },
          { name: 'Straight Flush', multiplier: 40 },
          { name: 'Three of a Kind', multiplier: 30 },
          { name: 'Straight', multiplier: 10 },
          { name: 'Flush', multiplier: 5 }
        ]
      }
    };
  }
}

module.exports = SideBets;
