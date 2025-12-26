// Deck class - card generation, shuffling, dealing

const DECK_COUNT = 6; // Default number of decks (easily configurable)

class Deck {
  constructor(deckCount = DECK_COUNT) {
    this.deckCount = deckCount;
    this.cards = this.generateDecks(deckCount);
    this.totalCards = this.cards.length;
    this.cardsDealt = 0;
    this.shuffle();
  }

  /**
   * Generate multiple standard 52-card decks
   */
  generateDecks(count) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cards = [];

    for (let d = 0; d < count; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          cards.push({
            rank,
            suit,
            value: this.getCardValue(rank)
          });
        }
      }
    }

    return cards;
  }

  /**
   * Get numeric value(s) for a card rank
   * Aces return array [1, 11] for soft/hard calculation
   * Face cards return 10
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
   * Fisher-Yates shuffle algorithm
   * Randomizes the deck in-place
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Draw a single card from the deck
   * Automatically reshuffles if deck is empty
   * Returns: card object or null if error
   */
  draw() {
    // Check if deck is empty
    if (this.cards.length === 0) {
      this.reshuffle();
    }

    const card = this.cards.pop();
    this.cardsDealt++;
    return card;
  }

  /**
   * Reshuffle the entire shoe
   * Resets deck to full state with new shuffle
   * Returns: true to signal reshuffle occurred
   */
  reshuffle() {
    console.log('[Deck] Reshuffling deck...');
    this.cards = this.generateDecks(this.deckCount);
    this.cardsDealt = 0;
    this.shuffle();
    return true;
  }

  /**
   * Get deck penetration percentage
   * Shows how much of the shoe has been used
   * Returns: percentage (0-100)
   */
  getPenetration() {
    return ((this.totalCards - this.cards.length) / this.totalCards) * 100;
  }

  /**
   * Get remaining cards count
   */
  getRemainingCards() {
    return this.cards.length;
  }

  /**
   * Get total cards in shoe
   */
  getTotalCards() {
    return this.totalCards;
  }

  /**
   * Get cards dealt this shoe
   */
  getCardsDealt() {
    return this.cardsDealt;
  }

  /**
   * Check if deck needs reshuffling (optional cutoff point)
   * Can be used to reshuffle at specific penetration (e.g., 75%)
   */
  needsReshuffle(penetrationThreshold = 100) {
    return this.getPenetration() >= penetrationThreshold;
  }

  /**
   * Format card as string for display (e.g., "A♠", "K♥")
   */
  static formatCard(card) {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return `${card.rank}${suitSymbols[card.suit]}`;
  }
}

module.exports = Deck;
