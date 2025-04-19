import { Client, Functions } from "https://esm.sh/appwrite@13.0.0"; 

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

let isMining = false;
let userBalance = 0;
let totalMined = 0;
let mineInterval = null;
let miningPower = 1.0;

const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const powerEl = document.getElementById('power');
const mineBtn = document.getElementById('mineButton');
const totalMinersEl = document.getElementById('totalminers');

// Initialize user data from localStorage or generate new
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  // Check if we have a Telegram user
  if (user) {
    const username = user?.username || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    localStorage.setItem('username', username);
    localStorage.setItem('telegramId', user.id.toString());
    return {
      username,
      telegramId: user.id.toString(),
      referralCode: localStorage.getItem('referral') || ''
    };
  }

  // For non-Telegram users, generate or retrieve guest username
  let username = localStorage.getItem('guestUsername');
  if (!username) {
    username = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestUsername', username);
  }

  return {
    username,
    telegramId: '',
    referralCode: localStorage.getItem('referral') || ''
  };
}

// Check if it's time to reset mining (after 12:00 UTC)
function isResetTime() {
  const now = new Date();
  const currentUTCHours = now.getUTCHours();
  return currentUTCHours >= 12;
}

// Calculate time until next reset (12:00 UTC)
function getTimeUntilReset() {
  const now = new Date();
  const nextReset = new Date(now);
  
  if (now.getUTCHours() >= 12) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }
  
  nextReset.setUTCHours(12, 0, 0, 0);
  
  return nextReset - now;
}

// Update countdown timer
function updateCountdown() {
  const countdownEl = document.getElementById('countdown');
  const timeUntilReset = getTimeUntilReset();
  
  const hours = Math.floor((timeUntilReset / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeUntilReset / (1000 * 60)) % 60);
  const seconds = Math.floor((timeUntilReset / 1000) % 60);
  
  countdownEl.textContent = `Daily reset in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Start countdown timer
function startCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Check mining status from localStorage
function checkSavedMiningStatus() {
  const savedStatus = localStorage.getItem('miningStatus');
  if (savedStatus === 'active' && !isResetTime()) {
    startMining();
  }
}

async function fetchUserData() {
  try {
    const body = initializeUser();
    usernameEl.textContent = body.username;

    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(body));
    let data = {};

    try {
      data = JSON.parse(execution.responseBody || '{}');
    } catch (e) {
      console.warn('Failed to parse responseBody:', execution.responseBody);
    }

    userBalance = data.balance || 0;
    totalMined = data.total_mined || 0;
    miningPower = data.mining_power || 1.0;

    balanceEl.textContent = userBalance.toFixed(3);
    minedEl.textContent = totalMined.toFixed(3);
    powerEl.textContent = miningPower.toFixed(1);

    // Update total miners (simplified - in a real app you'd fetch this from backend)
    if (data.total_miners) {
      totalMinersEl.textContent = data.total_miners;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
    return {};
  }
}

async function startMining() {
  if (isMining || isResetTime()) return;
  
  isMining = true;
  mineBtn.textContent = 'Mining . . .';
  mineBtn.disabled = true;
  localStorage.setItem('miningStatus', 'active');

  // Initial mining call
  await mineCoins();

  // Set up interval for continuous mining
  mineInterval = setInterval(mineCoins, 60000); // Mine every minute
}

async function mineCoins() {
  if (isResetTime()) {
    stopMining();
    return;
  }

  try {
    const body = initializeUser();
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(body));

    let data = {};
    try {
      data = JSON.parse(execution.responseBody || '{}');
    } catch (e) {
      console.warn('Failed to parse responseBody:', execution.responseBody);
    }

    const increment = data.mined || 0;

    userBalance += increment;
    totalMined += increment;

    balanceEl.textContent = userBalance.toFixed(3);
    minedEl.textContent = totalMined.toFixed(3);
  } catch (err) {
    console.error('Mining error:', err);
    stopMining();
  }
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  isMining = false;
  mineBtn.textContent = 'Start Mining';
  mineBtn.disabled = false;
  localStorage.removeItem('miningStatus');
}

// Handle mining button click
mineBtn.addEventListener('click', () => {
  if (!isMining && !isResetTime()) {
    startMining();
  } else if (isResetTime()) {
    alert('Mining has reset for the day. You can start mining again now!');
    stopMining();
  }
});

// Handle power upgrades
document.querySelectorAll('.power-buy').forEach(button => {
  button.addEventListener('click', async () => {
    const power = parseFloat(button.dataset.power);
    const price = parseFloat(button.dataset.price);
    
    if (userBalance >= price) {
      try {
        const body = {
          ...initializeUser(),
          action: 'upgrade',
          power: power,
          price: price
        };
        
        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(body));
        const data = JSON.parse(execution.responseBody || '{}');
        
        if (data.success) {
          userBalance -= price;
          miningPower += power;
          balanceEl.textContent = userBalance.toFixed(3);
          powerEl.textContent = miningPower.toFixed(1);
          alert('Upgrade successful!');
          closeUpgradeModal();
        } else {
          alert('Upgrade failed: ' + (data.message || 'Unknown error'));
        }
      } catch (err) {
        console.error('Upgrade error:', err);
        alert('Failed to process upgrade');
      }
    } else {
      alert('Not enough $BLACK for this upgrade');
    }
  });
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initializeUser();
  fetchUserData();
  startCountdown();
  checkSavedMiningStatus();
  
  // Check if it's reset time and disable mining if needed
  if (isResetTime()) {
    stopMining();
  }
});