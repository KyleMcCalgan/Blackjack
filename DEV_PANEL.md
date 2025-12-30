# Dev Admin Panel Documentation

The Dev Admin Panel is a web-based interface for remotely controlling and testing your Blackjack game server. Access it from any device - including your phone!

## Table of Contents
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Accessing the Panel](#accessing-the-panel)
- [Panel Overview](#panel-overview)
- [Game Control](#game-control)
- [Test Mode](#test-mode)
- [Forcing Specific Cards](#forcing-specific-cards)
- [Preset Scenarios](#preset-scenarios)
- [Statistics & Monitoring](#statistics--monitoring)
- [Command Reference](#command-reference)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Set Your Access Key

Edit `.env` file:
```env
DEV_PANEL_KEY=your_secret_key_here
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Access the Panel

**On your computer:**
```
http://localhost:3000/dev?key=your_secret_key_here
```

**On your phone (via ngrok):**
```
https://your-ngrok-url.ngrok.io/dev?key=your_secret_key_here
```

**Bookmark this URL on your phone for quick access!**

---

## Setup

### Environment Variables

Add to your `.env` file:

```env
# Dev Admin Panel Access Key
DEV_PANEL_KEY=change_this_to_something_secure
```

**Security Notes:**
- Change the default `dev123` key to something unique
- Never commit your `.env` file to version control
- Share the key only with trusted users

### First Time Setup

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Find your URLs:**
   - Check terminal output for ngrok URL
   - Note the dev panel path: `/dev?key=your_key`

3. **Test access:**
   - Open `http://localhost:3000/dev?key=your_key`
   - Verify authentication works
   - Bookmark for future use

---

## Accessing the Panel

### URL Format

```
[base_url]/dev?key=[your_access_key]
```

### Examples

**Local testing:**
```
http://localhost:3000/dev?key=dev123
```

**Remote access via ngrok:**
```
https://unscreened-juana-aeronautically.ngrok-free.dev/dev?key=dev123
```

### Authentication

When you navigate to the dev panel:
1. Enter your access key (or it auto-fills from URL)
2. Click "Unlock"
3. Server validates your key
4. Access granted if key matches `.env` setting

**If authentication fails:**
- Check your `.env` file has `DEV_PANEL_KEY` set
- Verify you're using the correct key
- Restart the server after changing `.env`

---

## Panel Overview

The dev panel has 6 main sections:

### 1. Header
- Shows connection status
- Displays current session ID
- Real-time connection indicator

### 2. Game Control
- Start/stop games
- Kick players
- Transfer host privileges
- Execute custom commands

### 3. Server Info
- Current game phase
- Round number
- Player count
- Server URLs
- Configuration settings

### 4. Testing & Debug
- Enable/disable test mode
- Set pre-dealt cards
- Load preset scenarios
- Manual phase advancement
- Debug state inspection

### 5. Statistics
- View session stats
- Export data
- Hand history
- Clear statistics

### 6. Live Server Logs
- Real-time server output
- Color-coded message types
- Scrollable log history
- Clear logs button

---

## Game Control

### Start/Stop Games

**Start Game:**
```
Button: "Start Game"
Command: /start
```
- Starts the game immediately
- Works regardless of who's host
- Bypasses normal host-only restrictions

**End Game:**
```
Button: "End Game"
Command: /end
```
- Ends current game session
- Returns all players to lobby
- Preserves player bankrolls

### Player Management

**Kick Player:**
```
Button: "Kick Player" → Enter name or seat number
Command: /kick PlayerName
Command: /kick 2
```
- Removes player from game
- Player's client returns to join screen
- Host transfers to next player if needed

**Transfer Host:**
```
Button: "Transfer Host" → Enter name or seat number
Command: /transfer PlayerName
Command: /transfer 3
```
- Gives host privileges to specified player
- Original host loses privileges
- New host gets start button immediately

### Custom Commands

Use the "Custom Command" input to run any server command:

```
/info               - Server information
/players            - List all players
/state              - View game state JSON
/config             - Show configuration
```

---

## Test Mode

Test mode allows you to control exactly which cards are dealt, perfect for testing specific game scenarios.

### How It Works

Test mode **intercepts** the deck's card drawing system:
1. You specify a sequence of cards
2. Game deals YOUR cards in order
3. After your cards run out, normal random dealing resumes
4. Cards are dealt in player/dealer rotation order

### Enabling Test Mode

**Via Dev Panel:**
```
Click: "Test Mode ON"
```

**Via Command:**
```
/test-mode on
```

**Output:**
```
Test mode enabled. Use /deal to specify cards.
```

### Disabling Test Mode

```
Click: "Test Mode OFF"
Command: /test-mode off
```

### Check Test Mode Status

```
Command: /test-mode
```

**Output shows:**
```
Test mode: ON
Autoplay: ON
Cards set: 6
Cards dealt: 2
Cards remaining: 4
```

---

## Forcing Specific Cards

### Card Format

**Structure:** `[Rank][Suit]`

**Ranks:**
- `A` - Ace
- `2-9` - Number cards
- `10` - Ten
- `J` - Jack
- `Q` - Queen
- `K` - King

**Suits:**
- `H` - Hearts ♥
- `D` - Diamonds ♦
- `C` - Clubs ♣
- `S` - Spades ♠

**Examples:**
```
AS  - Ace of Spades ♠
KH  - King of Hearts ♥
10D - Ten of Diamonds ♦
7C  - Seven of Clubs ♣
```

### Setting Cards

**Via Dev Panel:**
1. Enable Test Mode
2. Type cards in "Deal Cards" input: `AS KH 10D 7C`
3. Click "Deal Cards"

**Via Command:**
```
/deal AS KH 10D 7C 9S 8H
```

**Output:**
```
Set 6 pre-dealt cards: A♠, K♥, 10♦, 7♣, 9♠, 8♥
```

### Clearing Cards (Return to Random Dealing)

Once you've set specific cards, you can return to random dealing **without** disabling test mode:

**Via Command:**
```
/deal clear
```

**Or:**
```
/deal random
```

**Output:**
```
Pre-dealt cards cleared - Random dealing restored
```

**What this does:**
- Clears all pre-dealt cards
- Next round will use random deck dealing
- Test mode stays enabled (useful for re-setting cards later)
- If you want to completely disable test mode, use `/test-mode off`

**Example workflow:**
```bash
/test-mode on
/deal AS KH 7D 10D    # Test with specific cards
/ready                # Play round 1 with those cards
/deal clear           # Clear cards
/ready                # Play round 2 with random cards
/deal 10H 10D 7S KH   # Set new specific cards
/ready                # Play round 3 with new cards
```

### Card Dealing Order

For a **single player** game:
```
Card 1: Player's first card
Card 2: Dealer's first card (face up)
Card 3: Player's second card
Card 4: Dealer's second card (face down)
Card 5+: Additional cards (hits, doubles, etc.)
```

For **multiple players**:
```
Card 1: Player 1's first card
Card 2: Player 2's first card
Card 3: Player 3's first card
Card 4: Dealer's first card
Card 5: Player 1's second card
Card 6: Player 2's second card
Card 7: Player 3's second card
Card 8: Dealer's second card
Card 9+: Additional cards
```

### Example: Give Player Blackjack

**Setup (1 player):**
```
/test-mode on
/deal AS KH 7D 10D
```

**Result:**
- Player gets: A♠ + K♥ = **21 (Blackjack!)**
- Dealer gets: 7♦ + 10♦ = 17
- Player wins with blackjack!

### Example: Force Dealer Bust

**Setup:**
```
/test-mode on
/deal 10H 9D 5S 10C 6H 10S
```

**Result:**
- Player gets: 10♥ + 9♦ = 19 (stands)
- Dealer gets: 5♠ + 10♣ = 15 (must hit)
- Dealer draws: 6♥ = 21 (dealer wins)

Wait, let's fix that:
```
/deal 10H 9D 5S 10C 6H 8S
```
- Dealer gets: 5♠ + 10♣ + 8♠ = 23 (BUST!)
- Player wins!

### Example: Set Up Splitting

**Give player pair of Aces:**
```
/deal AS AH 7D KH QD 9C
```
- Player gets: A♠ + A♥ (can split!)

**Give player pair of 10s:**
```
/deal 10H 10D 7S KH QD 9H
```
- Player gets: 10♥ + 10♦ (can split!)

---

## Preset Scenarios

Built-in scenarios for common testing situations.

### Available Scenarios

#### 1. Blackjack
```
Command: /scenario blackjack
```
**Setup:**
- Player gets: A♠ + K♥ = Blackjack
- Dealer gets: 10♦ + K♦ = 20
- Result: Player wins with blackjack

#### 2. Bust
```
Command: /scenario bust
```
**Setup:**
- Player gets: 10♥ + 7♦ (17), hits 8♠
- Player busts with 25
- Dealer stands on 17

#### 3. Split Aces
```
Command: /scenario split-aces
```
**Setup:**
- Player gets: A♠ + A♥ (pair of aces)
- Perfect for testing split logic

#### 4. Split Tens
```
Command: /scenario split-tens
```
**Setup:**
- Player gets: 10♥ + 10♦ (pair of tens)
- Can split or stand on 20

#### 5. Dealer Bust
```
Command: /scenario dealer-bust
```
**Setup:**
- Player gets decent hand
- Dealer busts with multiple cards
- Tests "Bust It" side bet payout

#### 6. Perfect Pair
```
Command: /scenario perfect-pair
```
**Setup:**
- Player gets: K♥ + K♥ (same rank, same suit)
- Tests "Perfect Pairs" side bet

#### 7. Dealer Blackjack
```
Command: /scenario dealer-blackjack
```
**Setup:**
- Dealer shows Ace (insurance offered)
- Dealer has blackjack
- Tests insurance payout

### Using Scenarios

**Via Dev Panel:**
```
Custom Command: /scenario blackjack
Click: "Execute"
```

**List All Scenarios:**
```
Command: /scenario
```

**Output:**
```
Available scenarios:
  blackjack - Player gets blackjack
  bust - Player busts
  split-aces - Player gets pair of aces
  split-tens - Player gets pair of tens
  dealer-bust - Dealer busts with many cards
  perfect-pair - Player gets perfect pair
  dealer-blackjack - Dealer gets blackjack
```

---

## Autoplay & Manual Control

### Autoplay Mode

**What it does:**
- Game automatically advances through phases
- Normal timing and delays apply
- Default behavior (always on)

**Enable:**
```
Click: "Autoplay ON"
Command: /autoplay on
```

### Manual Mode

**What it does:**
- Game pauses between each phase
- You manually advance with `/next`
- Perfect for step-by-step debugging

**Enable:**
```
Click: "Autoplay OFF"
Command: /autoplay off
```

### Advancing Manually

When autoplay is OFF, use:
```
Click: "Next Phase"
Command: /next
```

**Phase sequence:**
```
lobby → betting → dealing → playing → dealer → results → betting (new round)
```

**Example workflow:**
```bash
/autoplay off           # Enable manual mode
/test-mode on           # Enable test mode
/deal AS KH 7D 10D      # Set cards
/start                  # Start game
# [Players bet]
/next                   # Advance to dealing
# [Cards dealt - see your blackjack!]
/next                   # Advance to playing
/next                   # Advance to dealer
/next                   # Advance to results
```

---

## Statistics & Monitoring

### Session Stats

**View stats:**
```
Click: "Session Stats"
Command: /stats
```

**Shows:**
- Total hands played
- Win/loss/push counts
- Total wagered
- Net profit/loss
- Blackjacks dealt
- Split/double statistics

### Player Stats

**View specific player:**
```
Command: /stats PlayerName
Command: /stats 2
```

### Export Statistics

**Export to JSON:**
```
Click: "Export Stats"
Command: /export
```

**Output:**
```
Statistics exported to: ./stats/session-[timestamp].json
```

### Hand History

**View last 10 hands:**
```
Command: /history
```

**View last N hands:**
```
Command: /history 20
```

### Clear Statistics

**Reset all stats:**
```
Click: "Clear Stats"
Command: /clear-stats
```

---

## Server Information

### View Server Info

**Via Panel:**
- Check "Server Info" section
- Click "Refresh Info"

**Via Command:**
```
Command: /info
```

**Shows:**
- Session ID
- Current phase
- Round number
- Player count
- Local/Public URLs
- Full configuration

### View Configuration

```
Command: /config
```

**Shows:**
- Starting bankroll
- Min/max bets
- Deck count
- Payout ratios
- Rule settings

### View Game State

```
Click: "View State"
Command: /state
```

**Shows JSON:**
```json
{
  "phase": "betting",
  "roundNumber": 3,
  "players": 2,
  "currentPlayer": null,
  "dealerValue": 0,
  "deckRemaining": 298
}
```

### View Players

```
Click: "Refresh Players"
Command: /players
```

**Shows for each player:**
- Name
- Seat number
- Host status
- Bankroll
- Current bet
- Socket ID

---

## Command Reference

### Complete Command List

#### Game Control
```bash
/start                  # Force start game
/end                    # End current game
/kick <player>          # Kick a player by name or seat
/transfer <player>      # Transfer host to player
```

#### Testing & Debug
```bash
/test-mode <on|off>     # Enable/disable test mode
/deal <cards>           # Set pre-dealt cards
/deal clear             # Clear cards, return to random dealing
/scenario <name>        # Load preset scenario
/scenario               # List all scenarios
/autoplay <on|off>      # Toggle auto-advance
/next                   # Manually advance phase
/debug                  # Toggle debug mode
/state                  # View game state JSON
```

#### Statistics
```bash
/stats                  # Session statistics
/stats <player>         # Player-specific stats
/export                 # Export stats to JSON
/history [n]            # Show last n hands (default: 10)
/clear-stats            # Reset all statistics
```

#### Information
```bash
/info                   # Server information
/players                # List all players
/url                    # Show ngrok URL
/config                 # Show configuration
/help                   # List all commands
```

### Command Examples

**Complete test session:**
```bash
/test-mode on
/autoplay off
/deal AS KH 7D 10D 9C 8S
/start
# [wait for players to bet]
/next
# [cards dealt]
/next
# [dealer turn]
/next
# [results shown]
/stats
/export
/test-mode off
/autoplay on
```

**Kick problematic player:**
```bash
/players              # Find player name/seat
/kick TrollPlayer     # Remove them
/transfer GoodPlayer  # Give host to someone else
```

**Debug specific scenario:**
```bash
/state                # Check current state
/scenario dealer-blackjack
/debug                # Enable debug output
/start
```

---

## Best Practices

### Development Workflow

**1. Set up your environment:**
```bash
# .env file
DEV_PANEL_KEY=my_secure_key_12345
NGROK_AUTHTOKEN=your_ngrok_token
```

**2. Start with manual mode:**
```bash
npm run dev
# In dev panel:
/autoplay off
/test-mode on
```

**3. Test incrementally:**
- Set up one scenario at a time
- Use `/next` to step through phases
- Check logs for each action
- Verify behavior before moving on

### Testing Scenarios

**Before a game night:**
```bash
# Test basic gameplay
/scenario blackjack
/start
# [play through]

# Test edge cases
/scenario split-aces
/start
# [test splitting]

# Test insurance
/scenario dealer-blackjack
/start
# [test insurance bets]
```

### Mobile Testing

**1. Bookmark the dev panel URL:**
```
https://your-ngrok-url.ngrok.io/dev?key=your_key
```

**2. Test on phone:**
- Join game on laptop
- Control server from phone
- Verify synchronization
- Test kick/transfer from mobile

**3. Simulate remote players:**
- Open game on multiple devices
- Use dev panel to control flow
- Test disconnections
- Verify state recovery

### Security

**Don't:**
- ❌ Commit `.env` to git
- ❌ Use default `dev123` key in production
- ❌ Share dev panel URL publicly
- ❌ Leave dev panel open on shared screens

**Do:**
- ✅ Change default key immediately
- ✅ Use strong, unique keys
- ✅ Keep `.env` in `.gitignore`
- ✅ Restart server after changing keys

### Debugging Tips

**If commands don't work:**
1. Check server logs in dev panel
2. Verify test mode is enabled
3. Check current phase with `/state`
4. Try `/help` to verify command syntax

**If cards don't appear:**
1. Verify test mode is ON
2. Check card format (e.g., `AS` not `As`)
3. Ensure game has started
4. Check if you set enough cards

**If dev panel won't authenticate:**
1. Check `.env` has `DEV_PANEL_KEY`
2. Verify key matches exactly
3. Restart server after `.env` changes
4. Check browser console for errors

---

## Troubleshooting

### Common Issues

**"Invalid access key"**
- Check `.env` file exists
- Verify `DEV_PANEL_KEY` is set
- Ensure no extra spaces or quotes
- Restart server after editing

**Commands not executing**
- Verify you're connected (check header)
- Check command syntax with `/help`
- Look for errors in live logs
- Try refreshing the page

**Test mode cards not working**
- Enable test mode first: `/test-mode on`
- Use correct card format: `AS KH 10D`
- Set cards before starting game
- Check you set enough cards for all players

**Can't access from phone**
- Use ngrok URL, not localhost
- Include `?key=` in URL
- Check ngrok is running
- Verify key is correct

### Getting Help

**Check logs:**
- Live server logs in dev panel
- Terminal output on server
- Browser console (F12)

**Verify setup:**
```bash
/info           # Check server status
/test-mode      # Check test mode status
/state          # Check game state
```

**Reset everything:**
```bash
/test-mode off
/autoplay on
/end
/start
```

---

## Advanced Features

### Debug Mode

```
Command: /debug
```
- Enables verbose logging
- Shows internal state changes
- Useful for development

### State Inspection

```
Command: /state
```
- View complete game state
- Check player hands
- Verify dealer cards
- Debug synchronization issues

### Multiple Scenarios

Chain scenarios together:
```bash
/scenario blackjack
# [complete round]
/scenario split-aces
# [complete round]
/scenario dealer-bust
```

### Custom Card Sequences

Create complex scenarios:
```bash
# 3 players, specific outcomes
/deal AS KH 9D 8C 7H 6S 10D 10C QH JS 5D 4C
#     P1:A+K  P2:9+8  P3:7+6  D:10+10  (extras)
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│        DEV PANEL QUICK REFERENCE        │
├─────────────────────────────────────────┤
│ Access: /dev?key=your_key               │
│                                         │
│ TEST MODE:                              │
│   /test-mode on     Enable testing      │
│   /deal AS KH 10D   Set cards           │
│   /deal clear       Random dealing      │
│   /scenario <name>  Load preset         │
│                                         │
│ CONTROL:                                │
│   /start            Start game          │
│   /next             Advance phase       │
│   /autoplay off     Manual mode         │
│                                         │
│ PLAYERS:                                │
│   /kick <name>      Remove player       │
│   /transfer <name>  Change host         │
│   /players          List all            │
│                                         │
│ INFO:                                   │
│   /state            Game state          │
│   /stats            Statistics          │
│   /help             All commands        │
└─────────────────────────────────────────┘
```

---

## Examples

### Example 1: Test Blackjack Payout

```bash
# Setup
/test-mode on
/autoplay off
/deal AS KH 7D 10D

# Start and play
/start
# [player bets $100]
/next  # Deal cards - player gets blackjack!
/next  # Dealer turn
/next  # Results - player wins $150 (3:2 payout)

# Verify
/stats
```

### Example 2: Test Split Mechanics

```bash
# Setup
/test-mode on
/deal AS AH 7D KH QD JH 10S 9D

# Start
/start
# [player bets]
/next  # Deal - player gets A+A
# [player splits]
# Cards dealt to split hands: K♥, Q♦
# [player plays each hand]
```

### Example 3: Mobile Testing Workflow

**On Phone (Dev Panel):**
1. Navigate to `https://your-ngrok.ngrok.io/dev?key=dev123`
2. Click "Test Mode ON"
3. Execute `/scenario blackjack`
4. Click "Start Game"

**On Laptop (Game Client):**
1. Open `http://localhost:3000`
2. Join game
3. Place bet
4. See blackjack appear!

**Back on Phone:**
5. Click "Next Phase" to advance
6. View "Live Server Logs" to monitor
7. Check "Statistics" to verify payout

---

## Summary

The Dev Admin Panel provides comprehensive control over your Blackjack server:

✅ **Remote Control** - Manage server from any device
✅ **Test Mode** - Force specific cards and scenarios
✅ **Live Monitoring** - Real-time logs and statistics
✅ **Player Management** - Kick, transfer host, monitor
✅ **Manual Control** - Step through game phases
✅ **Mobile Friendly** - Perfect for testing on phones

**Remember:**
- Always secure your `DEV_PANEL_KEY`
- Use test mode for debugging
- Check logs when troubleshooting
- Bookmark dev panel URL for quick access

Happy testing! 🎰
