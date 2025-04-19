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
const appContent = document.getElementById('app-content');
const errorMessage = document.getElementById('error-message');

// Check if running on Telegram mobile
function isTelegramMobile() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  
  const platform = tg.platform?.toLowerCase();
  return platform === 'android' || platform === 'ios';
}

// Initialize user data from Telegram
function initializeUser() {
  if (!isTelegramMobile()) return null;
  
  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;
  
  if (!user) {
    console.error('No Telegram user data found');
    return null;
  }

  const username = user?.username || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const telegramId = user.id.toString();
  
  localStorage.setItem('username', username);
  localStorage.setItem('telegramId', telegramId);
  
  return {
    username,
    telegramId,
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
  if (!isTelegramMobile()) return;
  
  try {
    const body = initializeUser();
    if (!body) return;
    
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
  if (!isTelegramMobile() || isMining || isResetTime()) return;
  
  isMining = true;
  mineBtn.textContent = 'Mining . . .';
  mineBtn.disabled = true;
  localStorage.setItem('miningStatus', 'active');

  await mineCoins();
  mineInterval = setInterval(mineCoins, 60000);
}

async function mineCoins() {
  if (!isTelegramMobile() || isResetTime()) {
    stopMining();
    return;
  }

  try {
    const body = initializeUser();
    if (!body) return;
    
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
  if (!isTelegramMobile()) return;
  
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
    if (!isTelegramMobile()) return;
    
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
  if (!isTelegramMobile()) {
    appContent.style.display = 'none';
    errorMessage.style.display = 'block';
    return;
  }

  const tg = window.Telegram.WebApp;
  tg.expand();
  tg.ready();
  tg.enableClosingConfirmation();

  initializeUser();
  fetchUserData();
  startCountdown();
  checkSavedMiningStatus();
  
  if (isResetTime()) {
    stopMining();
  }
});