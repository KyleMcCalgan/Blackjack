# Multiplayer Blackjack Web Game 🎰

A real-time multiplayer blackjack game built with Node.js and Socket.IO. Host games from your laptop and let friends join from any device.

## Features

- **Up to 5 players** simultaneously
- **Mobile-friendly** portrait interface
- **Real-time gameplay** with WebSocket synchronization
- **Side bets**: Perfect Pairs, Bust It, 21+3
- **Flexible rules**: Configurable deck count, bet limits, payouts
- **Statistics tracking** and export
- **Admin console** with test mode and commands
- **No port forwarding needed** - uses ngrok for external access

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/KyleMcCalgan/Blackjack
cd blackjack-game

# Install dependencies
npm install

# Start the server
npm run dev
```

The server will start and display an ngrok URL. Share this URL with players to let them join!

## How to Play

### For Host
1. Run `npm run dev`
2. Open the host configuration page
3. Set starting bankroll, bet limits, and rules
4. Share the ngrok URL with friends
5. Start the game when everyone's joined

### For Players
1. Open the URL shared by the host
2. Enter your name
3. Place bets using chip buttons ($1-$1000)
4. Play blackjack - hit, stand, double, or split
5. Win money!

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Networking**: ngrok (no port forwarding required)

## Game Rules

- Dealer stands on 17
- Blackjack pays 3:2 (configurable)
- Unlimited re-splits allowed
- Double down on any two cards
- Insurance available when dealer shows Ace

## Admin Commands

Type these in the server console:

```
/stats              - View session statistics
/export             - Export stats to JSON
/test-mode on       - Enable test mode with pre-dealt cards
/kick [player]      - Remove a player
/help               - List all commands
```

## Development Status

🚧 **In Development** - This is a learning project

See [Context.md](blackjack-game-spec.md) for complete project specification and roadmap.


## Contributing

This is a personal learning project, but feel free to fork and experiment!