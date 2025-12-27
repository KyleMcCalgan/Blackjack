# Backend Testing Guide

This guide will help you test all backend functionality before building the frontend.

## Prerequisites

Make sure all dependencies are installed:
```bash
npm install
```

## Quick Start Testing

### 1. Start the Server

```bash
npm start
```

You should see:
```
🎰 Blackjack Game Server Started!
Local URL: http://localhost:3000
Public URL: https://xxxx.ngrok.io
```

### 2. Run the Test Script (in a new terminal)

```bash
node test-backend.js
```

This will:
- Connect 2 test players
- Join the game
- Place bets with side bets
- Mark ready
- Keep connections alive for further testing

### 3. Use Admin Console Commands

In the server terminal, try these commands:

## Admin Console Testing Checklist

### Game Information Commands

```bash
/help           # Show all available commands
/info           # View server info and configuration
/config         # View current game configuration
/players        # List connected players
/url            # Show ngrok public URL
/state          # View current game state JSON
```

### Game Control Commands

```bash
/start          # Force start the game (players must have placed bets)
/end            # End the current game session
```

**Test Flow:**
1. Run test script to connect 2 players
2. Use `/players` to see them connected
3. Use `/state` to see game phase is 'betting'
4. Use `/start` to force start (if both players are ready)

### Statistics Commands

```bash
/stats                  # View full session statistics
/stats TestPlayer1      # View specific player stats
/history 5              # Show last 5 hands
/export                 # Export statistics to JSON
/clear-stats            # Reset all statistics
```

**Test Flow:**
1. Play a few rounds (use test mode to speed up)
2. Use `/stats` to see session stats
3. Use `/stats TestPlayer1` to see player-specific stats
4. Use `/export` to create JSON file in `/server/exports/`
5. Check the exported JSON file

### Test Mode Commands

```bash
/test-mode on           # Enable test mode
/test-mode off          # Disable test mode
/test-mode              # Check test mode status

/deal AS KH 10D 7C      # Set specific cards to be dealt
/deal                   # Show usage instructions

/scenario               # List available scenarios
/scenario blackjack     # Load blackjack scenario
/scenario split-aces    # Load split aces scenario
/scenario dealer-bust   # Load dealer bust scenario
```

**Available Scenarios:**
- `blackjack` - Player gets blackjack
- `bust` - Player busts
- `split-aces` - Player gets pair of aces
- `split-tens` - Player gets pair of tens
- `dealer-bust` - Dealer busts with many cards
- `perfect-pair` - Player gets perfect pair
- `dealer-blackjack` - Dealer gets blackjack (tests insurance)

**Test Flow:**
1. Use `/test-mode on` to enable
2. Use `/scenario blackjack` to load preset cards
3. Have test players bet and ready up
4. Use `/start` to begin round
5. Watch the console logs as cards are dealt
6. Verify blackjack is detected and paid correctly

### Player Management Commands

```bash
/kick TestPlayer1       # Kick player by name
/kick 1                 # Kick player by seat number
/transfer TestPlayer2   # Transfer host to another player
```

## Detailed Test Scenarios

### Scenario 1: Basic Game Flow

1. Start server: `npm start`
2. Run test script: `node test-backend.js` (in new terminal)
3. Admin: `/players` - Verify 2 players connected
4. Admin: `/state` - Verify phase is 'betting'
5. Wait for players to bet and ready up (test script does this)
6. Admin: `/state` - Verify bets are placed
7. Admin: `/start` - Force start game
8. Watch console logs for dealing phase
9. Observe automatic game progression

### Scenario 2: Test Mode - Blackjack Testing

1. Start server
2. Run test script
3. Admin: `/test-mode on`
4. Admin: `/scenario blackjack`
5. Admin: `/start`
6. Watch logs - Player should get AS + KH (blackjack)
7. Admin: `/stats` - Verify blackjack was recorded
8. Admin: `/test-mode off`

### Scenario 3: Test Mode - Split Testing

1. Enable test mode: `/test-mode on`
2. Set split scenario: `/scenario split-aces`
3. Start game: `/start`
4. Player should get pair of aces
5. (With UI, player would choose to split)
6. Verify split logic works in backend

### Scenario 4: Side Bet Testing

1. Enable test mode: `/test-mode on`
2. Perfect Pairs: `/scenario perfect-pair`
3. Start game: `/start`
4. Check stats: `/stats TestPlayer1`
5. Verify Perfect Pairs payout was calculated

### Scenario 5: Dealer Bust Testing (Bust It)

1. Enable test mode: `/test-mode on`
2. Load scenario: `/scenario dealer-bust`
3. Start game: `/start`
4. Watch dealer take multiple cards
5. Verify dealer busts and Bust It pays correctly
6. Check: `/stats`

### Scenario 6: Custom Card Dealing

1. Enable test mode: `/test-mode on`
2. Set custom cards: `/deal AS KH QD 10C 9S 8H 7D`
3. Check status: `/test-mode`
4. Start game: `/start`
5. Watch cards being dealt in exact order
6. Cards 1-2: Player 1, Cards 3-4: Dealer, etc.

### Scenario 7: Statistics Export

1. Play several rounds (use test mode to speed up)
2. View stats: `/stats`
3. Export: `/export`
4. Check file: `/server/exports/stats-[sessionId]-[date].json`
5. Verify JSON contains:
   - Session info
   - Player statistics
   - Dealer stats
   - Hand history

### Scenario 8: Player Disconnect Handling

1. Start server
2. Run test script (2 players connect)
3. Kill test script (Ctrl+C in test terminal)
4. Check server console - should see disconnection
5. Admin: `/players` - Verify players removed
6. If mid-game, verify game handles disconnect gracefully

### Scenario 9: Config Changes

1. Open host page: `http://localhost:3000/host`
2. Change configuration (e.g., min bet to 25)
3. Check server console - config should be logged
4. Admin: `/config` - Verify new config is active
5. Try changing config mid-game - should be rejected

### Scenario 10: Multiple Rounds

1. Enable test mode: `/test-mode on`
2. Set easy scenario: `/scenario blackjack`
3. Start game: `/start`
4. Wait for round to complete
5. Round should auto-start after delay (5 seconds default)
6. Admin: `/stats` - Verify multiple rounds tracked
7. Admin: `/history 3` - View last 3 hands

## Socket.IO Events Testing

### Events to Monitor (check server console logs)

**Lobby & Connection:**
- `join-game` → `join-success` / `join-failed`
- `disconnect` → `player-left`
- `transfer-host` → `host-transferred`
- `start-game` → game starts

**Betting Phase:**
- `place-bet` → `bet-placed` / `bet-failed`
- `ready-bet` → `ready-confirmed`
- Automatic: `betting-phase` emitted to all

**Dealing Phase:**
- Automatic: `card-dealt` for each card
- Automatic: `dealer-card` for dealer cards

**Insurance Phase (when dealer shows Ace):**
- Automatic: `insurance-offered`
- `place-insurance` → `insurance-placed` / `insurance-failed`

**Playing Phase:**
- Automatic: `player-turn` for each turn
- `player-action` (hit/stand/double/split) → `action-confirmed`
- `pre-select-action` → `pre-action-set`

**Results Phase:**
- Automatic: `round-results` with full payout breakdown

**Game State:**
- Automatic: `game-state` broadcasted frequently

## Debugging Tips

### Enable Debug Mode

```bash
/debug          # Toggle debug mode
```

### Watch Console Logs

Server logs show:
- `[GameRoom]` - Game flow messages
- `[TestMode]` - Test mode card dealing
- `[Statistics]` - Stats recording
- Socket events with timestamps

### Check Game State

```bash
/state          # View full game state JSON
```

Shows:
- Current phase
- Round number
- Player count
- Current player's turn
- Dealer value
- Deck remaining

## Common Issues

### Issue: "Test mode not enabled"
**Fix:** Run `/test-mode on` before `/deal` or `/scenario`

### Issue: "Cannot start game - not in lobby"
**Fix:** Game is already running. Use `/end` first.

### Issue: "No players connected"
**Fix:** Run `node test-backend.js` to connect test players

### Issue: Cards not dealing as expected
**Fix:**
1. Check test mode is enabled: `/test-mode`
2. Verify cards set: Shows cards remaining
3. Cards deal in order: P1 card 1, P2 card 1, Dealer card 1, P1 card 2, etc.

### Issue: ngrok not working
**Fix:** Server still works on localhost. ngrok is only for external access.

## Performance Testing

### Stress Test (Manual)

1. Modify test script to create 5 players
2. Run rapid commands
3. Monitor server logs for errors
4. Check memory usage

### Timer Testing

1. Start game without marking ready
2. Wait 30 seconds
3. Verify betting timer auto-folds non-ready players
4. Test action timer (30s) by not acting during playing phase

## Success Criteria

Backend is ready when:

✅ Players can connect and join
✅ Betting phase works with timers
✅ Cards deal in correct order
✅ Player actions (hit/stand/double/split) work
✅ Dealer plays automatically
✅ Results calculate correctly
✅ Statistics track all data
✅ Test mode allows scenario testing
✅ Admin commands all work
✅ Config changes apply correctly
✅ Disconnections handled gracefully
✅ Statistics export to JSON

## Next Steps

Once all tests pass:
1. Document any bugs found
2. Fix critical issues
3. Proceed to frontend development
4. Backend will be stable foundation

---

**Happy Testing!** 🎰

If you find any bugs, check:
1. Console logs for error messages
2. Use `/state` to see current game state
3. Use `/debug` for additional logging
4. Check `/server/exports/` for statistics files


some further issues I have noticed. The sidebets continue to not work


Tried to implement a feature where you have to ready up before allowing you to play but it introduces all sorts of issues. sometimes if you click ready you dont even actually get into the round. majority of the time if you dont click ready you dont get the round at all however. there is occasionally no cancle button. the system needs to be looked at in detail to make sure that the logical flow of the game stays correct and consistent the issues all seem to be connected to the ready button which I believe is being overcomplicated

would like some visual adjust ments especially on mobile. possibly making the playing table smaller for those who arent involved and shifting buttons around 
