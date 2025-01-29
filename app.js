document.addEventListener('DOMContentLoaded', () => {
  // Fetch trade entries from localStorage or initialize an empty array
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Calculate stats
  const totalTrades = tradeEntries.length;
  const wins = tradeEntries.filter(entry => entry.outcome === 'Win').length;
  const losses = tradeEntries.filter(entry => entry.outcome === 'Lose').length;
  const breakeven = tradeEntries.filter(entry => entry.outcome === 'Breakeven').length;

  // Filter out breakout, fakeout, and dragon trades
  const breakoutTrades = tradeEntries.filter(entry => entry.setup === 'Breakout');
  const fakeoutTrades = tradeEntries.filter(entry => entry.setup === 'Fakeout');
  const dragonTrades = tradeEntries.filter(entry => entry.setup === 'Dragon');

  // Calculate breakout win rate
  const breakoutWins = breakoutTrades.filter(entry => entry.outcome === 'Win').length;
  const breakoutWinRate = breakoutTrades.length === 0 ? 0 : (breakoutWins / breakoutTrades.length) * 100;

  // Calculate fakeout win rate
  const fakeoutWins = fakeoutTrades.filter(entry => entry.outcome === 'Win').length;
  const fakeoutWinRate = fakeoutTrades.length === 0 ? 0 : (fakeoutWins / fakeoutTrades.length) * 100;

  // Calculate dragon win rate
  const dragonWins = dragonTrades.filter(entry => entry.outcome === 'Win').length;
  const dragonWinRate = dragonTrades.length === 0 ? 0 : (dragonWins / dragonTrades.length) * 100;

  // Calculate total pips (add for wins, subtract for losses, and adjust for negative pips)
  const totalPips = tradeEntries.reduce((acc, entry) => {
    if (entry.outcome === 'Win' || entry.outcome === 'Breakeven') {
      return acc + Math.abs(entry.pips); // Add positive value for wins or breakeven
    } else if (entry.outcome === 'Lose') {
      return acc - Math.abs(entry.pips); // Subtract value for losses
    } else {
      return acc; // No change for other outcomes
    }
  }, 0);

  // Calculate win rate
  const winRate = totalTrades === 0 ? 0 : (wins / totalTrades) * 100;

  // Calculate average pips per trade
  const averagePips = totalTrades === 0 ? 0 : totalPips / totalTrades;

  // Update DOM with the stats
  document.getElementById('win-rate').textContent = `${winRate.toFixed(2)}%`;
  document.getElementById('total-trades').textContent = totalTrades;
  document.getElementById('total-pips').textContent = totalPips.toFixed(2);
  document.getElementById('average-pips').textContent = averagePips.toFixed(2);
  document.getElementById('wins').textContent = wins;
  document.getElementById('losses').textContent = losses;

  // Update Breakout, Fakeout, and Dragon Win Rates
  document.getElementById('breakout-win-rate').textContent = `${breakoutWinRate.toFixed(2)}%`;
  document.getElementById('fakeout-win-rate').textContent = `${fakeoutWinRate.toFixed(2)}%`;
  document.getElementById('dragon-win-rate').textContent = `${dragonWinRate.toFixed(2)}%`;
});
