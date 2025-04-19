import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Appwrite setup
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// Elements
const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const powerEl = document.getElementById('power');
const mineBtn = document.getElementById('mineButton');
const totalMinersEl = document.getElementById('totalminers');
const countdownEl = document.getElementById('countdown');
const codeInput = document.getElementById('codeInput');
const copyBtn = document.getElementById('copyButton');
const submitBtn = document.getElementById('submitButton');
const dailyCodeEl = document.getElementById('dailyCode');

// State
let userData = {
  isMining: false,
  balance: 0,
  totalMined: 0,
  miningPower: 1.0,
  nextReset: null,
  dailyCode: '',
};

let mineInterval = null;

// Utilities
function getDefaultResetTime() {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setUTCHours(12, 0, 0, 0);
  if (now >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  return resetTime.toISOString();
}

function isAfterResetTime() {
  if (!userData.nextReset) return false;
  return new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
  localStorage.setItem('isMining', JSON.stringify(userData.isMining));
  localStorage.setItem('nextReset', userData.nextReset);
}

function loadMiningState() {
  const storedReset = localStorage.getItem('nextReset');
  const storedIsMining = localStorage.getItem('isMining') === 'true';
  if (storedReset && new Date() < new Date(storedReset)) {
    userData.isMining = storedIsMining;
    userData.nextReset = storedReset;
  } else {
    localStorage.removeItem('isMining');
    localStorage.removeItem('nextReset');
  }
}

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

function updateUI() {
  balanceEl.textContent = userData.balance.toFixed(3);
  minedEl.textContent = userData.totalMined.toFixed(3);
  powerEl.textContent = userData.miningPower.toFixed(1);
  mineBtn.textContent = userData.isMining ? 'Mining...' : 'Start Mining';
  mineBtn.disabled = userData.isMining || isAfterResetTime();
  if (userData.dailyCode) dailyCodeEl.textContent = userData.dailyCode;
}

function updateCountdown() {
  if (!userData.nextReset) return;
  const now = new Date();
  const nextReset = new Date(userData.nextReset);
  const timeUntilReset = nextReset - now;

  if (timeUntilReset <= 0) {
    countdownEl.textContent = 'Reset time!';
    if (userData.isMining) stopMining();
    return;
  }

  const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilReset / (1000 * 60)) % 60);
  const seconds = Math.floor((timeUntilReset / 1000) % 60);

  countdownEl.textContent = `Next reset: ${hours}h ${minutes}m ${seconds}s`;
}

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

    userData.balance = data.balance || 0;
    userData.totalMined = data.total_mined || 0;
    userData.miningPower = data.mining_power || 1.0;
    userData.nextReset = data.next_reset || getDefaultResetTime();
    userData.dailyCode = data.daily_code || '';

    if (data.total_miners) totalMinersEl.textContent = data.total_miners;

    updateUI();
    return data;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
  }
}

async function mineCoins() {
  if (isAfterResetTime()) {
    stopMining();
    return;
  }

  try {
    const payload = initializeUser();
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');

    if (data.error) {
      console.error('Mining error:', data.message);
      stopMining();
      return;
    }

    userData.balance = data.balance;
    userData.totalMined = data.total_mined;
    userData.miningPower = data.mining_power;
    userData.nextReset = data.next_reset || userData.nextReset;

    updateUI();
  } catch (err) {
    console.error('Mining failed:', err);
    stopMining();
  }
}

async function startMining() {
  if (userData.isMining || isAfterResetTime()) return;
  userData.isMining = true;
  saveMiningState();
  updateUI();

  await mineCoins();
  mineInterval = setInterval(mineCoins, 60000);
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  userData.isMining = false;
  saveMiningState();
  updateUI();
}

async function handleUpgrade(power, price) {
  if (userData.balance < price) {
    alert('Not enough balance for this upgrade');
    return;
  }

  try {
    const payload = {
      ...initializeUser(),
      action: 'upgrade',
      power: power,
      price: price
    };

    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');

    if (data.success) {
      userData.balance = data.balance;
      userData.miningPower = data.mining_power;
      updateUI();
      alert('Upgrade successful!');
    } else {
      alert('Upgrade failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Upgrade error:', err);
    alert('Failed to process upgrade');
  }
}

// COPY button logic
copyBtn.addEventListener('click', () => {
  const text = userData.dailyCode || dailyCodeEl.textContent;
  if (!text) return alert('No code to copy');
  navigator.clipboard.writeText(text)
    .then(() => alert('Code copied to clipboard!'))
    .catch(() => alert('Failed to copy code.'));
});

// SUBMIT button logic
submitBtn.addEventListener('click', async () => {
  const submittedCode = codeInput.value.trim();
  if (!submittedCode) return alert('Please enter a code to submit');

  try {
    const payload = {
      ...initializeUser(),
      action: 'submit_code',
      code: submittedCode
    };

    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');

    if (data.success) {
      userData.balance = data.balance;
      userData.miningPower = data.mining_power;
      updateUI();
      alert('Code submitted successfully!');
    } else {
      alert(data.message || 'Code submission failed');
    }
  } catch (err) {
    console.error('Code submission failed:', err);
    alert('Failed to submit code.');
  }
});

// Input focus scroll handler (moved from HTML)
codeInput.addEventListener('focus', () => {
  setTimeout(() => {
    const rect = codeInput.getBoundingClientRect();
    const offsetY = window.scrollY + rect.top - 100;
    window.scrollTo({ top: offsetY, behavior: 'smooth' });
  }, 300);
});

// Mining button
mineBtn.addEventListener('click', () => {
  if (!userData.isMining && !isAfterResetTime()) {
    startMining();
  } else if (isAfterResetTime()) {
    alert('Mining reset — please start again!');
  }
});

// Power buttons (if any exist)
document.querySelectorAll('.power-buy').forEach(button => {
  button.addEventListener('click', () => {
    const power = parseFloat(button.dataset.power);
    const price = parseFloat(button.dataset.price);
    handleUpgrade(power, price);
  });
});

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  loadMiningState();
  await fetchUserData();

  if (userData.isMining && !isAfterResetTime()) {
    startMining();
  }

  setInterval(updateCountdown, 1000);
});
