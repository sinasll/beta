document.getElementById('tradeForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // Gather the form values
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const session = document.getElementById('session').value;
  const pair = document.getElementById('pair').value;
  const setup = document.getElementById('setup').value;
  const entry = document.getElementById('entry').value;
  const timeframe = document.getElementById('timeframe').value;
  const buySell = document.getElementById('buySell').value;
  const pips = document.getElementById('pips').value;
  const outcome = document.getElementById('outcome').value;

  // Create a new trade object
  const newTrade = {
    date,
    time,
    session,
    pair,
    setup,
    entry,
    timeframe,
    buySell,
    pips,
    outcome
  };

  // Retrieve existing trades from localStorage or initialize as an empty array
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Add the new trade to the array
  tradeEntries.push(newTrade);

  // Save the updated trade entries back to localStorage
  localStorage.setItem('tradeEntries', JSON.stringify(tradeEntries));

  // Add the new trade to the table
  addTradeToTable(newTrade);

  // Reset the form after submission
  document.getElementById('tradeForm').reset();
});

// Function to load and display trades from localStorage
function loadTrades() {
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];
  tradeEntries.forEach((trade, index) => {
    addTradeToTable(trade, index);
  });
}

// Function to add a trade to the table with a delete button
function addTradeToTable(trade, index) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${trade.date}</td>
    <td>${trade.time}</td>
    <td>${trade.session}</td>
    <td>${trade.pair}</td>
    <td>${trade.setup}</td>
    <td>${trade.entry}</td>
    <td>${trade.timeframe}</td>
    <td>${trade.buySell}</td>
    <td>${trade.pips}</td>
    <td>${trade.outcome}</td>
    <td><button class="delete-btn" data-index="${index}">Delete</button></td>
  `;

  // Add the new row to the table
  document.getElementById('tradesTable').querySelector('tbody').appendChild(row);

  // Add event listener for the delete button
  row.querySelector('.delete-btn').addEventListener('click', function () {
    deleteTrade(index);
  });
}

// Function to delete a trade
function deleteTrade(index) {
  // Retrieve existing trades from localStorage
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Remove the trade at the specified index
  tradeEntries.splice(index, 1);

  // Save the updated trade entries back to localStorage
  localStorage.setItem('tradeEntries', JSON.stringify(tradeEntries));

  // Reload the trades to update the table
  document.querySelector('tbody').innerHTML = '';
  loadTrades();
}

// Load trades when the page is loaded
document.addEventListener('DOMContentLoaded', loadTrades);
