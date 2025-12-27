// UI updates and rendering

// ==================== CARD RENDERING ====================

/**
 * Get the visual symbol for a suit
 * @param {String} suit - 'hearts', 'diamonds', 'clubs', or 'spades'
 * @returns {String} Unicode suit symbol
 */
function getSuitSymbol(suit) {
    const suitSymbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    };
    return suitSymbols[suit] || '?';
}

/**
 * Determine if a suit is red or black
 * @param {String} suit - Suit name
 * @returns {String} 'red' or 'black'
 */
function getSuitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

/**
 * Create a playing card element (face-up)
 * @param {Object} card - Card object {rank, suit, value}
 * @param {Boolean} animate - Whether to animate the card when added
 * @returns {HTMLElement} Card element
 */
function createCardElement(card, animate = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'playing-card';

    if (animate) {
        cardEl.classList.add('dealing');
    }

    const suit = card.suit;
    const rank = card.rank;
    const suitSymbol = getSuitSymbol(suit);
    const color = getSuitColor(suit);

    // Add color class
    const colorClass = color === 'red' ? 'card-red' : 'card-black';

    // Top-left corner
    const topLeft = document.createElement('div');
    topLeft.className = `card-corner top-left ${colorClass}`;
    topLeft.innerHTML = `${rank}<br>${suitSymbol}`;

    // Center rank
    const centerRank = document.createElement('div');
    centerRank.className = `card-rank ${colorClass}`;
    centerRank.textContent = rank;

    // Center suit
    const centerSuit = document.createElement('div');
    centerSuit.className = `card-suit ${colorClass}`;
    centerSuit.textContent = suitSymbol;

    // Bottom-right corner
    const bottomRight = document.createElement('div');
    bottomRight.className = `card-corner bottom-right ${colorClass}`;
    bottomRight.innerHTML = `${rank}<br>${suitSymbol}`;

    cardEl.appendChild(topLeft);
    cardEl.appendChild(centerRank);
    cardEl.appendChild(centerSuit);
    cardEl.appendChild(bottomRight);

    return cardEl;
}

/**
 * Create a face-down card element (card back)
 * @param {Boolean} animate - Whether to animate the card when added
 * @returns {HTMLElement} Card back element
 */
function createCardBack(animate = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'playing-card face-down';

    if (animate) {
        cardEl.classList.add('dealing');
    }

    const pattern = document.createElement('div');
    pattern.className = 'card-back-pattern';
    cardEl.appendChild(pattern);

    return cardEl;
}

/**
 * Clear all cards from a container
 * @param {HTMLElement|String} container - Container element or selector
 */
function clearCards(container) {
    const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (containerEl) {
        containerEl.innerHTML = '';
    }
}

/**
 * Render cards to a container
 * @param {HTMLElement|String} container - Container element or selector
 * @param {Array} cards - Array of card objects
 * @param {Boolean} animate - Whether to animate cards
 */
function renderCards(container, cards, animate = false) {
    const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerEl) return;

    clearCards(containerEl);

    cards.forEach((card, index) => {
        let cardEl;

        // Check if this is a face-down card
        if (card.rank === '?' || card.suit === '?') {
            cardEl = createCardBack(animate);
        } else {
            cardEl = createCardElement(card, animate);
        }

        // Add slight delay for each card in animation
        if (animate) {
            cardEl.style.animationDelay = `${index * 0.1}s`;
        }

        containerEl.appendChild(cardEl);
    });
}

/**
 * Render dealer's cards
 * @param {Object} dealer - Dealer object from game state
 * @param {Boolean} hideHole - Whether to hide the hole card
 */
function renderDealerCards(dealer, hideHole = false) {
    if (!dealer || !dealer.cards) return;

    const dealerCardsEl = document.getElementById('dealerCards');
    const dealerValueEl = document.getElementById('dealerValue');

    if (dealer.cards.length === 0) {
        clearCards(dealerCardsEl);
        dealerValueEl.textContent = '-';
        return;
    }

    // Cards are already prepared by server with hidden hole card if needed
    renderCards(dealerCardsEl, dealer.cards, false);

    // Update dealer value
    if (dealer.value === null || dealer.value === undefined) {
        // Hole card is hidden
        dealerValueEl.textContent = '-';
    } else {
        dealerValueEl.textContent = dealer.value;
    }
}

/**
 * Render a player's cards (supports multiple hands from splits)
 * @param {Number} seat - Seat number
 * @param {Object} player - Player object from game state
 * @param {Object} gameState - Game state for active hand detection (optional)
 */
function renderPlayerCards(seat, player, gameState = null) {
    const seatEl = document.querySelector(`.player-seat[data-seat="${seat}"]`);
    if (!seatEl) return;

    const cardsContainer = seatEl.querySelector('.seat-cards');
    if (!cardsContainer) return;

    clearCards(cardsContainer);

    // If player has no hands, show nothing
    if (!player.hands || player.hands.length === 0) {
        return;
    }

    // Determine if this player is currently playing and which hand
    const isCurrentPlayer = gameState && gameState.phase === 'playing' && gameState.currentPlayer === player.id;
    const currentHandIndex = gameState ? gameState.currentHandIndex : -1;

    // If player has multiple hands (split), show them separately
    if (player.hands.length > 1) {
        player.hands.forEach((hand, handIndex) => {
            const handContainer = document.createElement('div');
            handContainer.className = 'hand';

            // Add active class if this is the current hand
            if (isCurrentPlayer && handIndex === currentHandIndex) {
                handContainer.classList.add('active-hand');
            }

            // Create cards container
            const cardsRow = document.createElement('div');
            cardsRow.className = 'cards-row';
            cardsRow.style.display = 'flex';
            cardsRow.style.gap = '6px';
            cardsRow.style.justifyContent = 'center';

            // Render cards in this hand
            hand.cards.forEach(card => {
                const cardEl = createCardElement(card, false);
                cardsRow.appendChild(cardEl);
            });

            handContainer.appendChild(cardsRow);

            // Add hand info (value and bet)
            const handValue = typeof hand.value === 'object' ? hand.value.value : hand.value;
            const handInfo = document.createElement('div');
            handInfo.className = 'hand-info';

            // Show doubled indicator if applicable
            const doubledIndicator = hand.isDoubled ? '<span class="doubled-indicator">DOUBLED</span>' : '';

            handInfo.innerHTML = `
                <span class="hand-value-display">${handValue}</span>
                <span class="hand-bet-display">$${hand.bet}</span>
                ${doubledIndicator}
            `;
            handContainer.appendChild(handInfo);

            cardsContainer.appendChild(handContainer);
        });
    } else {
        // Single hand - render cards with value display
        const hand = player.hands[0];
        if (hand.cards && hand.cards.length > 0) {
            const handContainer = document.createElement('div');
            handContainer.className = 'hand single-hand';

            // Add active class if this player is currently playing
            if (isCurrentPlayer && currentHandIndex === 0) {
                handContainer.classList.add('active-hand');
            }

            // Create cards container
            const cardsRow = document.createElement('div');
            cardsRow.className = 'cards-row';
            cardsRow.style.display = 'flex';
            cardsRow.style.gap = '6px';
            cardsRow.style.justifyContent = 'center';

            // Render cards
            hand.cards.forEach(card => {
                const cardEl = createCardElement(card, false);
                cardsRow.appendChild(cardEl);
            });

            handContainer.appendChild(cardsRow);

            // Add hand value and bet display
            const handValue = typeof hand.value === 'object' ? hand.value.value : hand.value;
            const handInfo = document.createElement('div');
            handInfo.className = 'hand-info';

            // Show doubled indicator if applicable
            const doubledIndicator = hand.isDoubled ? '<span class="doubled-indicator">DOUBLED</span>' : '';

            handInfo.innerHTML = `
                <span class="hand-value-display">${handValue}</span>
                <span class="hand-bet-display">$${hand.bet}</span>
                ${doubledIndicator}
            `;
            handContainer.appendChild(handInfo);

            cardsContainer.appendChild(handContainer);
        }
    }
}

/**
 * Calculate hand value from cards (simplified version)
 * @param {Array} cards - Array of card objects
 * @returns {Number} Hand value
 */
function calculateHandValue(cards) {
    let total = 0;
    let aces = 0;

    cards.forEach(card => {
        if (Array.isArray(card.value)) {
            // Ace
            aces++;
            total += 11;
        } else {
            total += card.value;
        }
    });

    // Adjust for aces
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show a notification message
 * @param {String} message - Message to display
 * @param {String} type - 'info', 'success', 'warning', 'error'
 */
function showNotification(message, type = 'info') {
    // TODO: Implement notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Format currency
 * @param {Number} amount - Amount to format
 * @returns {String} Formatted currency string
 */
function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
}
