document.addEventListener('DOMContentLoaded', () => {
  // Fetch trade entries from localStorage or initialize an empty array
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Calculate stats
  const totalTrades = tradeEntries.length;
  const wins = tradeEntries.filter(entry => entry.outcome === 'Win').length;
  const losses = tradeEntries.filter(entry => entry.outcome === 'Lose').length;
  const breakeven = tradeEntries.filter(entry => entry.outcome === 'Breakeven').length;

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
});
