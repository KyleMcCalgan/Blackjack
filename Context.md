# Multiplayer Blackjack Web Game - Project Specification

## Project Overview

A browser-based multiplayer blackjack game supporting up to 5 players, playable on mobile and desktop devices. The game runs locally on a host's laptop with players connecting over any network without requiring port forwarding.

---

## 1. Technical Architecture

### 1.1 Tech Stack Recommendation

**Frontend:**

- HTML5, CSS3, Vanilla JavaScript (no frameworks)
- Responsive design with mobile-first approach (portrait orientation)
- WebSocket client for real-time communication

**Backend:**

- Node.js with Express.js
- Socket.IO for WebSocket connections (handles real-time bidirectional communication)
- No database required (all game state held in memory)
- Server-side console logging for admin monitoring
- In-memory statistics tracking for export

**Networking Solution:**

- **ngrok** (hardcoded configuration for simplicity)
- No environment variables - all config in code

**Why this stack?**

- You're familiar with Node.js from university
- Socket.IO makes multiplayer real-time communication simple
- No database overhead since sessions don't persist
- ngrok solves the port forwarding issue elegantly
- Vanilla JS keeps codebase simple and understandable
- Easy to migrate to cloud hosting later (Heroku, Railway, Render, etc.)

**Admin Features (Server-Side):**

- Console commands for host/admin control
- Statistics tracking and export functionality
- Test mode with pre-dealt cards
- Detailed server-side logging (visible to you as host)

### 1.2 Project Structure

```
blackjack-game/
├── server/
│   ├── index.js                 # Main server file
│   ├── game/
│   │   ├── GameRoom.js          # Game room manager
│   │   ├── Deck.js              # Deck and card logic
│   │   ├── Player.js            # Player state management
│   │   ├── Dealer.js            # Dealer logic
│   │   ├── GameRules.js         # Blackjack rules engine
│   │   └── SideBets.js          # Side bet calculations
│   ├── admin/
│   │   ├── AdminCommands.js     # Server console commands
│   │   ├── Statistics.js        # Stats tracking and export
│   │   └── TestMode.js          # Pre-dealt card testing
│   └── utils/
│       └── helpers.js           # Utility functions
├── client/
│   ├── index.html               # Game interface
│   ├── host.html                # Host configuration page
│   ├── css/
│   │   ├── main.css             # Main styles
│   │   ├── mobile.css           # Mobile-specific styles
│   │   └── table.css            # Game table layout
│   ├── js/
│   │   ├── app.js               # Main client logic
│   │   ├── ui.js                # UI updates and rendering
│   │   ├── socket-handler.js   # Socket.IO client logic
│   │   └── animations.js       # Card animations (future)
│   └── assets/
│       ├── cards/               # Card images (future sprites)
│       └── sounds/              # Sound effects (optional)
├── package.json
├── .gitignore
└── README.md
```

---

## 2. Game Rules & Configuration

### 2.1 Blackjack Rules (Betway-based)

**Core Rules:**

- **Dealer behavior:** Stands on all 17s (hard and soft)
- **Blackjack payout:** 3:2 (configurable by host)
- **Number of decks:** Configurable (default: 6 decks) - exposed as constant in `Deck.js`
- **Deck reshuffling:** Play through entire shoe, then reshuffle completely
- **Reshuffle notification:** Display notification to all players when deck is reshuffled

**Splitting Rules:**

- **Split allowed:** Yes, on any pair
- **Split Aces:** Treated as regular splits (receive multiple cards, can hit normally)
- **Re-splitting:** Allowed indefinitely (no limit on number of splits)
- **Double after split:** Allowed
- **Split Aces = Blackjack:** Configurable toggle option set by host before game starts
    - If enabled: A+10 after split counts as blackjack (pays 3:2)
    - If disabled: A+10 after split counts as 21 (pays 1:1)

**Double Down Rules:**

- **Double on:** Any two cards
- **Cards received:** Exactly one card, then hand automatically stands
- **Double after split:** Allowed

**Insurance:**

- **Offered when:** Dealer shows Ace
- **Insurance bet:** Exactly half of main bet
- **Insurance payout:** 2:1 when dealer has blackjack
- **Even Money:** Not implemented

**Surrender:**

- Not implemented (potential future feature)

**Bust Behavior:**

- All players bust: Everyone loses their bets
- Everyone gets blackjack: Everyone receives blackjack payout (3:2)
- Dealer automatically loses to player blackjack (no dealer insurance)

### 2.2 Configurable Settings (Host Control)

**Pre-Game Configuration Menu:** Host can adjust these settings before starting the game:

- Starting bankroll (default: $1000)
- Minimum bet (default: $10)
- Maximum bet (default: $500)
- Number of decks (default: 6)
- Blackjack payout ratio (default: 3:2, alternatives: 6:5, 2:1)
- Insurance payout ratio (default: 2:1)
- Split Aces = Blackjack toggle (default: enabled)

**Settings Lock:**

- Once game starts, settings cannot be changed
- Game must be manually ended by host or all players leave/lose
- No pause functionality

### 2.2 Side Bets

**General Side Bet Rules:**

- All side bets are **optional**
- Placed **before round starts** (during betting phase)
- Same min/max limits as main bets
- No maximum total bet limit (main + all side bets can be unlimited)
- Side bets are modular and designed for easy expansion

**Implementation Notes:**

- Dealer card count tracker visible to all players during dealer's turn
- Info icons next to each side bet option with payout explanations
- Each side bet has a helper modal/tooltip explaining rules and payouts accessible via info icon

#### Perfect Pairs

- **Description:** First two cards form a pair
- **Payouts:**
    - Perfect Pair (same suit): 25:1
    - Colored Pair (same color, different suit): 12:1
    - Mixed Pair (different color): 6:1

#### 21+3

- **Description:** First two player cards + dealer upcard form poker hand
- **Payouts:**
    - Suited Three of a Kind: 100:1
    - Straight Flush: 40:1
    - Three of a Kind: 30:1
    - Straight: 10:1
    - Flush: 5:1

#### Bust It

- **Description:** Bet on dealer busting
- **Payouts:**
    - Dealer busts with 8+ cards: 250:1
    - Dealer busts with 7 cards: 100:1
    - Dealer busts with 6 cards: 50:1
    - Dealer busts with 5 cards: 15:1
    - Dealer busts with 4 cards: 4:1
    - Dealer busts with 3 cards: 2:1

#### 21+3 (MVP - Simple Implementation)

- **Description:** First two player cards + dealer upcard form poker hand
- **Payouts:**
    - Suited Three of a Kind: 100:1
    - Straight Flush: 40:1
    - Three of a Kind: 30:1
    - Straight: 10:1
    - Flush: 5:1

**Future Side Bets:**

- Modular design allows easy addition of new side bets
- No specific side bets planned, but architecture supports expansion
- Each new side bet requires: calculation function, payout table, UI element, info modal

**Implementation Note:** Each side bet has a helper modal/tooltip explaining rules and payouts accessible via info icon.

---

## 3. Game Flow & User Experience

### 3.1 Connection & Setup Flow

1. **Host starts server** on their laptop
2. **Host opens configuration page** (`/host`)
    - Sets starting bankroll (default: $1000)
    - Sets minimum bet (default: $10)
    - Sets maximum bet (default: $500)
    - Sets number of decks (default: 6)
    - Sets blackjack payout ratio (default: 3:2)
    - Sets insurance payout ratio (default: 2:1)
    - Toggles "Split Aces = Blackjack" (default: enabled)
    - All settings have reasonable blackjack defaults
3. **Server generates unique game code** and ngrok URL
4. **Host shares link/code** with players
5. **Host joins as first player** (automatically becomes host with special privileges)
6. **Players navigate to URL** on their devices
7. **Players enter name** and join table
8. **Auto-assigned seats** (first-come-first-serve queue, always 5 seats available)
9. **Host can transfer host privileges** by clicking other players in lobby (before game starts)
10. **Host sees player list** populate in real-time
11. **Ready check system** ensures all players ready before game begins
12. **Host clicks "Begin Game"** when all players ready
13. **No mid-game joining** - players can only join before game starts

**Host Disconnection Handling:**

- If host leaves lobby (before game starts): Host privileges automatically transfer to next player
- If host leaves during game: Host privileges automatically transfer to next player
- Game continues normally with new host

**Player Disconnection Handling:**

- Player disconnects during their turn: Hand auto-stands
- Player treated as if they never existed for remainder of round
- Player cannot reconnect mid-game
- Player must wait for new game session to rejoin
- If all players disconnect: Game ends

**Bankrupt Player Handling:**

- Players with $0 bankroll are eliminated
- They can stay and spectate (their turn is skipped)
- No rebuy option
- No host ability to give players more chips
- Game continues with remaining active players

### 3.2 Gameplay Loop

### 3.2 Gameplay Loop

**Phase 1: Betting**

- All players see their current bankroll
- **Chip System:** Players build bets using chip increments
    - Available chips: $1, $2, $5, $10, $20, $50, $100, $200, $500, $1000
    - Clickable chip circles to add to bet total
    - "Back" button removes last chip added
    - "Reset" button clears entire bet
    - Display shows bet total as chips are added
- Players place main bet (must be within min/max limits)
- Players optionally place side bets via expandable menu
    - Side bets have same min/max as main bets
    - No limit on total bet amount (main + all side bets)
- Bet validation:
    - Cannot bet more than bankroll
    - Shows notification if attempting invalid bet
    - Players can change bet before marking ready
    - Must "unready" before changing bet
- Visual confirmation when bet placed and player marked "Ready"
- **30-second countdown timer** with visual indicator
- Host can manually start round early if all players ready
- **Timeout behavior:** Players who don't bet in time automatically fold (no bet, skip turn)
- Round begins when: (a) all players ready, OR (b) timer expires

**Phase 2: Initial Deal**

- Dealer deals two cards to each player (face up)
- Dealer receives one face-up, one face-down card
- Animate cards being dealt to seats in order
- Check for dealer Blackjack (if Ace showing, offer insurance first)
- Check for player Blackjacks (paid 3:2 immediately)

**Phase 3: Player Turns (Sequential)**

- Players act in seat order (seat 1 → seat 5)
- Current player highlighted with visual indicator (glow/highlight effect)
- **30-second action timer** with visual countdown
- **Timeout behavior:** Auto-stand if player doesn't act in time
- **Pre-selection allowed:** Players can select actions before their turn (e.g., pre-select "stand")
- Available actions shown as buttons:
    - **Hit** - receive another card
    - **Stand** - end turn
    - **Double Down** - double bet, receive one card, end turn (only on first action of hand)
    - **Split** - if pair, create two hands with separate bets (only on first action)
        - Can re-split indefinitely if receiving more pairs
        - Can double after split
        - Split Aces behavior: Full play (not limited to one card) unless host configured otherwise
- **Split hand display:** Side-by-side layout with enlarge button to view hands clearly
- All players see each other's actions in real-time
- All players see each other's cards, bets, and hand values
- Continue until all players finished (stood, busted, or blackjack)

**Phase 4: Dealer Turn**

- Reveal dealer's hole card
- Dealer hits until reaching 17 or higher
- Animate dealer drawing cards

**Phase 5: Resolution**

- Calculate wins/losses for each player
- Pay out main bets (win 1:1, blackjack 3:2, push returns bet)
- Pay out side bets according to rules
- **Highlight winning side bets** with winnings displayed prominently
- Update player bankrolls
- Display results summary briefly
- Mark eliminated players ($0 bankroll) but keep them as spectators

**Phase 6: Next Round**

- **Auto-start** next round immediately after results display
- No "ready" button needed - automatic progression
- Players can leave between rounds if desired
- Eliminated players' turns automatically skipped
- If only dealer remains (all players eliminated/left): Game ends
- Return to Phase 1 (Betting)

### 3.3 Mobile UI Layout (Portrait)

```
┌─────────────────────┐
│   Dealer Section    │
│  [Card] [???]       │  ← Face-up and face-down card
│  Card Count: 2      │  ← Visible card count for Bust It tracking
│  Hand: 17           │
├─────────────────────┤
│   Player Seats      │
│  ┌────┐ ┌────┐     │
│  │ P1 │ │ P2 │     │  (Top row: seats 1-2)
│  └────┘ └────┘     │
│  ┌────┐ ┌────┐     │
│  │ P3 │ │ P4 │     │  (Middle row: seats 3-4)
│  └────┘ └────┘     │
│     ┌────┐         │
│     │ P5 │         │  (Bottom row: seat 5 - always 5 seats)
│     └────┘         │
├─────────────────────┤
│   Current Player    │
│   (YOU - Highlight) │
│  [A♠] [K♥]         │  ← Plain text cards, no colors
│  Hand: 21           │
│  Bankroll: $850     │
│  [View Info] btn    │  ← Click to see detailed player info
├─────────────────────┤
│   Betting Panel     │
│  Chips:             │
│ [1][2][5][10][20]   │  ← Clickable chip circles
│ [50][100][200]      │
│ [500][1000]         │
│  Main: $50          │
│  [Back] [Reset]     │  ← Betting controls
│  [Side Bets ▼]      │  ← Expandable side bet menu
├─────────────────────┤
│   Action Buttons    │
│ [Hit] [Stand]       │
│ [Double] [Split]    │  ← Available actions based on game state
│  Timer: 30s         │  ← Countdown timer
└─────────────────────┘
```

**Card Display Details:**

- **Format:** Plain text (e.g., "A♠", "K♥", "10♦", "7♣")
- **No colored suits** - all text same color
- **Face-down cards:** Shown as `[???]` or `[?]`
- **Split hands:** Side-by-side layout with enlarge button for clarity

**Each player seat shows (clickable for details):**

- Player name
- Current bankroll (visible to all)
- Current bet amount (during betting phase)
- Cards (during play - visible to all)
- Hand value (visible to all)
- Status indicator (waiting, playing, bust, stand, blackjack, eliminated)
- Highlight effect when it's their turn

**Player Info View (when clicked):**

- Detailed view of player's cards (useful for split hands)
- All bets placed (main + side bets)
- Current hand values
- Bankroll

---

## 4. Feature Breakdown & Implementation Priority

### 4.1 MVP (Minimum Viable Product) - Phase 1

**Must-Have Features:**

1. ✅ Local server setup with Socket.IO
2. ✅ ngrok integration for external access (hardcoded config)
3. ✅ Host configuration page with all settings (bankroll, bet limits, deck count, payout ratios, Split Aces toggle)
4. ✅ Player join system with name entry
5. ✅ Seat assignment (always 5 seats, auto-assigned queue)
6. ✅ Host transfer system (click player in lobby, auto-transfer on disconnect)
7. ✅ Ready check system before game starts
8. ✅ Full blackjack gameplay (hit, stand, double, split, re-split, insurance)
9. ✅ Dealer logic (stand on 17)
10. ✅ Win/loss calculation
11. ✅ Bankroll tracking (session-based)
12. ✅ Chip-based betting system ($1-$1000 chips)
13. ✅ Side bets: Perfect Pairs, Bust It, 21+3
14. ✅ Dealer card count tracker (for Bust It visibility)
15. ✅ Side bet info modals/tooltips
16. ✅ Mobile-responsive UI (portrait)
17. ✅ Real-time state synchronization
18. ✅ 30-second timers (betting phase and player actions)
19. ✅ Auto-stand on timeout
20. ✅ Player info detail view (click seats to expand)
21. ✅ Server-side statistics tracking
22. ✅ Test mode with pre-dealt cards (server-side only)
23. ✅ Admin console commands

**Simplified for MVP:**

- Text-based cards (e.g., "A♠", "K♥", no colored suits)
- Minimal styling (clean but simple)
- No animations (Phase 2)
- No sound effects (not planned)
- No haptic feedback
- Simple card slide animation only (if time permits)

### 4.2 Phase 2 Enhancements (Flexible Timeline)

**Note:** Development will be iterative and freestyle - these phases are guidelines for logical implementation order, not strict requirements.

**Nice-to-Have Features:**

1. Simple card slide animations (dealing to seats)
2. Better visual design with themed styling
3. Additional side bets (if desired - architecture supports easy addition)
4. Better error handling and reconnection UI
5. Client-side statistics view (button to view stats)
6. Statistics export functionality
7. Enhanced split hand visualization
8. Improved mobile touch interactions

### 4.3 Phase 3 Polish (Future Considerations)

**Future Improvements:**

1. Custom card sprites (hand-drawn as mentioned)
2. More sophisticated animations
3. Multiple game rooms (not planned but possible)
4. Chat feature (not currently planned)
5. Quick reactions/emojis (not currently planned)
6. Tournament mode (not currently planned)
7. Cloud deployment (when ready to move off laptop hosting)

**Not Planned:**

- Sound effects
- Haptic feedback
- Spectator mode beyond eliminated players
- Rebuy functionality
- Other card games

---

## 5. Statistics System

### 5.1 Statistics Tracking (Server-Side)

**Session Statistics (per game session):**

- Total hands played
- Total rounds completed
- Hands won/lost/pushed per player
- Blackjacks hit per player
- Total money won/lost per player
- Biggest win/loss in single hand
- Current win/loss streaks
- Side bet win rates
- Split frequency
- Double down frequency
- Bust frequency (players and dealer)
- Dealer blackjack frequency
- Insurance win rate
- Average bet size per player
- Time played

**Hand History Tracking:**

- Complete record of each hand (server-side only)
- Cards dealt to each player
- Actions taken
- Bets placed
- Outcomes
- Not accessible to clients (admin/server only)

### 5.2 Statistics Access

**Server Console Commands:**

```
/stats              - Display current session statistics
/stats [player]     - Display stats for specific player
/export             - Export all statistics to JSON file
/history            - Show last 10 hands
/history [n]        - Show last n hands
/clear-stats        - Reset statistics (prompts for confirmation)
```

**Future Client Access:**

- "Stats" button during gameplay (Phase 2)
- Shows player's personal statistics
- Option to view global game statistics
- Formatted display of key metrics

### 5.3 Statistics Export Format

**JSON Export Structure:**

```json
{
  "sessionId": "unique-session-id",
  "startTime": "ISO-8601 timestamp",
  "endTime": "ISO-8601 timestamp",
  "configuration": {
    "startingBankroll": 1000,
    "minBet": 10,
    "maxBet": 500,
    "deckCount": 6,
    "blackjackPayout": "3:2"
  },
  "players": [
    {
      "name": "Alice",
      "handsPlayed": 45,
      "handsWon": 20,
      "handsLost": 22,
      "handsPushed": 3,
      "blackjacks": 4,
      "totalWagered": 2250,
      "netProfit": -150,
      "biggestWin": 300,
      "biggestLoss": 200,
      "currentStreak": -3
    }
  ],
  "dealer": {
    "blackjacks": 3,
    "busts": 18,
    "handsPlayed": 45
  },
  "handHistory": [...]
}
```

**Export Location:**

- Saved to `/server/exports/` directory
- Filename format: `stats-{sessionId}-{timestamp}.json`
- Automatic export on server shutdown (optional)

---

## 6. Admin Console Commands

### 6.1 Available Commands

**Game Control:**

```
/start              - Force start game (override ready check)
/end                - End current game session
/pause              - Not implemented (pausing not supported)
/kick [player]      - Kick player from game
/transfer [player]  - Transfer host to specified player
```

**Testing & Debug:**

```
/test-mode on       - Enable test mode with pre-dealt cards
/test-mode off      - Disable test mode
/deal [cards]       - In test mode, specify next cards to deal
/debug              - Toggle verbose debug logging
/state              - Display current game state JSON
```

**Statistics:**

```
/stats              - Display session statistics
/stats [player]     - Display player-specific statistics  
/export             - Export statistics to JSON
/history [n]        - Show last n hands from history
/clear-stats        - Reset all statistics
```

**Server Info:**

```
/info               - Display server configuration and ngrok URL
/players            - List all connected players
/url                - Display ngrok public URL
```

### 6.2 Test Mode Details

**Purpose:**

- Allows admin to pre-configure specific card deals
- Useful for testing edge cases, splits, blackjacks, etc.
- Server-side only (no client-side indication)

**Usage Example:**

```
> /test-mode on
Test mode enabled. Use /deal to specify cards.

> /deal AS KH QD 7C 8S
Next 5 cards set: [A♠, K♥, Q♦, 7♣, 8♠]

> /start
Game starting with pre-dealt cards...
```

**Test Mode Restrictions:**

- Can only be activated before round starts
- Automatically validates card specifications
- Deck management still applies (no duplicate cards unless in different decks)

---

## 7. Technical Implementation Details

### 7.1 Socket.IO Event Structure

**Client → Server Events:**

```javascript
'join-game'         // { playerName, gameCode }
'leave-game'        // Player disconnecting
'transfer-host'     // { targetPlayerId } - Host transfers privileges
'place-bet'         // { mainBet, sideBets: { perfectPairs, bustIt, twentyOnePlus3 } }
'ready-bet'         // Player marks betting as ready
'unready-bet'       // Player unmarks ready to change bet
'player-action'     // { action: 'hit'|'stand'|'double'|'split', handIndex }
'pre-select-action' // { action, handIndex } - Pre-select before turn
'request-player-info' // { playerId } - Request detailed player info
'start-game'        // Host starts game (after ready check)
```

**Server → Client Events:**

```javascript
'game-state'        // Full game state update
'player-joined'     // { playerId, playerName, seatNumber }
'player-left'       // { playerId, newHost? }
'host-transferred'  // { newHostId, newHostName }
'config-update'     // { config } - Game configuration
'betting-phase'     // { timeLimit: 30, currentBets: {...} }
'ready-status'      // { playerId, ready: boolean }
'deal-cards'        // { cards: [...], playerId, handIndex }
'dealer-card'       // { card, faceUp: boolean }
'player-turn'       // { playerId, handIndex, timeLimit: 30 }
'action-taken'      // { playerId, action, handIndex }
'dealer-turn'       // Dealer's turn started
'dealer-card-count' // { count } - For Bust It tracking
'round-result'      // { results: [...], playerBalances: {...}, sideWins: {...} }
'player-eliminated' // { playerId } - Player bankrupt
'deck-reshuffled'   // Notification when deck reshuffles
'timer-update'      // { seconds } - Countdown updates
'player-info'       // { playerId, detailedInfo } - Response to info request
'notification'      // { message, type: 'info'|'warning'|'error' }
'error'             // { message }
```

### 7.2 Game State Management

The server maintains a single game state object:

```javascript
{
  gameCode: "ABC123",
  sessionId: "unique-session-id",
  hostId: "socket-id",
  config: {
    startingBankroll: 1000,
    minBet: 10,
    maxBet: 500,
    deckCount: 6,
    blackjackPayout: "3:2",    // Ratio as string for display
    insurancePayout: "2:1",
    splitAcesIsBlackjack: true  // Toggle setting
  },
  phase: "lobby" | "betting" | "dealing" | "playing" | "dealer" | "results",
  roundNumber: 0,
  seats: [
    null,  // Seat 0 (empty)
    "socket-id-1",  // Seat 1
    "socket-id-2",  // Seat 2
    null,  // Seat 3 (empty)
    null,  // Seat 4 (empty)
    "socket-id-5"   // Seat 5
  ],
  players: {
    "socket-id": {
      id: "socket-id",
      name: "Alice",
      seat: 1,
      isHost: true,
      bankroll: 1000,
      currentBet: 50,
      sideBets: { 
        perfectPairs: 10, 
        bustIt: 5,
        twentyOnePlus3: 10
      },
      hands: [
        { 
          cards: [{rank: 'A', suit: 'spades'}], 
          value: 11, 
          status: 'active' | 'stand' | 'bust' | 'blackjack',
          bet: 50  // Separate bet tracking for splits
        }
      ],
      ready: false,  // Ready for betting phase
      eliminated: false,
      preSelectedAction: null,  // Pre-selected action
      statistics: {
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        handsPushed: 0,
        blackjacks: 0,
        totalWagered: 0,
        netProfit: 0
      }
    }
  },
  dealer: {
    hand: { 
      cards: [], 
      value: 0,
      cardCount: 0  // For Bust It tracking
    },
    upCard: null,
    holeCard: null
  },
  deck: [...], // Array of remaining cards
  currentPlayerIndex: 0,  // Index in seat order
  currentHandIndex: 0,    // For handling splits
  bettingTimer: null,     // Timer reference
  actionTimer: null,      // Timer reference
  deckPenetration: 0      // Percentage of deck used
}
```

**State Transitions:**

```
lobby → betting → dealing → playing → dealer → results → betting (loop)
                                                      ↓
                                                   lobby (if game ends)
```

### 7.3 Deck Implementation

**Card Representation:**

```javascript
{
  rank: 'A'|'2'|'3'|...|'K',
  suit: 'hearts'|'diamonds'|'clubs'|'spades',
  value: [1,11] | 2-10 | 10  // Aces can be 1 or 11
}
```

**Deck Configuration:**

```javascript
// In Deck.js - easily changeable constant
const DECK_COUNT = 6; // Change this number to adjust deck count

class Deck {
  constructor(deckCount = DECK_COUNT) {
    this.deckCount = deckCount;
    this.cards = this.generateDecks(deckCount);
    this.totalCards = this.cards.length;
    this.shuffle();
  }
  
  generateDecks(count) {
    // Creates count * 52 cards
  }
  
  shuffle() {
    // Fisher-Yates shuffle
  }
  
  draw() {
    if (this.cards.length === 0) {
      this.reshuffle();
    }
    return this.cards.pop();
  }
  
  reshuffle() {
    // Play through entire shoe before reshuffling
    this.cards = this.generateDecks(this.deckCount);
    this.shuffle();
    return true; // Signals reshuffle occurred
  }
  
  getPenetration() {
    return ((this.totalCards - this.cards.length) / this.totalCards) * 100;
  }
}
```

**Reshuffle Behavior:**

- Deck plays through completely (all cards dealt)
- When `draw()` called on empty deck, automatic reshuffle
- Server emits `'deck-reshuffled'` event to all clients
- Notification displayed to all players
- Statistics track number of reshuffles per session

### 7.4 Side Bet Calculation Logic

Each side bet has its own evaluator function:

```javascript
// In SideBets.js
class SideBetCalculator {
  
  static evaluatePerfectPairs(hand) {
    if (hand.cards.length !== 2) return 0;
    const [card1, card2] = hand.cards;
    
    if (card1.rank !== card2.rank) return 0;
    
    if (card1.suit === card2.suit) return 25; // Perfect pair
    if (this.sameColor(card1, card2)) return 12; // Colored pair
    return 6; // Mixed pair
  }
  
  static evaluateBustIt(dealerHand) {
    if (dealerHand.value <= 21) return 0;
    
    const cardCount = dealerHand.cards.length;
    const payouts = {
      3: 2,
      4: 4,
      5: 15,
      6: 50,
      7: 100,
      8: 250
    };
    
    return payouts[cardCount] || payouts[8]; // 8+ cards pays 250:1
  }
  
  static evaluate21Plus3(playerCards, dealerUpCard) {
    // Combine first two player cards with dealer upcard
    const threeCards = [...playerCards.slice(0, 2), dealerUpCard];
    
    // Check for suited three of a kind
    if (this.isSuitedThreeOfKind(threeCards)) return 100;
    
    // Check for straight flush
    if (this.isStraightFlush(threeCards)) return 40;
    
    // Check for three of a kind
    if (this.isThreeOfKind(threeCards)) return 30;
    
    // Check for straight
    if (this.isStraight(threeCards)) return 10;
    
    // Check for flush
    if (this.isFlush(threeCards)) return 5;
    
    return 0; // No winning combination
  }
  
  static sameColor(card1, card2) {
    const redSuits = ['hearts', 'diamonds'];
    return redSuits.includes(card1.suit) === redSuits.includes(card2.suit);
  }
  
  static isSuitedThreeOfKind(cards) {
    // All same rank and same suit
    return cards.every(c => c.rank === cards[0].rank && c.suit === cards[0].suit);
  }
  
  static isThreeOfKind(cards) {
    return cards.every(c => c.rank === cards[0].rank);
  }
  
  static isFlush(cards) {
    return cards.every(c => c.suit === cards[0].suit);
  }
  
  static isStraightFlush(cards) {
    return this.isStraight(cards) && this.isFlush(cards);
  }
  
  static isStraight(cards) {
    // Convert ranks to numeric values for straight checking
    // Handle Ace as both 1 and 14
    // Implementation details for poker straight logic
  }
}
```

**Adding New Side Bets:**

1. Add evaluation function to `SideBetCalculator`
2. Add payout table constant
3. Add UI element in betting panel
4. Add info modal with rules
5. Update socket events to include new side bet
6. Test all scenarios

### 7.5 ngrok Setup

**Starting the Server with ngrok (Hardcoded Config):**

```javascript
// In server/index.js
const ngrok = require('ngrok');

const PORT = 3000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  try {
    const url = await ngrok.connect(PORT);
    console.log('\n========================================');
    console.log('🎰 Blackjack Game Server Started!');
    console.log('========================================');
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Public URL: ${url}`);
    console.log('========================================\n');
    console.log('Share the public URL with players!');
    console.log('Type /info to see URL again');
    console.log('Type /help for list of commands\n');
  } catch (error) {
    console.error('Error creating ngrok tunnel:', error);
  }
});
```

**Note:**

- No environment variables - all configuration hardcoded
- ngrok free tier: 2-hour session limits
- For longer sessions: Create free ngrok account (8-hour sessions)
- Simple and sufficient for friend group gaming

---

## 8. UI/UX Design Specifications

### 8.1 Visual Design Guidelines

**Color Scheme (Minimal Dark Theme):**

- Background: `#1a1a1a` (dark gray)
- Cards: `#ffffff` (white) with subtle shadow
- Text: `#e0e0e0` (light gray) - **no colored suits**
- Accent (bets, wins): `#4CAF50` (green)
- Warning (losses): `#f44336` (red)
- Neutral (actions): `#2196F3` (blue)
- Highlight (current player): `#FFC107` (amber glow)

**Typography:**

- Headers: Sans-serif, bold, 1.5rem
- Body: Sans-serif, 1rem
- Card values: Monospace, 1.2rem

**Component Design:**

**Button States:**

```css
.btn {
  background: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
}

.btn:hover { background: #1976D2; }
.btn:disabled { background: #666; opacity: 0.5; }
.btn-primary { background: #4CAF50; }
.btn-danger { background: #f44336; }
.btn-chip { 
  border-radius: 50%; 
  width: 60px; 
  height: 60px;
  font-weight: bold;
}
```

**Card Display (Text-based MVP):**

```
┌─────────┐
│ A♠      │
│         │
│    ♠    │  ← Plain text, no color
│         │
│      A♠ │
└─────────┘

Face-down card:
┌─────────┐
│  ???    │
│         │
│    ?    │
│         │
│   ???   │
└─────────┘
```

**Chip Display:**

- Circular buttons for each denomination
- Display chip value in center
- Color-coded by value:
    - $1-$5: White/Gray
    - $10-$50: Blue
    - $100-$500: Green
    - $1000: Gold

**Seat Display:**

```
┌─────────────────┐
│ Alice ($850)    │  ← Player name and bankroll (click to expand)
│ Bet: $50        │  ← Current bet
│ [A♠] [K♥]       │  ← Cards (when dealt) - plain text
│ Hand: 21 ⭐     │  ← Hand value + status icon
│ ● STAND         │  ← Status indicator
└─────────────────┘

Current player gets amber glow/highlight
```

### 8.2 Responsive Design

**Primary Target:** Mobile portrait (< 768px)

- Single column, stacked layout
- Optimized for phone screens
- Always 5 seats displayed regardless of player count
- Touch-friendly button sizes (minimum 44px tap targets)

**Secondary Support:** Landscape and larger screens

- Same layout scaled up
- No special desktop layout (not a priority)
- Maintains portrait-optimized design

### 6.3 Information Tooltips

**Side Bet Info Modal:**

```
┌────────────────────────────┐
│ ℹ Perfect Pairs            │
│────────────────────────────│
│ Your first two cards are   │
│ a pair.                    │
│                            │
│ Payouts:                   │
│ • Perfect Pair: 25:1       │
│ • Colored Pair: 12:1       │
│ • Mixed Pair: 6:1          │
│                            │
│        [Got it]            │
└────────────────────────────┘
```

Similar modals for all side bets, accessible via small info icons next to bet options.

---

## 9. Development Roadmap

**Note:** This is a guideline for logical implementation order. Development will be iterative and flexible based on what makes sense as you build.

### Week 1: Setup & Core Architecture

- [ ] Initialize Node.js project with dependencies
- [ ] Set up Express server and Socket.IO
- [ ] Implement ngrok integration (hardcoded config)
- [ ] Create basic HTML structure for host and client pages
- [ ] Build host configuration page with all settings
- [ ] Create admin console command framework
- [ ] Build Deck class with shuffle and draw functionality
- [ ] Implement deck reshuffle logic and notification
- [ ] Test local multiplayer connection (2 devices)

### Week 2: Game Logic & Lobby

- [ ] Implement GameRoom class (state management)
- [ ] Build Player and Dealer classes
- [ ] Create seat assignment system (always 5 seats)
- [ ] Implement host transfer system
- [ ] Build ready check system
- [ ] Create GameRules engine (hand evaluation, blackjack detection)
- [ ] Implement split handling (indefinite re-splits)
- [ ] Add insurance logic
- [ ] Implement all admin console commands
- [ ] Add test mode with pre-dealt cards

### Week 3: Gameplay Loop

- [ ] Build betting phase with 30-second timer
- [ ] Implement chip-based betting UI
- [ ] Create bet validation and "ready/unready" system
- [ ] Build dealing mechanism
- [ ] Implement player actions (hit, stand, double, split)
- [ ] Add pre-action selection feature
- [ ] Add dealer AI logic (stand on 17)
- [ ] Implement 30-second action timer with auto-stand
- [ ] Build player turn rotation system

### Week 4: Side Bets, Statistics & Polish

- [ ] Implement Perfect Pairs calculation
- [ ] Implement Bust It calculation with card count tracker
- [ ] Implement 21+3 calculation
- [ ] Add side bet UI with info modals/tooltips
- [ ] Build statistics tracking system
- [ ] Implement statistics export functionality
- [ ] Add player info detail view (click to expand)
- [ ] Build result display with side bet highlighting
- [ ] Test all win/loss scenarios
- [ ] Bug fixing and edge cases
- [ ] README with setup instructions

### Future Iterations (As Desired)

- Simple card slide animations
- Client-side statistics view button
- Better visual styling
- Custom card sprites (hand-drawn)
- Cloud deployment when ready

---

## 10. Testing Strategy

### 10.1 Manual Testing Scenarios

**Connection Testing:**

- [ ] Host starts server successfully with ngrok URL
- [ ] Host joins as first player and gets host privileges
- [ ] Player joins with valid URL
- [ ] 5 players can join simultaneously (all 5 seats filled)
- [ ] 6th player is rejected with notification
- [ ] Host can transfer privileges by clicking player
- [ ] Host disconnect auto-transfers privileges
- [ ] Player disconnect during turn (hand auto-stands)
- [ ] Player cannot reconnect mid-game

**Configuration Testing:**

- [ ] All host settings save correctly
- [ ] Default values display properly
- [ ] Min/max bet validation works
- [ ] Payout ratio settings apply correctly
- [ ] Split Aces toggle works
- [ ] Settings lock after game starts

**Betting Phase Testing:**

- [ ] All chip denominations work ($1-$1000)
- [ ] Back/Reset buttons function correctly
- [ ] Cannot bet more than bankroll (shows notification)
- [ ] Can change bet before marking ready
- [ ] Must unready before changing bet
- [ ] 30-second timer counts down
- [ ] Host can manually start if all ready
- [ ] Timeout auto-folds players who didn't bet
- [ ] Side bets place correctly
- [ ] Side bet info modals display properly

**Gameplay Testing:**

- [ ] Cards dealt correctly to all players
- [ ] Dealer shows one face-up, one face-down
- [ ] Dealer card count tracker displays
- [ ] Player actions execute correctly (hit, stand, double, split)
- [ ] 30-second action timer works
- [ ] Timeout auto-stands
- [ ] Pre-action selection works
- [ ] Split creates new hands correctly
- [ ] Can re-split indefinitely
- [ ] Can double after split
- [ ] Dealer logic follows stand-on-17 rule
- [ ] Insurance offered when dealer shows Ace
- [ ] All players see all cards in real-time

**Edge Cases:**

- [ ] Player goes all-in
- [ ] Player runs out of money (marked eliminated, can spectate)
- [ ] Dealer blackjack with insurance
- [ ] Multiple splits in one hand
- [ ] Double down on split hands
- [ ] All players bust (everyone loses)
- [ ] Everyone gets blackjack (everyone paid)
- [ ] Deck reshuffle mid-round (if empty)
- [ ] Deck reshuffle notification displays
- [ ] Split Aces = Blackjack toggle respected

**Side Bet Testing:**

- [ ] Perfect Pairs: all three types pay correctly
- [ ] Bust It: all bust scenarios pay correctly
- [ ] 21+3: all poker hands pay correctly
- [ ] Side bets lost when not winning
- [ ] Winning side bets highlighted in results

**Statistics & Admin Testing:**

- [ ] /stats command shows session statistics
- [ ] /stats [player] shows player stats
- [ ] /export creates JSON file
- [ ] /history shows hand history
- [ ] /test-mode enables pre-dealt cards
- [ ] /deal command works in test mode
- [ ] All admin commands function properly
- [ ] Statistics track correctly throughout session

**Player Info Testing:**

- [ ] Click seat to view detailed player info
- [ ] Info shows all bets, cards, bankroll
- [ ] Split hands display clearly in info view
- [ ] Enlarge button works for split hands

### 10.2 Cross-device Testing

- [ ] iPhone Safari (portrait)
- [ ] Android Chrome (portrait)
- [ ] iPad Safari (portrait)
- [ ] Desktop Chrome (scaled mobile view)
- [ ] Desktop Firefox (scaled mobile view)
- [ ] Test with multiple tabs (same player, allowed)

---

## 11. Deployment Options

### 11.1 Current Solution (Local + ngrok)

**Pros:**

- No hosting costs
- Full control
- Works immediately
- No port forwarding needed
- Simple hardcoded configuration

**Cons:**

- Requires host laptop to be running
- ngrok free tier has 2-hour session limits
- Connection depends on host's internet

**Setup Steps:**

1. Install ngrok: `npm install ngrok`
2. Run server: `node server/index.js`
3. Share generated ngrok URL with players
4. For longer sessions: Create free ngrok account (extends to 8-hour sessions)

**This is sufficient for friend group gaming sessions**

### 11.2 Future Cloud Deployment (When Ready)

When you want to move off laptop hosting:

**Option 1: Railway (Recommended)**

- Free tier available
- Easy GitHub integration
- Automatic deployments
- WebSocket support
- Custom domains

**Option 2: Render**

- Free tier with limitations
- Simple setup

**Option 3: Heroku**

- Paid plans (no longer free tier)
- Most documentation available
- Well-tested for Socket.IO

**Migration Effort:** Minimal - mostly configuration changes, no code rewrite needed.

**Not Currently Planned:** No immediate plans to deploy to cloud, local hosting is sufficient.

---

## 12. Code Quality & Best Practices

### 12.1 Code Organization

- Separate concerns: game logic, UI, networking
- Use classes for game entities (Player, Dealer, Deck, GameRoom)
- Keep functions small and focused
- **Minimal comments** - prefer clean, self-explanatory code
- Comment only complex logic (especially side bet calculations)

### 12.2 Code Style

- **Vanilla JavaScript** - no TypeScript or frameworks
- Clean code over verbose documentation
- Consistent naming conventions
- No strict formatting requirements (use what feels natural)
- Focus on readability

### 12.3 Error Handling

- Validate all player inputs (bet amounts, actions)
- Handle disconnections gracefully
- Log errors server-side for debugging (visible to admin console)
- Show user-friendly error messages via notifications client-side
- Never trust client input - validate everything server-side

### 12.4 Security Considerations

- **Validate all player actions server-side** (never trust client)
- Prevent players from betting more than bankroll
- Ensure only current player can take actions
- No anti-cheat measures needed (friend group only)
- Simple random number generation is sufficient (no cryptographic RNG)
- Players can open multiple tabs/devices if desired (useful for testing)

---

## 13. Dependencies

### 13.1 Server Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "ngrok": "^5.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js"
  }
}
```

### 13.2 Client Dependencies

- Socket.IO client (CDN): `https://cdn.socket.io/4.6.1/socket.io.min.js`
- **No build process needed** - vanilla JavaScript
- **No npm packages** - everything via CDN or plain JS

---

## 14. Project Completion Criteria

### Current Limitations

- No persistent storage (sessions reset on server restart)
- ngrok free tier has time limits
- No chat feature yet
- Basic graphics (text-based cards)
- No sound effects
- No animations

### Planned Improvements

- Card animation system (modular, easy to add)
- Sprite system for custom card designs
- Cloud deployment for 24/7 availability
- Optional chat feature
- Game statistics and history
- Tournament mode

### Extensibility Notes

- Deck count can be changed via constant in `Deck.js`
- Side bets are modular - easy to add new ones
- Visual theme can be swapped by changing CSS files
- Game rules adjustable in `GameRules.js` constants

### 14.1 MVP Success Criteria (Must-Have)

- [ ] 5 players can connect and play simultaneously without errors
- [ ] Full blackjack round completes successfully (bet → deal → play → resolve)
- [ ] All basic blackjack actions work (hit, stand, double, split with re-splits)
- [ ] All 3 side bets implemented and paying correctly
- [ ] Dealer card count visible for Bust It tracking
- [ ] Mobile UI usable on phone in portrait mode
- [ ] Host can configure all settings before game
- [ ] 30-second timers work for betting and actions
- [ ] Chip-based betting system functions properly
- [ ] Statistics tracking and export working
- [ ] Test mode available for admin
- [ ] Console commands functional

### 14.2 Learning Objectives

- [x] Understand WebSocket real-time communication
- [ ] Implement game state management across multiple clients
- [ ] Build responsive mobile-first UI
- [ ] Handle multiplayer synchronization challenges
- [ ] Deploy local server accessible over internet (via ngrok)
- [ ] Create modular, extensible architecture
- [ ] Implement timing and turn-based gameplay
- [ ] Build admin/console command system

### 14.3 "Done" Definition

The project is considered complete when:

1. You and 4 friends can play a full game session
2. All core blackjack rules work correctly
3. Side bets function and pay properly
4. The game is fun and playable on mobile phones
5. Statistics can be exported for review
6. No game-breaking bugs exist

**Additional polish is optional and can be added iteratively**

---

## 15. Known Limitations & Future Considerations

### Current Limitations

- No persistent storage (sessions reset on server restart)
- ngrok free tier has 2-hour session limits
- No animations (planned for Phase 2)
- Basic text-based cards
- No sound effects (not planned)
- No haptic feedback (not planned)
- No chat feature (not planned currently)
- Manual testing only (no automated tests)

### Intentional Design Decisions (Not Limitations)

- Players can open multiple tabs/devices (useful for testing)
- No anti-cheat measures (friend group only)
- Simple RNG (not cryptographic)
- No pause functionality
- Settings locked after game starts
- No mid-game joining
- Bankrupt players can spectate but not rebuy
- Host cannot give players chips

### Future Improvements (If Desired)

- Card animation system (modular, easy to add)
- Sprite system for custom card designs
- Cloud deployment for 24/7 availability
- Client-side statistics view
- More side bets (architecture supports easy addition)
- Chat feature
- Quick reactions/emojis

### Extensibility Notes

- Deck count changeable via constant in `Deck.js`
- Payout ratios configurable by host before game
- Side bets are modular - easy to add new ones
- Visual theme can be swapped by changing CSS files
- Game rules adjustable in `GameRules.js` constants
- Statistics system tracks comprehensive data
- Test mode allows scenario testing

---

## 16. Getting Started - Quick Start Guide

### 16.1 For the Developer (You)

**Initial Setup:**

```bash
# Create project directory
mkdir blackjack-game
cd blackjack-game

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express socket.io ngrok
npm install --save-dev nodemon

# Create folder structure
mkdir -p server/game server/admin server/utils server/exports
mkdir -p client/css client/js client/assets
```

**Update package.json scripts:**

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js"
  }
}
```

**First Development Session:**

1. Start with server setup (Express + Socket.IO)
2. Add ngrok integration (hardcoded)
3. Create basic host configuration page
4. Implement player join system
5. Test with two devices on local network
6. Test with ngrok for external connection

**Daily Development Flow:**

1. Start server: `npm run dev` (nodemon for auto-restart)
2. Copy ngrok URL from console
3. Open host page in browser
4. Connect test device to ngrok URL
5. Implement feature
6. Test with real devices
7. Commit changes

**Admin Console:**

- Server runs with console input enabled
- Type commands directly in terminal running the server
- Use `/help` to see available commands
- Use `/test-mode` and `/deal` for scenario testing
- Use `/stats` and `/export` for statistics

### 16.2 For Players

**How to Join a Game:**

1. Host sends you a link (looks like: `https://abc123.ngrok-free.app`)
2. Open link on your phone/computer browser
3. Enter your name
4. Wait in lobby for other players
5. Host will start game when ready
6. Play blackjack!

**Basic Gameplay:**

1. Place bet using chip buttons ($1-$1000)
2. Optionally add side bets
3. Click "Ready" when bet placed
4. Receive two cards
5. Wait for your turn (you'll be highlighted)
6. Choose: Hit, Stand, Double, or Split
7. See results and winnings
8. Repeat!

---

## 17. Success Metrics & Completion

### MVP Success Criteria (Must-Have)

- [ ] 5 players can connect and play simultaneously without errors
- [ ] Full blackjack round completes successfully (bet → deal → play → resolve)
- [ ] All basic blackjack actions work (hit, stand, double, split with re-splits)
- [ ] All 3 side bets implemented and paying correctly
- [ ] Dealer card count visible for Bust It tracking
- [ ] Mobile UI usable on phone in portrait mode
- [ ] Host can configure all settings before game
- [ ] 30-second timers work for betting and actions
- [ ] Chip-based betting system functions properly
- [ ] Statistics tracking and export working
- [ ] Test mode available for admin
- [ ] Console commands functional

### Learning Objectives

- [x] Understand WebSocket real-time communication
- [ ] Implement game state management across multiple clients
- [ ] Build responsive mobile-first UI
- [ ] Handle multiplayer synchronization challenges
- [ ] Deploy local server accessible over internet (via ngrok)
- [ ] Create modular, extensible architecture
- [ ] Implement timing and turn-based gameplay
- [ ] Build admin/console command system

### "Done" Definition

The project is considered complete when:

1. You and 4 friends can play a full game session
2. All core blackjack rules work correctly
3. Side bets function and pay properly
4. The game is fun and playable on mobile phones
5. Statistics can be exported for review
6. No game-breaking bugs exist

**Additional polish is optional and can be added iteratively**

---

## 18. Resources & Documentation

### Official Documentation

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [ngrok Documentation](https://ngrok.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/) - JavaScript reference

### Blackjack References

- [Betway Blackjack Rules](https://www.betway.com/en/casino/blackjack) - Base rules
- Side bet payout tables (documented in this spec)
- Standard casino blackjack procedures

### Helpful Concepts

- WebSocket real-time communication
- Game state synchronization
- Turn-based multiplayer systems
- Mobile-first responsive design
- CSS Grid for card game layouts

---

## 19. Summary & Next Steps

### What This Spec Provides

✅ **Complete technical architecture** - Server, client, networking  
✅ **Detailed game rules** - All blackjack rules, splits, insurance, side bets  
✅ **UI/UX specifications** - Mobile-first design, layout, interactions  
✅ **Implementation roadmap** - 4-week development plan  
✅ **Testing strategy** - Comprehensive test scenarios  
✅ **Statistics system** - Tracking, export, analysis  
✅ **Admin tools** - Console commands, test mode  
✅ **Extensibility** - Easy to add features, modify rules, change visuals

### Ready to Build

This specification is comprehensive enough to:

1. Feed back to AI assistants for implementation help
2. Keep you organized during development
3. Serve as complete project documentation
4. Guide testing and deployment
5. Support future enhancements

### Recommended First Steps

1. **Set up project structure** (Week 1, Day 1)
2. **Get basic server running** with ngrok (Week 1, Day 1-2)
3. **Test connection** with two devices (Week 1, Day 2)
4. **Build incrementally** following the roadmap
5. **Test frequently** with real devices

### Key Success Factors

- Keep scope focused on MVP
- Test with real devices often
- Build iteratively - one feature at a time
- Use admin tools for testing edge cases
- Don't worry about perfection - get it playable first
- Add polish later as desired

### When You Need Help

This spec should answer most questions, but you can:

- Reference specific sections when asking AI for help
- Use the detailed event structure for Socket.IO implementation
- Follow the game state structure for state management
- Reference the UI mockups for layout
- Use test scenarios for validation

**You're ready to start building! Good luck and have fun!** 🎰♠️♥️♣️♦️

---

## Appendix A: Quick Reference

### File Structure

```
blackjack-game/
├── server/
│   ├── index.js
│   ├── game/ (GameRoom, Deck, Player, Dealer, GameRules, SideBets)
│   ├── admin/ (AdminCommands, Statistics, TestMode)
│   ├── utils/ (helpers)
│   └── exports/ (statistics JSON files)
├── client/
│   ├── index.html (player interface)
│   ├── host.html (host config)
│   ├── css/ (styles)
│   └── js/ (client logic)
└── package.json
```

### Key Constants to Configure

```javascript
// Deck.js
const DECK_COUNT = 6;

// GameRules.js
const DEALER_STANDS_ON = 17;
const BLACKJACK_PAYOUT_DEFAULT = "3:2";
const INSURANCE_PAYOUT_DEFAULT = "2:1";

// GameRoom.js
const BETTING_TIME_LIMIT = 30;
const ACTION_TIME_LIMIT = 30;
const MAX_SEATS = 5;
const DEFAULT_STARTING_BANKROLL = 1000;
const DEFAULT_MIN_BET = 10;
const DEFAULT_MAX_BET = 500;

// SideBets.js
const PERFECT_PAIR_PAYOUT = 25;
const COLORED_PAIR_PAYOUT = 12;
const MIXED_PAIR_PAYOUT = 6;
// (and all other side bet payouts)
```

### Admin Commands Cheat Sheet

```
/start              - Force start game
/end                - End game session
/kick [player]      - Kick player
/transfer [player]  - Transfer host
/test-mode on/off   - Toggle test mode
/deal [cards]       - Pre-deal cards (test mode)
/stats              - Show statistics
/stats [player]     - Player stats
/export             - Export stats to JSON
/history [n]        - Show hand history
/info               - Server info
/players            - List players
/url                - Show ngrok URL
/help               - List commands
```

### Chip Denominations

$1, $2, $5, $10, $20, $50, $100, $200, $500, $1000

### Side Bet Payouts Reference

**Perfect Pairs:**

- Perfect (same suit): 25:1
- Colored (same color): 12:1
- Mixed (different color): 6:1

**Bust It:**

- 8+ cards: 250:1
- 7 cards: 100:1
- 6 cards: 50:1
- 5 cards: 15:1
- 4 cards: 4:1
- 3 cards: 2:1

**21+3:**

- Suited Three of a Kind: 100:1
- Straight Flush: 40:1
- Three of a Kind: 30:1
- Straight: 10:1
- Flush: 5:1

---

**END OF SPECIFICATION**

This document is now comprehensive, detailed, and ready to guide your entire development process. Save it, reference it often, and use it to keep your project on track. Happy coding! 🎰


  1. Bet Presets & Quick Actions

  - Add "Min Bet", "Max Bet", "Last Bet", "Clear All" buttons in the betting overlay
  - Makes betting much faster, especially for repeat players

  2. Keyboard Shortcuts

  - H = Hit, S = Stand, D = Double Down, P = Split
  - Enter = Ready/Confirm, Esc = Cancel/Close
  - Space = Place Bet
  - Show shortcuts in tooltips

  3. Game Statistics Panel

  - Track: Total rounds played, Wins/Losses/Pushes, Win rate
  - Biggest win, Current streak, Total profit/loss
  - Toggle button in header to show/hide stats

  4. Sound Effects

  - Card dealing sounds
  - Chip placement clicks
  - Win/lose chimes
  - Mute button in header

  5. Better Turn Indicators

  - Pulse/glow effect on current player's seat
  - Larger "YOUR TURN" banner
  - Sound notification when it's your turn

  6. Auto-Ready Toggle

  - Setting to automatically mark ready after placing bet
  - Saves one click every round

  7. Confirmation Dialogs

  - "Are you sure?" before sitting out
  - Confirm large bet amounts
  - Confirm before leaving game

  8. Bet Memory

  - "Repeat Last Bet" button
  - Remembers your bet configuration from previous round
  - Option to auto-fill same bet

  9. Hand Value Always Visible

  - Show hand total prominently on each player card area
  - Soft/Hard indicator (e.g., "Soft 17" vs "17")

  10. Quick Rebuy

  - When eliminated, show "Rejoin with $1000" button
  - No need to go through full join process

  🎨 Polish Features:

  11. Tooltips - Hover over buttons for descriptions
  12. Win/Loss Streak Display - Show current streak in header
  13. Table Theme Options - Choose table felt color
  14. Countdown Animations - Visual timer with progress bar
  15. Card Flip Animations - Smooth card reveal effects
  16. Chip Animation - Chips fly to betting area
  17. Copy Room Link - Share with friends (if applicable)
  18. Recent History - Last 5-10 rounds results

  Which of these sound most interesting to you? I'd recommend starting with:
  1. Bet Presets (huge time saver)
  2. Keyboard Shortcuts (for power users)
  3. Game Stats (engagement and tracking)
  4. Better Turn Indicators (clarity)

  Want me to implement any of these?