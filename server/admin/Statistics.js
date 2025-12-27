// Statistics - session statistics tracking and export

const fs = require('fs');
const path = require('path');

class Statistics {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.sessionId = gameRoom.sessionId;
    this.startTime = new Date();
    this.endTime = null;

    // Session-level stats
    this.totalRounds = 0;
    this.totalHandsPlayed = 0;
    this.totalWagered = 0;

    // Dealer stats
    this.dealerStats = {
      blackjacks: 0,
      busts: 0,
      totalHands: 0,
      avgFinalValue: 0,
      totalFinalValue: 0
    };

    // Hand history (complete record of each hand)
    this.handHistory = [];

    // Side bet tracking
    this.sideBetStats = {
      perfectPairs: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 },
      bustIt: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 },
      twentyOnePlus3: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 }
    };
  }

  // ==================== ROUND TRACKING ====================

  /**
   * Record the start of a round
   */
  startRound() {
    this.totalRounds++;
  }

  /**
   * Record the end of a round with full hand data
   * @param {Object} roundData - Complete round data
   */
  recordRound(roundData) {
    this.totalHandsPlayed += roundData.activePlayers || 0;

    // Record dealer stats
    if (roundData.dealer) {
      this.dealerStats.totalHands++;
      if (roundData.dealer.hasBlackjack) this.dealerStats.blackjacks++;
      if (roundData.dealer.isBust) this.dealerStats.busts++;

      const dealerValue = roundData.dealer.finalValue || 0;
      this.dealerStats.totalFinalValue += dealerValue;
      this.dealerStats.avgFinalValue = this.dealerStats.totalFinalValue / this.dealerStats.totalHands;
    }

    // Record to hand history
    this.handHistory.push({
      round: this.totalRounds,
      timestamp: new Date().toISOString(),
      ...roundData
    });
  }

  /**
   * Record side bet results
   * @param {String} betType - 'perfectPairs' | 'bustIt' | 'twentyOnePlus3'
   * @param {Number} wagered - Amount wagered
   * @param {Number} won - Amount won (0 if loss)
   */
  recordSideBet(betType, wagered, won) {
    if (!this.sideBetStats[betType]) return;

    this.sideBetStats[betType].totalWagered += wagered;

    if (won > 0) {
      this.sideBetStats[betType].wins++;
      this.sideBetStats[betType].totalWon += won;
    } else {
      this.sideBetStats[betType].losses++;
    }
  }

  // ==================== PLAYER STATISTICS ====================

  /**
   * Get aggregated statistics for a specific player
   * @param {String} playerId - Player socket ID
   * @returns {Object} Player statistics
   */
  getPlayerStats(playerId) {
    const player = this.gameRoom.players.get(playerId);
    if (!player) return null;

    const stats = player.getStatistics();

    // Calculate additional metrics
    const totalHands = stats.handsPlayed;
    const winRate = totalHands > 0 ? (stats.handsWon / totalHands * 100).toFixed(2) : 0;
    const avgBet = totalHands > 0 ? (stats.totalWagered / totalHands).toFixed(2) : 0;

    return {
      name: player.name,
      seat: player.seat,
      currentBankroll: player.bankroll,
      ...stats,
      winRate: `${winRate}%`,
      avgBet: `$${avgBet}`,
      roi: stats.totalWagered > 0 ? ((stats.netProfit / stats.totalWagered) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Get statistics for all players
   * @returns {Array} Array of player statistics
   */
  getAllPlayerStats() {
    const allStats = [];

    for (const [playerId, player] of this.gameRoom.players.entries()) {
      allStats.push(this.getPlayerStats(playerId));
    }

    return allStats;
  }

  // ==================== SESSION STATISTICS ====================

  /**
   * Get complete session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const endTime = this.endTime || new Date();
    const duration = Math.floor((endTime - this.startTime) / 1000); // seconds
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    return {
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime?.toISOString() || null,
      duration: `${hours}h ${minutes}m ${seconds}s`,
      durationSeconds: duration,
      totalRounds: this.totalRounds,
      totalHandsPlayed: this.totalHandsPlayed,
      avgHandsPerRound: this.totalRounds > 0 ? (this.totalHandsPlayed / this.totalRounds).toFixed(2) : 0,
      dealer: {
        ...this.dealerStats,
        blackjackRate: this.dealerStats.totalHands > 0 ?
          ((this.dealerStats.blackjacks / this.dealerStats.totalHands) * 100).toFixed(2) + '%' : '0%',
        bustRate: this.dealerStats.totalHands > 0 ?
          ((this.dealerStats.busts / this.dealerStats.totalHands) * 100).toFixed(2) + '%' : '0%'
      },
      sideBets: this.formatSideBetStats(),
      players: this.getAllPlayerStats()
    };
  }

  /**
   * Format side bet statistics
   * @returns {Object} Formatted side bet stats
   */
  formatSideBetStats() {
    const formatted = {};

    for (const [betType, stats] of Object.entries(this.sideBetStats)) {
      const totalBets = stats.wins + stats.losses;
      const winRate = totalBets > 0 ? ((stats.wins / totalBets) * 100).toFixed(2) : 0;
      const roi = stats.totalWagered > 0 ?
        (((stats.totalWon - stats.totalWagered) / stats.totalWagered) * 100).toFixed(2) : 0;

      formatted[betType] = {
        totalBets,
        wins: stats.wins,
        losses: stats.losses,
        winRate: `${winRate}%`,
        totalWagered: `$${stats.totalWagered}`,
        totalWon: `$${stats.totalWon}`,
        netProfit: `$${stats.totalWon - stats.totalWagered}`,
        roi: `${roi}%`
      };
    }

    return formatted;
  }

  // ==================== DISPLAY FORMATTING ====================

  /**
   * Format session statistics for console display
   * @returns {String} Formatted statistics
   */
  formatForConsole() {
    const stats = this.getSessionStats();
    let output = '\n';
    output += '========================================\n';
    output += '       SESSION STATISTICS\n';
    output += '========================================\n';
    output += `Session ID: ${stats.sessionId}\n`;
    output += `Duration: ${stats.duration}\n`;
    output += `Total Rounds: ${stats.totalRounds}\n`;
    output += `Total Hands: ${stats.totalHandsPlayed}\n`;
    output += `Avg Hands/Round: ${stats.avgHandsPerRound}\n`;
    output += '\n';

    // Dealer stats
    output += '--- Dealer Statistics ---\n';
    output += `Total Hands: ${stats.dealer.totalHands}\n`;
    output += `Blackjacks: ${stats.dealer.blackjacks} (${stats.dealer.blackjackRate})\n`;
    output += `Busts: ${stats.dealer.busts} (${stats.dealer.bustRate})\n`;
    output += `Avg Final Value: ${stats.dealer.avgFinalValue.toFixed(2)}\n`;
    output += '\n';

    // Side bets
    output += '--- Side Bet Statistics ---\n';
    for (const [betType, betStats] of Object.entries(stats.sideBets)) {
      output += `${betType}:\n`;
      output += `  Bets: ${betStats.totalBets} | Wins: ${betStats.wins} (${betStats.winRate})\n`;
      output += `  Wagered: ${betStats.totalWagered} | Won: ${betStats.totalWon}\n`;
      output += `  ROI: ${betStats.roi}\n`;
    }
    output += '\n';

    // Player stats
    output += '--- Player Statistics ---\n';
    for (const player of stats.players) {
      output += `\n${player.name} (Seat ${player.seat}):\n`;
      output += `  Bankroll: $${player.currentBankroll}\n`;
      output += `  Hands: ${player.handsPlayed} | W:${player.handsWon} L:${player.handsLost} P:${player.handsPushed}\n`;
      output += `  Win Rate: ${player.winRate} | ROI: ${player.roi}\n`;
      output += `  Blackjacks: ${player.blackjacks} | Splits: ${player.splits} | Doubles: ${player.doubles}\n`;
      output += `  Wagered: $${player.totalWagered} | Net: $${player.netProfit}\n`;
      output += `  Biggest Win: $${player.biggestWin} | Biggest Loss: $${player.biggestLoss}\n`;
    }

    output += '\n========================================\n';

    return output;
  }

  /**
   * Format player statistics for console display
   * @param {String} playerId - Player socket ID
   * @returns {String} Formatted player stats
   */
  formatPlayerForConsole(playerId) {
    const player = this.getPlayerStats(playerId);
    if (!player) return 'Player not found';

    let output = '\n';
    output += '========================================\n';
    output += `  ${player.name.toUpperCase()} - SEAT ${player.seat}\n`;
    output += '========================================\n';
    output += `Current Bankroll: $${player.currentBankroll}\n`;
    output += `Net Profit: $${player.netProfit}\n`;
    output += '\n';
    output += '--- Performance ---\n';
    output += `Hands Played: ${player.handsPlayed}\n`;
    output += `Wins: ${player.handsWon} | Losses: ${player.handsLost} | Pushes: ${player.handsPushed}\n`;
    output += `Win Rate: ${player.winRate}\n`;
    output += `ROI: ${player.roi}\n`;
    output += '\n';
    output += '--- Betting ---\n';
    output += `Total Wagered: $${player.totalWagered}\n`;
    output += `Average Bet: ${player.avgBet}\n`;
    output += `Biggest Win: $${player.biggestWin}\n`;
    output += `Biggest Loss: $${player.biggestLoss}\n`;
    output += '\n';
    output += '--- Actions ---\n';
    output += `Blackjacks: ${player.blackjacks}\n`;
    output += `Splits: ${player.splits}\n`;
    output += `Doubles: ${player.doubles}\n`;
    output += `Busts: ${player.busts}\n`;
    output += `Insurance Wins: ${player.insuranceWins} | Losses: ${player.insuranceLosses}\n`;
    output += '========================================\n';

    return output;
  }

  // ==================== EXPORT ====================

  /**
   * Export statistics to JSON file
   * @param {String} directory - Export directory path
   * @returns {Object} {success, filePath, error}
   */
  exportToJSON(directory = null) {
    try {
      // Set end time
      this.endTime = new Date();

      // Create export directory if not specified
      const exportDir = directory || path.join(__dirname, '../exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `stats-${this.sessionId}-${timestamp}.json`;
      const filePath = path.join(exportDir, filename);

      // Prepare export data
      const exportData = {
        sessionId: this.sessionId,
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        configuration: this.gameRoom.config,
        summary: {
          totalRounds: this.totalRounds,
          totalHandsPlayed: this.totalHandsPlayed,
          duration: Math.floor((this.endTime - this.startTime) / 1000)
        },
        dealer: this.dealerStats,
        sideBets: this.sideBetStats,
        players: this.getAllPlayerStats().map(p => ({
          name: p.name,
          seat: p.seat,
          finalBankroll: p.currentBankroll,
          statistics: {
            handsPlayed: p.handsPlayed,
            handsWon: p.handsWon,
            handsLost: p.handsLost,
            handsPushed: p.handsPushed,
            blackjacks: p.blackjacks,
            totalWagered: p.totalWagered,
            netProfit: p.netProfit,
            biggestWin: p.biggestWin,
            biggestLoss: p.biggestLoss,
            splits: p.splits,
            doubles: p.doubles,
            busts: p.busts,
            insuranceWins: p.insuranceWins,
            insuranceLosses: p.insuranceLosses
          }
        })),
        handHistory: this.handHistory
      };

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

      console.log(`[Statistics] Exported to: ${filePath}`);

      return {
        success: true,
        filePath,
        filename
      };

    } catch (error) {
      console.error('[Statistics] Export error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get last N hands from history
   * @param {Number} count - Number of hands to retrieve
   * @returns {Array} Recent hands
   */
  getRecentHands(count = 10) {
    return this.handHistory.slice(-count);
  }

  /**
   * Format hand history for console display
   * @param {Number} count - Number of recent hands to show
   * @returns {String} Formatted hand history
   */
  formatHandHistory(count = 10) {
    const recentHands = this.getRecentHands(count);

    if (recentHands.length === 0) {
      return 'No hand history available';
    }

    let output = '\n';
    output += '========================================\n';
    output += `    HAND HISTORY (Last ${recentHands.length})\n`;
    output += '========================================\n';

    for (const hand of recentHands) {
      output += `\nRound ${hand.round} - ${new Date(hand.timestamp).toLocaleTimeString()}\n`;
      output += `Dealer: ${hand.dealer?.finalValue || 'N/A'} ${hand.dealer?.hasBlackjack ? '(BJ)' : ''} ${hand.dealer?.isBust ? '(BUST)' : ''}\n`;

      if (hand.players) {
        output += 'Players:\n';
        for (const player of hand.players) {
          output += `  ${player.name}: ${player.result || 'N/A'} ($${player.winnings || 0})\n`;
        }
      }
    }

    output += '========================================\n';

    return output;
  }

  /**
   * Clear all statistics (with confirmation)
   */
  clearStats() {
    this.totalRounds = 0;
    this.totalHandsPlayed = 0;
    this.totalWagered = 0;
    this.dealerStats = {
      blackjacks: 0,
      busts: 0,
      totalHands: 0,
      avgFinalValue: 0,
      totalFinalValue: 0
    };
    this.handHistory = [];
    this.sideBetStats = {
      perfectPairs: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 },
      bustIt: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 },
      twentyOnePlus3: { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 }
    };
    this.startTime = new Date();
    this.endTime = null;

    console.log('[Statistics] All statistics cleared');
  }
}

module.exports = Statistics;
