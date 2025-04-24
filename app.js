// --------------------------------------------------
// Imports & Appwrite Client Initialization
// --------------------------------------------------
import { Client, Functions, Query } from "https://esm.sh/appwrite@13.0.0";
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");
const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// --------------------------------------------------
// DOM Elements
// --------------------------------------------------
const minedEl             = document.getElementById('mined');
const balanceEl           = document.getElementById('balance');
const usernameEl          = document.getElementById('username');
const powerEl             = document.getElementById('power');
const mineBtn             = document.getElementById('mineButton');
const totalMinersEl       = document.getElementById('totalminers');
const countdownEl         = document.getElementById('countdown');
const miningEndEl         = document.getElementById('miningend');
const codeInput           = document.getElementById('codeInput');
const copyBtn             = document.getElementById('copyButton');
const submitBtn           = document.getElementById('submitButton');
const dailyCodeEl         = document.getElementById('dailyCode');
const subsOfCodeEl        = document.getElementById('subsOfCode');
const totalOfCodeEl       = document.getElementById('totalOfCode');

// --------------------------------------------------
// Application State
// --------------------------------------------------
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
let mineInterval   = null;
let miningEndDate  = null; // ISO string for 90-day end
let miningEnded    = false;

// --------------------------------------------------
// Utility Functions
// --------------------------------------------------
function getDefaultResetTime() {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setUTCHours(12, 0, 0, 0);
  if (now >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  return resetTime.toISOString();
}

function isAfterResetTime() {
  return userData.nextReset && new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
  localStorage.setItem('isMining', JSON.stringify(userData.isMining));
  localStorage.setItem('nextReset', userData.nextReset);
  localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
  localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
  localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions.toString());
}

function loadMiningState() {
  const storedReset = localStorage.getItem('nextReset');
  const now = new Date();
  if (storedReset && now < new Date(storedReset)) {
    userData.isMining = localStorage.getItem('isMining') === 'true';
    userData.nextReset = storedReset;
    userData.submittedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
    userData.codeSubmissionsToday = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
    userData.totalCodeSubmissions = parseInt(localStorage.getItem('totalCodeSubmissions') || '0');
  } else {
    ['isMining','nextReset','submittedCodes','codeSubmissionsToday','totalCodeSubmissions'].forEach(key =>
      localStorage.removeItem(key)
    );
    userData.isMining = false;
    userData.submittedCodes = [];
    userData.codeSubmissionsToday = 0;
    userData.totalCodeSubmissions = 0;
  }
}

function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const username = user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const query = new URLSearchParams(location.search);
    return { username, telegramId: String(user.id), referralCode: query.get('ref') || '' };
  }
  let guest = localStorage.getItem('guestUsername');
  if (!guest) {
    guest = 'guest_' + Math.random().toString(36).slice(2,7);
    localStorage.setItem('guestUsername', guest);
  }
  const query = new URLSearchParams(location.search);
  return { username: guest, telegramId: '', referralCode: query.get('ref') || '' };
}

// --------------------------------------------------
// UI Update Functions
// --------------------------------------------------
function updateUI() {
  balanceEl.textContent       = userData.balance.toFixed(3);
  minedEl.textContent         = userData.totalMined.toFixed(3);
  powerEl.textContent         = userData.miningPower.toFixed(1);

  mineBtn.textContent         = miningEnded
    ? 'Mining Ended'
    : (userData.isMining ? 'Mining...' : 'Start Mining');
  mineBtn.disabled            = userData.isMining || isAfterResetTime() || miningEnded;

  dailyCodeEl.textContent     = userData.dailyCode;
  subsOfCodeEl.textContent    = `${userData.codeSubmissionsToday}/10`;
  totalOfCodeEl.textContent   = userData.totalCodeSubmissions;

  if (userData.nextReset) updateDailyCountdown();
  if (miningEndDate) updateMiningCountdown();
}

function updateDailyCountdown() {
  const diff = new Date(userData.nextReset) - Date.now();
  if (diff <= 0) {
    countdownEl.textContent = 'Reset time!';
    if (userData.isMining) stopMining();
  } else {
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    countdownEl.textContent = `Daily reset in ${h}h ${m}m ${s}s`;
  }
}

function updateMiningCountdown() {
  const diff = new Date(miningEndDate) - Date.now();
  if (diff <= 0) {
    miningEndEl.textContent = 'Ended';
    miningEnded = true;
    mineBtn.disabled = true;
  } else {
    const days = Math.floor(diff/(1000*60*60*24));
    const hrs  = Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    const mins = Math.floor((diff%(1000*60*60))/(1000*60));
    const secs = Math.floor((diff%(1000*60))/1000);
    miningEndEl.textContent = `${days}d ${hrs}h ${mins}m ${secs}s`;
  }
}

// --------------------------------------------------
// Appwrite Function Calls
// --------------------------------------------------
async function fetchUserData() {
  loadMiningState();
  const payload = initializeUser();
  usernameEl.textContent = payload.username;
  try {
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error) throw new Error(data.message);

    Object.assign(userData, {
      isMining: data.active_session,
      balance: data.balance,
      totalMined: data.total_mined,
      miningPower: data.mining_power,
      nextReset: data.next_reset || getDefaultResetTime(),
      dailyCode: data.daily_code,
      submittedCodes: data.submitted_codes,
      codeSubmissionsToday: data.code_submissions_today,
      totalCodeSubmissions: data.total_code_submissions
    });
    miningEndDate = data.mining_end_date;
    miningEnded  = data.mining_ended;
    if (data.total_miners) totalMinersEl.textContent = Number(data.total_miners).toLocaleString();

    saveMiningState();
    updateUI();
    return data;
  } catch (err) {
    console.error('fetchUserData error:', err);
  }
}

async function mineCoins() {
  if (isAfterResetTime() || miningEnded) return stopMining();
  const payload = initializeUser();
  try {
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error || !data.updated.active_session) throw new Error(data.message);

    Object.assign(userData, {
      balance: data.updated.balance,
      totalMined: data.total_mined,
      miningPower: data.updated.mining_power,
      nextReset: data.next_reset,
      codeSubmissionsToday: data.code_submissions_today,
      totalCodeSubmissions: data.total_code_submissions
    });
    miningEnded = data.mining_ended;

    saveMiningState();
    updateUI();
  } catch (err) {
    console.error('mineCoins error:', err);
    stopMining();
  }
}

async function startMining() {
  if (userData.isMining || isAfterResetTime() || miningEnded) return;
  try {
    const payload = { ...initializeUser(), action: 'start_mining' };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error || !data.started) throw new Error(data.message);

    Object.assign(userData, {
      isMining: true,
      nextReset: data.next_reset,
      codeSubmissionsToday: data.code_submissions_today,
      totalCodeSubmissions: data.total_code_submissions
    });
    miningEndDate = data.mining_end_date;
    miningEnded  = data.mining_ended;

    saveMiningState();
    updateUI();

    await mineCoins();
    mineInterval = setInterval(mineCoins, 60000);
  } catch (err) {
    console.error('startMining error:', err);
    alert(err.message || 'Failed to start mining');
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

// --------------------------------------------------
// Event Listeners & Initialization
// --------------------------------------------------
function setupEventListeners() {
  mineBtn.addEventListener('click', async () => {
    if (miningEnded) return alert('Mining period ended');
    if (!userData.isMining) await startMining();
    else if (isAfterResetTime()) {
      alert('Daily reset — please start again');
      await fetchUserData();
    }
  });

  copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(dailyCodeEl.textContent);
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
  });

  submitBtn?.addEventListener('click', async () => {
    if (miningEnded) return alert('Code submissions closed');
    const code = codeInput.value.trim();
    if (!code) return alert('Enter a code');
    try {
      const payload = { ...initializeUser(), action: 'submit_code', code };
      const exec    = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
      const data    = JSON.parse(exec.responseBody || '{}');
      if (!data.success) throw new Error(data.message);

      userData.balance             = data.balance;
      userData.submittedCodes.push(code);
      userData.codeSubmissionsToday = data.owner_submissions;
      userData.totalCodeSubmissions = data.total_code_submissions;

      saveMiningState();
      updateUI();
      alert(data.message || 'Submitted!');
      codeInput.value = '';
    } catch (err) {
      console.error('submit_code error:', err);
      alert(err.message || 'Submission failed');
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchUserData();
  setupEventListeners();
  setInterval(() => {
    updateDailyCountdown();
    updateMiningCountdown();
  }, 1000);
});
