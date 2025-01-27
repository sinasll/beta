// Fetch trades from localStorage or a storage method you use
const trades = JSON.parse(localStorage.getItem('tradeHistory')) || [];

// Get current year and display it
const currentYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = currentYear;

// Generate months grid
const monthsGrid = document.getElementById('monthsGrid');
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

monthNames.forEach((month, index) => {
  const monthCard = document.createElement('div');
  monthCard.classList.add('month-card');
  monthCard.innerHTML = `<h3>${month}</h3>`;
  monthCard.addEventListener('click', () => showDaysOfMonth(index));
  monthsGrid.appendChild(monthCard);
});

// Show days of a selected month
function showDaysOfMonth(monthIndex) {
  const daysGrid = document.getElementById('daysGrid');
  daysGrid.innerHTML = ''; // Clear previous days

  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCard = document.createElement('div');
    dayCard.classList.add('day-card');
    dayCard.innerHTML = `<h4>${day}</h4>`;
    
    const tradesForDay = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return tradeDate.getFullYear() === currentYear && tradeDate.getMonth() === monthIndex && tradeDate.getDate() === day;
    });

    tradesForDay.forEach(trade => {
      const tradeEntry = document.createElement('p');
      tradeEntry.textContent = `${trade.pair} - ${trade.outcome}`;
      dayCard.appendChild(tradeEntry);
    });

    daysGrid.appendChild(dayCard);
  }
}
