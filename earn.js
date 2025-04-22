import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// DOM Elements
const submissionsRewardButton = document.getElementById('submissionsRewardButton');
const submissionsCountEl = document.getElementById('submissionsCount');

// User Data State
let userData = {
  totalCodeSubmissions: 0,
  claimedReward: false,
  balance: 0
};

// Initialize User Data
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    return {
      telegramId: tg.initDataUnsafe.user.id.toString()
    };
  }
  
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestId', guestId);
  }
  
  return {
    telegramId: guestId
  };
}

// Show Temporary Message
function showTemporaryMessage(element, message, duration) {
  const originalText = element.textContent;
  element.textContent = message;
  element.disabled = true;
  
  setTimeout(() => {
    element.textContent = originalText;
    element.disabled = false;
    updateUI();
  }, duration);
}

// Update UI Based on State
function updateUI() {
  console.log('Current submissions:', userData.totalCodeSubmissions);
  submissionsCountEl.textContent = `${userData.totalCodeSubmissions}/100`;
  
  if (userData.claimedReward) {
    submissionsRewardButton.textContent = '✓ Reward Claimed';
    submissionsRewardButton.disabled = true;
    submissionsRewardButton.classList.add('claimed');
  } else if (userData.totalCodeSubmissions >= 100) {
    submissionsRewardButton.textContent = 'Claim +5 $BLACK';
    submissionsRewardButton.disabled = false;
    submissionsRewardButton.classList.remove('claimed');
  } else {
    submissionsRewardButton.textContent = `${100 - userData.totalCodeSubmissions} more needed`;
    submissionsRewardButton.disabled = true;
    submissionsRewardButton.classList.remove('claimed');
  }
}

// Fetch User Data from Backend
async function fetchUserData() {
  try {
    const payload = initializeUser();
    console.log('Fetching data for user:', payload.telegramId);
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    console.log('Backend response:', data);
    
    if (data.error) {
      console.error('Backend error:', data.message);
      showTemporaryMessage(submissionsRewardButton, 'Error loading data', 2000);
      return;
    }
    
    userData = {
      totalCodeSubmissions: data.total_code_submissions || 0,
      claimedReward: data.claimed_reward || false,
      balance: data.balance || 0
    };
    
    console.log('Updated user data:', userData);
    updateUI();
  } catch (err) {
    console.error('Failed to fetch user data:', err);
    showTemporaryMessage(submissionsRewardButton, 'Connection error', 2000);
  }
}

// Claim Submissions Reward
async function claimSubmissionsReward() {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_submissions_reward'
    };
    
    submissionsRewardButton.textContent = 'Processing...';
    submissionsRewardButton.disabled = true;
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    console.log('Claim reward response:', data);
    
    if (data.success) {
      userData.claimedReward = true;
      userData.balance = data.balance;
      showTemporaryMessage(
        submissionsRewardButton, 
        `+5 $BLACK! Total: ${data.balance.toFixed(3)}`, 
        3000
      );
    } else {
      showTemporaryMessage(submissionsRewardButton, data.message || 'Failed to claim', 2000);
    }
    
    // Refresh data after claiming
    await fetchUserData();
  } catch (err) {
    console.error('Claim reward failed:', err);
    showTemporaryMessage(submissionsRewardButton, 'Error claiming', 2000);
    updateUI();
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  // Add event listeners
  submissionsRewardButton.addEventListener('click', claimSubmissionsReward);
  
  // Initial data load
  try {
    await fetchUserData();
  } catch (err) {
    console.error('Initialization error:', err);
  }
  
  // Refresh data every 30 seconds
  setInterval(async () => {
    await fetchUserData();
  }, 30000);
});