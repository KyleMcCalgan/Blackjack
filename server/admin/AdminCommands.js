// AdminCommands - console command system

class AdminCommands {
  constructor(gameRoom, statistics, testMode, ngrokUrl = null) {
    this.gameRoom = gameRoom;
    this.statistics = statistics;
    this.testMode = testMode;
    this.ngrokUrl = ngrokUrl;
    this.debugMode = false;
  }

  /**
   * Update ngrok URL after connection
   * @param {String} url - Ngrok public URL
   */
  setNgrokUrl(url) {
    this.ngrokUrl = url;
  }

  /**
   * Parse and execute a command
   * @param {String} input - Command input from console
   * @returns {String} Command output
   */
  execute(input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      return 'Commands must start with /. Type /help for available commands.';
    }

    // Parse command and arguments
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Route to appropriate handler
    switch (command) {
      // Game Control
      case 'start':
        return this.cmdStart();
      case 'end':
        return this.cmdEnd();
      case 'kick':
        return this.cmdKick(args);
      case 'transfer':
        return this.cmdTransfer(args);

      // Testing & Debug
      case 'test-mode':
        return this.cmdTestMode(args);
      case 'deal':
        return this.cmdDeal(args);
      case 'scenario':
        return this.cmdScenario(args);
      case 'autoplay':
        return this.cmdAutoplay(args);
      case 'next':
        return this.cmdNext();
      case 'debug':
        return this.cmdDebug();
      case 'state':
        return this.cmdState();

      // Statistics
      case 'stats':
        return this.cmdStats(args);
      case 'export':
        return this.cmdExport();
      case 'history':
        return this.cmdHistory(args);
      case 'clear-stats':
        return this.cmdClearStats();

      // Server Info
      case 'info':
        return this.cmdInfo();
      case 'players':
        return this.cmdPlayers();
      case 'url':
        return this.cmdUrl();
      case 'config':
        return this.cmdConfig();

      // Help
      case 'help':
        return this.cmdHelp();

      default:
        return `Unknown command: /${command}. Type /help for available commands.`;
    }
  }

  // ==================== GAME CONTROL COMMANDS ====================

  /**
   * Force start game
   */
  cmdStart() {
    if (this.gameRoom.phase !== 'lobby') {
      return 'Game already in progress';
    }

    if (this.gameRoom.players.size === 0) {
      return 'No players connected';
    }

    this.gameRoom.startGame();
    return 'Game started';
  }

  /**
   * End current game session
   */
  cmdEnd() {
    if (this.gameRoom.phase === 'lobby') {
      return 'No game in progress';
    }

    this.gameRoom.endGame();
    return 'Game ended';
  }

  /**
   * Kick a player
   * @param {Array} args - [playerName or seat]
   */
  cmdKick(args) {
    if (args.length === 0) {
      return 'Usage: /kick <player_name>';
    }

    const identifier = args.join(' ');

    // Find player by name or seat
    let targetPlayer = null;
    for (const player of this.gameRoom.players.values()) {
      if (player.name.toLowerCase() === identifier.toLowerCase() ||
          player.seat.toString() === identifier) {
        targetPlayer = player;
        break;
      }
    }

    if (!targetPlayer) {
      return `Player not found: ${identifier}`;
    }

    const name = targetPlayer.name;
    this.gameRoom.removePlayer(targetPlayer.id);
    return `Kicked ${name}`;
  }

  /**
   * Transfer host to a player
   * @param {Array} args - [playerName or seat]
   */
  cmdTransfer(args) {
    if (args.length === 0) {
      return 'Usage: /transfer <player_name>';
    }

    const identifier = args.join(' ');

    // Find player by name or seat
    let targetPlayer = null;
    for (const player of this.gameRoom.players.values()) {
      if (player.name.toLowerCase() === identifier.toLowerCase() ||
          player.seat.toString() === identifier) {
        targetPlayer = player;
        break;
      }
    }

    if (!targetPlayer) {
      return `Player not found: ${identifier}`;
    }

    const success = this.gameRoom.transferHost(targetPlayer.id);
    if (success) {
      return `Host transferred to ${targetPlayer.name}`;
    } else {
      return 'Failed to transfer host';
    }
  }

  // ==================== TESTING & DEBUG COMMANDS ====================

  /**
   * Toggle test mode
   * @param {Array} args - ['on' or 'off']
   */
  cmdTestMode(args) {
    if (args.length === 0) {
      const status = this.testMode.getStatus();
      return `Test mode: ${status.enabled ? 'ON' : 'OFF'}\n` +
             `Autoplay: ${status.autoplay ? 'ON' : 'OFF'}\n` +
             `Cards set: ${status.cardsSet} | Dealt: ${status.cardsDealt} | Remaining: ${status.cardsRemaining}`;
    }

    const action = args[0].toLowerCase();

    if (action === 'on') {
      const result = this.testMode.enable();
      return result.message;
    } else if (action === 'off') {
      const result = this.testMode.disable();
      return result.message;
    } else {
      return 'Usage: /test-mode <on|off>';
    }
  }

  /**
   * Set pre-dealt cards in test mode
   * @param {Array} args - Card strings (e.g., AS KH 10D) or 'clear' to return to random
   */
  cmdDeal(args) {
    if (args.length === 0) {
      return 'Usage: /deal <cards|clear>\nExample: /deal AS KH 10D 7C\nFormat: Rank (A,2-10,J,Q,K) + Suit (H,D,C,S)\nUse /deal clear to return to random dealing';
    }

    // Check if user wants to clear cards and return to random dealing
    if (args[0].toLowerCase() === 'clear' || args[0].toLowerCase() === 'random') {
      const result = this.testMode.clearCards();
      return result.message + ' - Random dealing restored';
    }

    const result = this.testMode.setCards(args.join(' '));
    if (result.success) {
      return result.message;
    } else {
      return `Error: ${result.error}`;
    }
  }

  /**
   * Load a preset scenario
   * @param {Array} args - [scenario name]
   */
  cmdScenario(args) {
    if (args.length === 0) {
      const scenarios = this.testMode.getScenarios();
      let output = 'Available scenarios:\n';
      for (const scenario of scenarios) {
        output += `  ${scenario.name} - ${scenario.description}\n`;
      }
      output += '\nUsage: /scenario <name>';
      return output;
    }

    const scenarioName = args[0].toLowerCase();
    const result = this.testMode.setScenario(scenarioName);

    if (result.success) {
      return result.message;
    } else {
      return `Error: ${result.error}`;
    }
  }

  /**
   * Toggle autoplay mode
   * @param {Array} args - ['on' or 'off']
   */
  cmdAutoplay(args) {
    if (args.length === 0) {
      const isEnabled = this.testMode.isAutoplayEnabled();
      return `Autoplay: ${isEnabled ? 'ON' : 'OFF'}\n` +
             `${isEnabled ? 'Game will auto-advance through phases.' : 'Use /next to manually advance phases.'}`;
    }

    const action = args[0].toLowerCase();

    if (action === 'on') {
      const result = this.testMode.setAutoplay(true);
      return result.message;
    } else if (action === 'off') {
      const result = this.testMode.setAutoplay(false);
      return result.message;
    } else {
      return 'Usage: /autoplay <on|off>';
    }
  }

  /**
   * Manually advance to next phase (when autoplay is off)
   */
  cmdNext() {
    if (this.testMode.isAutoplayEnabled()) {
      return 'Autoplay is enabled. Use /autoplay off to enable manual control.';
    }

    const result = this.gameRoom.advancePhase();
    if (result.success) {
      return `✓ ${result.message}\n  Current phase: ${this.gameRoom.phase}`;
    } else {
      return `✗ ${result.message}\n  Current phase: ${this.gameRoom.phase}`;
    }
  }

  /**
   * Toggle debug mode
   */
  cmdDebug() {
    this.debugMode = !this.debugMode;
    return `Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`;
  }

  /**
   * Display current game state JSON
   */
  cmdState() {
    const state = {
      phase: this.gameRoom.phase,
      roundNumber: this.gameRoom.roundNumber,
      players: this.gameRoom.players.size,
      currentPlayer: this.gameRoom.getCurrentPlayer()?.name || null,
      dealerValue: this.gameRoom.dealer.getHandValue().value,
      deckRemaining: this.gameRoom.deck.cards.length
    };

    return '\nGame State:\n' + JSON.stringify(state, null, 2);
  }

  // ==================== STATISTICS COMMANDS ====================

  /**
   * Display statistics
   * @param {Array} args - Optional: [playerName]
   */
  cmdStats(args) {
    if (args.length === 0) {
      // Session stats
      return this.statistics.formatForConsole();
    } else {
      // Player-specific stats
      const identifier = args.join(' ');

      // Find player by name or seat
      let targetPlayer = null;
      for (const player of this.gameRoom.players.values()) {
        if (player.name.toLowerCase() === identifier.toLowerCase() ||
            player.seat.toString() === identifier) {
          targetPlayer = player;
          break;
        }
      }

      if (!targetPlayer) {
        return `Player not found: ${identifier}`;
      }

      return this.statistics.formatPlayerForConsole(targetPlayer.id);
    }
  }

  /**
   * Export statistics to JSON
   */
  cmdExport() {
    const result = this.statistics.exportToJSON();
    if (result.success) {
      return `Statistics exported to: ${result.filePath}`;
    } else {
      return `Export failed: ${result.error}`;
    }
  }

  /**
   * Show hand history
   * @param {Array} args - Optional: [count]
   */
  cmdHistory(args) {
    const count = args.length > 0 ? parseInt(args[0]) : 10;
    if (isNaN(count) || count < 1) {
      return 'Usage: /history [count]\nExample: /history 20';
    }

    return this.statistics.formatHandHistory(count);
  }

  /**
   * Clear all statistics (requires confirmation)
   */
  cmdClearStats() {
    this.statistics.clearStats();
    return 'All statistics cleared';
  }

  // ==================== SERVER INFO COMMANDS ====================

  /**
   * Display server information
   */
  cmdInfo() {
    let output = '\n';
    output += '========================================\n';
    output += '       SERVER INFORMATION\n';
    output += '========================================\n';
    output += `Session ID: ${this.gameRoom.sessionId}\n`;
    output += `Phase: ${this.gameRoom.phase}\n`;
    output += `Round: ${this.gameRoom.roundNumber}\n`;
    output += `Players: ${this.gameRoom.players.size}/5\n`;
    output += `Local URL: http://localhost:3000\n`;

    if (this.ngrokUrl) {
      output += `Public URL: ${this.ngrokUrl}\n`;
    } else {
      output += `Public URL: Not available\n`;
    }

    output += '\n--- Configuration ---\n';
    output += `Starting Bankroll: $${this.gameRoom.config.startingBankroll}\n`;
    output += `Min Bet: $${this.gameRoom.config.minBet}\n`;
    output += `Max Bet: $${this.gameRoom.config.maxBet}\n`;
    output += `Deck Count: ${this.gameRoom.config.deckCount}\n`;
    output += `Blackjack Payout: ${this.gameRoom.config.blackjackPayout}\n`;
    output += `Insurance Payout: ${this.gameRoom.config.insurancePayout}\n`;
    output += `Split Aces = Blackjack: ${this.gameRoom.config.splitAcesBlackjack}\n`;
    output += `Round Delay: ${this.gameRoom.config.roundDelay}s\n`;
    output += '========================================\n';

    return output;
  }

  /**
   * List all connected players
   */
  cmdPlayers() {
    if (this.gameRoom.players.size === 0) {
      return 'No players connected';
    }

    let output = '\n';
    output += '========================================\n';
    output += '       CONNECTED PLAYERS\n';
    output += '========================================\n';

    for (const player of this.gameRoom.players.values()) {
      const hostMark = player.isHost ? ' [HOST]' : '';
      const elimMark = player.eliminated ? ' [ELIMINATED]' : '';
      output += `Seat ${player.seat}: ${player.name}${hostMark}${elimMark}\n`;
      output += `  Bankroll: $${player.bankroll}\n`;
      if (this.gameRoom.phase !== 'lobby') {
        output += `  Current Bet: $${player.currentBet}\n`;
        output += `  Hands: ${player.hands.length}\n`;
      }
    }

    output += '========================================\n';

    return output;
  }

  /**
   * Display ngrok URL
   */
  cmdUrl() {
    if (this.ngrokUrl) {
      return `\nPublic URL: ${this.ngrokUrl}\nShare this URL with players to join!`;
    } else {
      return 'Ngrok URL not available';
    }
  }

  /**
   * Display current game configuration
   */
  cmdConfig() {
    let output = '\n';
    output += '========================================\n';
    output += '      GAME CONFIGURATION\n';
    output += '========================================\n';
    output += `Starting Bankroll: $${this.gameRoom.config.startingBankroll}\n`;
    output += `Min Bet: $${this.gameRoom.config.minBet}\n`;
    output += `Max Bet: $${this.gameRoom.config.maxBet || 'No limit'}\n`;
    output += `Deck Count: ${this.gameRoom.config.deckCount}\n`;
    output += `Blackjack Payout: ${this.gameRoom.config.blackjackPayout}\n`;
    output += `Insurance Payout: ${this.gameRoom.config.insurancePayout}\n`;
    output += `Split Aces = Blackjack: ${this.gameRoom.config.splitAcesBlackjack ? 'Yes' : 'No'}\n`;
    output += `Round Delay: ${this.gameRoom.config.roundDelay} seconds\n`;
    output += '========================================\n';

    return output;
  }

  // ==================== HELP COMMAND ====================

  /**
   * Display help information
   */
  cmdHelp() {
    let output = '\n';
    output += '========================================\n';
    output += '      ADMIN CONSOLE COMMANDS\n';
    output += '========================================\n';
    output += '\n--- Game Control ---\n';
    output += '/start              Force start game\n';
    output += '/end                End current game\n';
    output += '/kick <player>      Kick a player\n';
    output += '/transfer <player>  Transfer host\n';
    output += '\n--- Testing & Debug ---\n';
    output += '/test-mode <on|off> Toggle test mode\n';
    output += '/deal <cards>       Set pre-dealt cards\n';
    output += '                    Example: /deal AS KH 10D 7C\n';
    output += '/deal clear         Return to random dealing\n';
    output += '/scenario <name>    Load preset scenario\n';
    output += '/scenario           List available scenarios\n';
    output += '/autoplay <on|off>  Toggle auto-advance phases\n';
    output += '/next               Manually advance to next phase\n';
    output += '                    (only when autoplay is off)\n';
    output += '/debug              Toggle debug mode\n';
    output += '/state              Show game state JSON\n';
    output += '\n--- Statistics ---\n';
    output += '/stats              Show session stats\n';
    output += '/stats <player>     Show player stats\n';
    output += '/export             Export stats to JSON\n';
    output += '/history [n]        Show last n hands (default: 10)\n';
    output += '/clear-stats        Reset all statistics\n';
    output += '\n--- Server Info ---\n';
    output += '/info               Server information\n';
    output += '/players            List connected players\n';
    output += '/url                Show ngrok URL\n';
    output += '/config             Show game configuration\n';
    output += '\n--- General ---\n';
    output += '/help               Show this help message\n';
    output += '========================================\n';

    return output;
  }
}

module.exports = AdminCommands;
