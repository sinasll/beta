import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// State
let userStats = {
  balance: 0,
  submissions: 0,
  dailyClaimed: false,
  referrals: 0,
  claimedReward: false
};

// DOM Elements
const elements = {
  balance: document.getElementById('balance'),
  submissions: {
    count: document.getElementById('submissionsCount'),
    button: document.getElementById('submissionsRewardButton')
  },
  daily: {
    button: document.getElementById('dailyButton')
  },
  referral: {
    count: document.getElementById('referralCount'),
    button: document.getElementById('referralButton')
  }
};

// Initialize
function initUser() {
  const tg = window.Telegram?.WebApp;
  return {
    telegramId: tg?.initDataUnsafe?.user?.id || localStorage.getItem('guestId') || generateGuestId()
  };
}

function generateGuestId() {
  const id = 'guest_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('guestId', id);
  return id;
}

// Fetch Data
async function fetchUserStats() {
  try {
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({ telegramId: initUser().telegramId })
    );
    
    const { status, stats } = JSON.parse(execution.responseBody);
    if (status === 'success') {
      Object.assign(userStats, stats);
      updateUI();
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

// Claim Actions
async function claimReward(type) {
  const button = elements[type].button;
  try {
    button.disabled = true;
    button.textContent = 'Processing...';
    
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({
        telegramId: initUser().telegramId,
        action: `claim_${type}`
      })
    );
    
    const { status, amount } = JSON.parse(execution.responseBody);
    if (status.includes('claimed')) {
      userStats.balance += amount;
      if (type === 'submissions') userStats.claimedReward = true;
      if (type === 'daily') userStats.dailyClaimed = true;
      if (type === 'referral') userStats.referrals = 0;
      
      showToast(`+${amount} $BLACK! Total: ${userStats.balance}`);
    }
  } catch (err) {
    showToast(err.message);
  } finally {
    fetchUserStats(); // Refresh data
  }
}

// UI Updates
function updateUI() {
  // Balance
  elements.balance.textContent = userStats.balance.toFixed(2);
  
  // Submissions Task
  elements.submissions.count.textContent = `${userStats.submissions}/100`;
  elements.submissions.button.disabled = userStats.claimedReward || userStats.submissions < 100;
  elements.submissions.button.textContent = userStats.claimedReward 
    ? '✓ Claimed' 
    : `${100 - userStats.submissions} more needed`;
  
  // Daily Task
  elements.daily.button.disabled = userStats.dailyClaimed;
  elements.daily.button.textContent = userStats.dailyClaimed 
    ? '✓ Claimed Today' 
    : 'Claim +1 $BLACK';
  
  // Referral Task
  elements.referral.count.textContent = `${userStats.referrals}/3`;
  elements.referral.button.disabled = userStats.referrals < 3;
  elements.referral.button.textContent = userStats.referrals >= 3 
    ? 'Claim +3 $BLACK' 
    : `${3 - userStats.referrals} more needed`;
}

// Helpers
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  fetchUserStats();
  setInterval(fetchUserStats, 60000); // Refresh every minute
  
  // Button handlers
  elements.submissions.button.addEventListener('click', () => claimReward('submissions'));
  elements.daily.button.addEventListener('click', () => claimReward('daily'));
  elements.referral.button.addEventListener('click', () => claimReward('referral'));
});