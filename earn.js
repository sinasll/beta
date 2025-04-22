import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// DOM Elements
const usernameEl = document.getElementById('username');
const totalSubmissionsEl = document.getElementById('totalSubmissions');
const dailyButton = document.getElementById('dailyButton');
const twitterButton = document.getElementById('twitterButton');
const submissionsRewardButton = document.getElementById('submissionsRewardButton');

// User Data State
let userData = {
  username: '',
  telegramId: '',
  totalCodeSubmissions: 0,
  hasClaimedSubmissionsReward: false,
  balance: 0,
  miningPower: 1.0
};

// Initialize User Data
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const username = user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return {
      username,
      telegramId: user.id.toString()
    };
  }
  
  let username = localStorage.getItem('guestUsername');
  if (!username) {
    username = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestUsername', username);
  }
  
  return {
    username,
    telegramId: ''
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
  totalSubmissionsEl.textContent = userData.totalCodeSubmissions;
  
  const submissionsTask = document.getElementById('submissionsTask');
  const rewardButton = document.getElementById('submissionsRewardButton');
  
  if (userData.hasClaimedSubmissionsReward) {
    submissionsTask.classList.add('task-completed');
    rewardButton.textContent = '✓ Reward Claimed';
    rewardButton.disabled = true;
  } else if (userData.totalCodeSubmissions >= 100) {
    submissionsTask.classList.add('task-completed');
    rewardButton.textContent = 'Claim +5 $BLACK';
    rewardButton.disabled = false;
  } else {
    submissionsTask.classList.remove('task-completed');
    rewardButton.textContent = `${100 - userData.totalCodeSubmissions} more needed`;
    rewardButton.disabled = true;
  }
}

// Fetch User Data from Backend
async function fetchUserData() {
  try {
    const payload = initializeUser();
    usernameEl.textContent = payload.username;
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error) {
      console.error('Backend error:', data.message);
      return;
    }
    
    userData = {
      ...userData,
      username: payload.username,
      telegramId: payload.telegramId,
      totalCodeSubmissions: data.total_code_submissions || 0,
      hasClaimedSubmissionsReward: data.has_claimed_submissions_reward || false,
      balance: data.balance || 0,
      miningPower: data.mining_power || 1.0
    };
    
    updateUI();
    return data;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
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
    
    if (data.success) {
      userData.hasClaimedSubmissionsReward = true;
      userData.balance = data.balance;
      showTemporaryMessage(
        submissionsRewardButton, 
        `+5 $BLACK! Total: ${data.balance.toFixed(3)}`, 
        3000
      );
    } else {
      showTemporaryMessage(submissionsRewardButton, data.message || 'Failed to claim', 2000);
    }
    
    updateUI();
  } catch (err) {
    console.error('Claim reward failed:', err);
    showTemporaryMessage(submissionsRewardButton, 'Error claiming', 2000);
    updateUI();
  }
}

// Event Listeners
submissionsRewardButton.addEventListener('click', claimSubmissionsReward);

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  await fetchUserData();
});z