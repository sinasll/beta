// Wait for everything to load
document.addEventListener('DOMContentLoaded', function() {
  // Verify Appwrite is loaded
  if (typeof Appwrite === 'undefined') {
    console.error('Appwrite SDK failed to load!');
    alert('Error: Appwrite SDK not loaded. Please refresh.');
    return;
  }

  // Initialize Appwrite
  const client = new Appwrite.Client();
  client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67fc2c5c0029c00f778'); // Verify this is correct

  // Mining functionality
  document.getElementById('mineButton').addEventListener('click', async function() {
    try {
      // Verify Telegram is available
      if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
        alert('Please open in Telegram');
        return;
      }

      const tgUser = Telegram.WebApp.initDataUnsafe.user;
      const userId = tgUser.id.toString();
      
      const response = await fetch('https://67fc399b4d05399fae0f.appwrite.global/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) throw new Error('Network error');
      
      const result = await response.json();
      
      if (result.success) {
        document.getElementById('dailyCode').textContent = result.code;
        this.textContent = 'Stop Mining';
        startCountdown(result.expiry);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Mining error:', error);
      alert('Error: ' + error.message);
    }
  });

  // Countdown function
  function startCountdown(expiryDate) {
    const countdownEl = document.getElementById('countdown');
    const expiry = new Date(expiryDate);
    
    const timer = setInterval(() => {
      const diff = expiry - new Date();
      
      if (diff <= 0) {
        clearInterval(timer);
        countdownEl.textContent = 'Code expired';
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      
      countdownEl.textContent = `Daily reset in ${hours}:${minutes}:${seconds}`;
    }, 1000);
  }
});