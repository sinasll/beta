    // Get the current date
    let currentDate = new Date();

    // Function to update the month and year labels
    function updateCalendarLabels() {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
        'September', 'October', 'November', 'December'
      ];
      document.getElementById('monthLabel').textContent = monthNames[currentDate.getMonth()];
      document.getElementById('yearLabel').textContent = currentDate.getFullYear();
    }

    // Function to generate stats for the current month
    function generateStats() {
      const statsContainer = document.getElementById('stats');
      statsContainer.innerHTML = ''; // Clear previous stats

      // Get the current month and year
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      // Retrieve trades from localStorage
      const tradeEntries = JSON.parse(localStorage.getItem('tradeEntries')) || [];

      // Filter trades for the current month and year
      const currentMonthTrades = tradeEntries.filter(trade => {
        const tradeDate = new Date(trade.date);
        return tradeDate.getMonth() === month && tradeDate.getFullYear() === year;
      });

      // Calculate stats based on filtered trades
      const totalTrades = currentMonthTrades.length;
      const totalPips = currentMonthTrades.reduce((total, trade) => total + parseFloat(trade.pips), 0);
      const winTrades = currentMonthTrades.filter(trade => trade.outcome.toLowerCase() === 'win').length;
      const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(2) : 0;

      // Create stat cards for the current month
      const stats = [
        {
          title: 'Win Rate',
          value: `${winRate}%`
        },
        {
          title: 'Total Trades',
          value: totalTrades.toString()
        },
        {
          title: 'Total Pips',
          value: totalPips.toFixed(2)
        }
      ];

      // Generate stat cards
      stats.forEach(stat => {
        const statCard = document.createElement('div');
        statCard.classList.add('stat-card');

        const statTitle = document.createElement('h3');
        statTitle.textContent = stat.title;

        const statValue = document.createElement('p');
        statValue.textContent = stat.value;

        statCard.appendChild(statTitle);
        statCard.appendChild(statValue);
        statsContainer.appendChild(statCard);
      });
    }

    // Function to navigate to the next month
    function nextMonth() {
      currentDate.setMonth(currentDate.getMonth() + 1);
      updateCalendarLabels();
      generateStats();
    }

    // Function to navigate to the previous month
    function prevMonth() {
      currentDate.setMonth(currentDate.getMonth() - 1);
      updateCalendarLabels();
      generateStats();
    }

    // Function to navigate to the next year
    function nextYear() {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      updateCalendarLabels();
      generateStats();
    }

    // Function to navigate to the previous year
    function prevYear() {
      currentDate.setFullYear(currentDate.getFullYear() - 1);
      updateCalendarLabels();
      generateStats();
    }

    // Event listeners for navigation buttons
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    document.getElementById('prevMonth').addEventListener('click', prevMonth);
    document.getElementById('nextYear').addEventListener('click', nextYear);
    document.getElementById('prevYear').addEventListener('click', prevYear);

    // Initial call to set up the calendar
    updateCalendarLabels();
    generateStats();