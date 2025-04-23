import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

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
const subsOfCodeEl = document.getElementById('subsOfCode');
const sendBtn = document.getElementById('sendButton');
const codePopularityTask = document.getElementById('codePopularityTask');
const codePopularityRewardBtn = document.getElementById('codePopularityRewardButton');

// State
let userData = {
  isMining: false,
  balance: 0,
  totalMined: 0,
  miningPower: 1.0,
  nextReset: null,
  dailyCode: '',
  submittedCodes: [],
  codeSubmissionsToday: 0,
  totalCodeSubmissions: 0
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
  localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
  localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
}

function loadMiningState() {
  const storedReset = localStorage.getItem('nextReset');
  const storedIsMining = localStorage.getItem('isMining') === 'true';
  const storedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
  const storedSubmissions = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
  
  if (storedReset && new Date() < new Date(storedReset)) {
    userData.isMining = storedIsMining;
    userData.nextReset = storedReset;
    userData.submittedCodes = storedCodes;
    userData.codeSubmissionsToday = storedSubmissions;
  } else {
    localStorage.removeItem('isMining');
    localStorage.removeItem('nextReset');
    localStorage.removeItem('submittedCodes');
    localStorage.removeItem('codeSubmissionsToday');
    userData.isMining = false;
    userData.submittedCodes = [];
    userData.codeSubmissionsToday = 0;
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
  subsOfCodeEl.textContent = `${userData.codeSubmissionsToday}/10`;
  
  // Show/hide code popularity task
  if (userData.totalCodeSubmissions >= 100) {
    codePopularityTask.style.display = 'block';
  } else {
    codePopularityTask.style.display = 'none';
  }
  
  // Disable submit button if code is invalid
  const code = codeInput.value.trim();
  submitBtn.disabled = code.length !== 10 || 
                      code === userData.dailyCode || 
                      userData.submittedCodes.includes(code);
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

    userData.isMining = data.active_session || false;
    userData.balance = data.balance || 0;
    userData.totalMined = data.total_mined || 0;
    userData.miningPower = data.mining_power || 1.0;
    userData.nextReset = data.next_reset || getDefaultResetTime();
    userData.dailyCode = data.daily_code || '';
    userData.submittedCodes = data.submitted_codes || [];
    userData.codeSubmissionsToday = data.code_submissions_today || 0;
    userData.totalCodeSubmissions = data.total_code_submissions || 0;

    if (data.total_miners) totalMinersEl.textContent = data.total_miners;

    saveMiningState();
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

    if (data.error || !data.updated?.active_session) {
      console.error('Mining error:', data.message);
      stopMining();
      return;
    }

    userData.balance = data.updated.balance;
    userData.totalMined = data.total_mined;
    userData.miningPower = data.updated.mining_power;
    userData.nextReset = data.next_reset || userData.nextReset;
    userData.codeSubmissionsToday = data.code_submissions_today || userData.codeSubmissionsToday;
    userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;

    updateUI();
  } catch (err) {
    console.error('Mining failed:', err);
    stopMining();
  }
}

async function startMining() {
  if (userData.isMining || isAfterResetTime()) return;
  
  try {
    const payload = {
      ...initializeUser(),
      action: 'start_mining'
    };

    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');

    if (data.error || !data.started) {
      alert(data.message || 'Failed to start mining');
      return;
    }

    userData.isMining = true;
    userData.nextReset = data.next_reset || userData.nextReset;
    userData.codeSubmissionsToday = data.code_submissions_today || 0;
    userData.totalCodeSubmissions = data.total_code_submissions || 0;
    saveMiningState();
    updateUI();
    
    await mineCoins();
    mineInterval = setInterval(mineCoins, 60000);
  } catch (err) {
    console.error('Start mining failed:', err);
    stopMining();
  }
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  userData.isMining = false;
  saveMiningState();
  updateUI();
}

// Event Listeners
mineBtn.addEventListener('click', async () => {
  if (!userData.isMining && !isAfterResetTime()) {
    await startMining();
  } else if (isAfterResetTime()) {
    alert('Mining reset — please start again!');
    await fetchUserData();
  }
});

copyBtn.addEventListener('click', () => {
  const text = userData.dailyCode || dailyCodeEl.textContent;
  if (!text) return alert('No code to copy');
  navigator.clipboard.writeText(text)
    .then(() => alert('Code copied to clipboard!'))
    .catch(() => alert('Failed to copy code.'));
});

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
      userData.submittedCodes = [...userData.submittedCodes, submittedCode];
      userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
      
      if (data.owner_submissions !== undefined) {
        userData.codeSubmissionsToday = data.owner_submissions;
      }
      
      saveMiningState();
      updateUI();
      alert(data.message || 'Code submitted successfully!');
      codeInput.value = '';
    } else {
      alert(data.message || 'Code submission failed');
    }
  } catch (err) {
    console.error('Code submission failed:', err);
    alert(err.message || 'Failed to submit code.');
  }
});

sendBtn.addEventListener('click', () => {
  const code = userData.dailyCode || dailyCodeEl.textContent;
  
  if (!code || code === '…') {
    alert('No mining code available yet');
    return;
  }

  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    const message = `Use my $BLACK code for today: ${code}`;
    tg.sendData(message);
    tg.close();
  } else {
    alert(`Your current mining code: ${code}\n(Sharing works best in Telegram)`);
  }
});

codePopularityRewardBtn.addEventListener('click', async () => {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_reward',
      reward_type: 'code_popularity'
    };

    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');

    if (data.success) {
      userData.balance = data.balance;
      updateUI();
      codePopularityTask.style.display = 'none';
      alert('Reward claimed successfully!');
    } else {
      alert(data.message || 'Failed to claim reward');
    }
  } catch (err) {
    console.error('Claim reward failed:', err);
    alert('Failed to claim reward');
  }
});

codeInput.addEventListener('input', () => {
  updateUI();
});

// Initialize
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
    await startMining();
  }

  setInterval(updateCountdown, 1000);
});