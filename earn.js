import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// Elements
const usernameEl = document.getElementById('username');
const dailyButton = document.getElementById('dailyButton');
const twitterButton = document.getElementById('twitterButton');
const codeSubButton = document.getElementById('codeSubButton');
const codeSubProgress = document.getElementById('codeSubProgress');

// State
let userData = {
  username: '',
  totalCodeSubmissions: 0,
  hasClaimedCodeReward: false,
  hasClaimedDaily: false,
  hasFollowedTwitter: false
};

// Utilities
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const username = user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return {
      username,
      telegramId: user.id.toString(),
      referralCode: new URLSearchParams(window.location.search).get('ref') || ''
    };
  }
  
  let username = localStorage.getItem('guestUsername');
  if (!username) {
    username = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestUsername', username);
  }
  
  return {
    username,
    telegramId: '',
    referralCode: new URLSearchParams(window.location.search).get('ref') || ''
  };
}

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

function updateUI() {
  usernameEl.textContent = userData.username;
  codeSubProgress.textContent = `${userData.totalCodeSubmissions}/100`;
  
  // Update buttons state
  dailyButton.disabled = userData.hasClaimedDaily;
  dailyButton.className = userData.hasClaimedDaily ? 'task-button completed' : 'task-button';
  dailyButton.textContent = userData.hasClaimedDaily ? 'Claimed' : 'Claim Daily Bonus';
  
  twitterButton.disabled = userData.hasFollowedTwitter;
  twitterButton.className = userData.hasFollowedTwitter ? 'task-button completed' : 'task-button';
  twitterButton.textContent = userData.hasFollowedTwitter ? 'Followed' : 'Follow';
  
  codeSubButton.disabled = userData.totalCodeSubmissions < 100 || userData.hasClaimedCodeReward;
  codeSubButton.className = userData.hasClaimedCodeReward ? 'task-button completed' : 'task-button';
  codeSubButton.textContent = userData.hasClaimedCodeReward ? 'Claimed' : 'Claim Reward';
}

async function fetchUserData() {
  try {
    const payload = initializeUser();
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error) {
      console.error('Backend error:', data.message);
      return;
    }
    
    userData.username = data.username || payload.username;
    userData.totalCodeSubmissions = data.total_code_submissions || 0;
    userData.hasClaimedCodeReward = data.has_claimed_code_reward || false;
    userData.hasClaimedDaily = data.has_claimed_daily || false;
    userData.hasFollowedTwitter = data.has_followed_twitter || false;
    
    updateUI();
    return data;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
  }
}

// Event Listeners
dailyButton.addEventListener('click', async () => {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_daily'
    };
    
    showTemporaryMessage(dailyButton, 'Processing...', 2000);
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      userData.hasClaimedDaily = true;
      updateUI();
      showTemporaryMessage(dailyButton, 'Daily claimed!', 2000);
    } else {
      showTemporaryMessage(dailyButton, data.message || 'Failed!', 2000);
    }
  } catch (err) {
    console.error('Claim failed:', err);
    showTemporaryMessage(dailyButton, 'Error!', 2000);
  }
});

twitterButton.addEventListener('click', async () => {
  try {
    const payload = {
      ...initializeUser(),
      action: 'follow_twitter'
    };
    
    showTemporaryMessage(twitterButton, 'Processing...', 2000);
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      userData.hasFollowedTwitter = true;
      updateUI();
      showTemporaryMessage(twitterButton, 'Followed!', 2000);
    } else {
      showTemporaryMessage(twitterButton, data.message || 'Failed!', 2000);
    }
  } catch (err) {
    console.error('Follow failed:', err);
    showTemporaryMessage(twitterButton, 'Error!', 2000);
  }
});

codeSubButton.addEventListener('click', async () => {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_code_reward'
    };
    
    showTemporaryMessage(codeSubButton, 'Processing...', 2000);
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      userData.hasClaimedCodeReward = true;
      updateUI();
      showTemporaryMessage(codeSubButton, 'Reward claimed!', 2000);
    } else {
      showTemporaryMessage(codeSubButton, data.message || 'Failed!', 2000);
    }
  } catch (err) {
    console.error('Claim failed:', err);
    showTemporaryMessage(codeSubButton, 'Error!', 2000);
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  await fetchUserData();
});