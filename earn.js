import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "68062657001a181032e7";

// DOM Elements
const submissionsRewardButton = document.getElementById('submissionsRewardButton');
const submissionsCountEl = document.getElementById('submissionsCount');

// User Data State
let userData = {
  totalCodeSubmissions: 0,
  claimedReward: false,
  balance: 0
};

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
  submissionsCountEl.textContent = `${userData.totalCodeSubmissions}/100`;
  
  if (userData.claimedReward) {
    submissionsRewardButton.textContent = '✓ Reward Claimed';
    submissionsRewardButton.disabled = true;
  } else if (userData.totalCodeSubmissions >= 100) {
    submissionsRewardButton.textContent = 'Claim +5 $BLACK';
    submissionsRewardButton.disabled = false;
  } else {
    submissionsRewardButton.textContent = `${100 - userData.totalCodeSubmissions} more needed`;
    submissionsRewardButton.disabled = true;
  }
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
    
    userData = {
      totalCodeSubmissions: data.total_code_submissions || 0,
      claimedReward: data.claimed_reward || false,
      balance: data.balance || 0
    };
    
    updateUI();
  } catch (err) {
    console.error('Failed to fetch user data:', err);
  }
}

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
    
    updateUI();
  } catch (err) {
    console.error('Claim reward failed:', err);
    showTemporaryMessage(submissionsRewardButton, 'Error claiming', 2000);
    updateUI();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  submissionsRewardButton.addEventListener('click', claimSubmissionsReward);
  await fetchUserData();
});