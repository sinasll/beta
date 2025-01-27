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
    outcome,
  };

  // Retrieve existing trades from localStorage or initialize as an empty array
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Add the new trade to the array
  tradeEntries.push(newTrade);

  // Save the updated trade entries back to localStorage
  localStorage.setItem('tradeEntries', JSON.stringify(tradeEntries));

  // Add the new trade to the card list
  addTradeToCards(newTrade, tradeEntries.length - 1);

  // Reset the form after submission
  document.getElementById('tradeForm').reset();
});

// Function to load and display trades from localStorage
function loadTrades() {
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];
  tradeEntries.forEach((trade, index) => {
    addTradeToCards(trade, index);
  });
}

// Function to add a trade as a minimized card with View and Delete buttons
function addTradeToCards(trade, index) {
  const tradesList = document.getElementById('tradesList');
  const tradeCard = document.createElement('div');
  tradeCard.classList.add('trade-card', 'minimized'); // Start as minimized

  tradeCard.innerHTML = `
    <h3>Trade ${index + 1}</h3>
    <div class="card-details" style="display: none;"> <!-- Initially hidden -->
      <p><strong>Date:</strong> ${trade.date}</p>
      <p><strong>Time:</strong> ${trade.time}</p>
      <p><strong>Session:</strong> ${trade.session}</p>
      <p><strong>Pair:</strong> ${trade.pair}</p>
      <p><strong>Setup:</strong> ${trade.setup}</p>
      <p><strong>Playbook Entry:</strong> ${trade.entry}</p>
      <p><strong>Timeframe:</strong> ${trade.timeframe}</p>
      <p><strong>Buy/Sell:</strong> ${trade.buySell}</p>
      <p><strong>Pips:</strong> ${trade.pips}</p>
      <p><strong>Outcome:</strong> ${trade.outcome}</p>
    </div>
    <button class="view-btn">View</button>
    <button class="delete-btn" data-index="${index}">Delete</button>
  `;

  tradesList.appendChild(tradeCard);

  // Add event listener for the View button
  const viewButton = tradeCard.querySelector('.view-btn');
  viewButton.addEventListener('click', function () {
    toggleCardDetails(tradeCard, viewButton);
  });

  // Add event listener for the Delete button
  tradeCard.querySelector('.delete-btn').addEventListener('click', function () {
    deleteTrade(index);
  });
}

// Function to toggle card details
function toggleCardDetails(card, button) {
  const details = card.querySelector('.card-details');
  const isHidden = details.style.display === 'none';

  if (isHidden) {
    details.style.display = 'block';
    card.classList.remove('minimized');
    button.textContent = 'Hide';
  } else {
    details.style.display = 'none';
    card.classList.add('minimized');
    button.textContent = 'View';
  }
}

// Function to delete a trade
function deleteTrade(index) {
  // Retrieve existing trades from localStorage
  const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

  // Remove the trade at the specified index
  tradeEntries.splice(index, 1);

  // Save the updated trade entries back to localStorage
  localStorage.setItem('tradeEntries', JSON.stringify(tradeEntries));

  // Reload the trades to update the card list
  document.getElementById('tradesList').innerHTML = '';
  loadTrades();
}

// Load trades when the page is loaded
document.addEventListener('DOMContentLoaded', loadTrades);
