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

**New to this?** See [SETUP.md](SETUP.md) for a beginner-friendly step-by-step guide.

### Prerequisites
- Node.js (v14 or higher)
- npm
- ngrok account (free) - [Sign up here](https://ngrok.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/KyleMcCalgan/Blackjack
cd Blackjack

# Install dependencies
npm install
```

### Setting Up Ngrok

Ngrok creates a secure tunnel to your local server, allowing friends to connect from anywhere without port forwarding.

#### Step 1: Get Your Ngrok Authtoken

1. Go to [https://ngrok.com](https://ngrok.com) and sign up for a free account
2. After signing in, go to [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Copy your authtoken (looks like: `2abc...xyz123`)

#### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   # Mac/Linux
   cp .env.example .env

   # Windows (Command Prompt)
   copy .env.example .env

   # Windows (PowerShell)
   Copy-Item .env.example .env
   ```

2. Open `.env` in a text editor (Notepad, VS Code, etc.) and replace the placeholder with your ngrok authtoken:
   ```
   NGROK_AUTHTOKEN=your_actual_ngrok_authtoken_here
   ```
   **Note**: Don't use quotes around the token

#### Step 3: Start the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Or production mode
npm start
```

The server will start and display:
- **Local URL**: `http://localhost:3000` (for testing on your own computer)
- **Public URL**: An ngrok URL like `https://abc123.ngrok-free.app` (share this with friends!)

**Important**: Keep the terminal window running while you play. Closing it will shut down the server.

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

## Troubleshooting

### "NGROK_AUTHTOKEN not found in .env file"
- Make sure you created a `.env` file (not `.env.example`)
- Verify the file contains `NGROK_AUTHTOKEN=your_token_here`
- Check that there are no quotes around the token
- Restart the server after editing `.env`

### "ngrok connection failed"
- Verify your internet connection is working
- Check that your authtoken is valid at [ngrok dashboard](https://dashboard.ngrok.com)
- Free ngrok accounts work fine - no paid plan needed
- If using a VPN, try disconnecting temporarily

### Players can't connect
- Make sure you're sharing the **ngrok URL** (https://...), not localhost
- Verify the server is still running (terminal window open)
- Check that players are using the exact URL shown in the terminal
- Ngrok free URLs change each time you restart - share the new URL

### "Port 3000 is already in use"
- Another application is using port 3000
- Either close that application or modify `PORT` in `server/index.js`

### Local-only mode (no internet access)
If ngrok fails, the server runs in local-only mode:
- Host can access at `http://localhost:3000`
- Only devices on the same WiFi network can join using the host computer's local IP
- Find local IP: Windows: `ipconfig`, Mac/Linux: `ifconfig`
- Players connect to `http://[your-local-ip]:3000`

## Hosting Options

### Option 1: Run from Your Computer (Recommended for Casual Play)
- Easiest setup using ngrok (see Quick Start above)
- Free with no recurring costs
- Computer must stay on while playing
- URL changes each time you restart

### Option 2: Cloud Hosting (For Permanent Access)

#### Heroku (Free Tier Available)
```bash
# Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku create your-blackjack-app
git push heroku main
```

#### Railway / Render / DigitalOcean
- Follow platform-specific Node.js deployment guides
- Set `NGROK_AUTHTOKEN` as an environment variable (or disable ngrok for cloud hosting)
- Ensure WebSocket support is enabled

#### VPS (Advanced)
If you have a VPS with a public IP:
1. Clone the repository
2. Install Node.js
3. Run `npm install` and `npm start`
4. Access directly via your server's IP (no ngrok needed)
5. Consider using PM2 for process management: `npm install -g pm2 && pm2 start server/index.js`

## Development Status

🚧 **In Development** - This is a learning project

See [Context.md](blackjack-game-spec.md) for complete project specification and roadmap.

## Contributing

This is a personal learning project, but feel free to fork and experiment!