const API_URL = 'https://fra.cloud.appwrite.io/v1/functions/68062657001a181032e7/executions';
const PROJECT_ID = '6800cf6c0038c2026f07';

document.addEventListener('DOMContentLoaded', () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Retrieve Telegram user info
  const user = tg.initDataUnsafe.user || {};
  const telegramId = user.id;
  const username = user.username || user.first_name || `user_${telegramId}`;

  // Cache DOM elements (ensure IDs match HTML exactly)
  const usernameEl = document.getElementById('username');
  const balanceEl = document.getElementById('balance');
  const powerEl = document.getElementById('power');
  const minedEl = document.getElementById('mined');
  const totalminersEl = document.getElementById('totalminers'); // lowercase
  const miningEndEl = document.getElementById('miningend');
  const countdownEl = document.getElementById('countdown');
  const mineButton = document.getElementById('mineButton');
  const dailyCodeEl = document.getElementById('dailyCode');
  const subsOfCodeEl = document.getElementById('subsOfCode');
  const totalOfCodeEl = document.getElementById('totalOfCode');
  const copyButton = document.getElementById('copyButton');
  const sendButton = document.getElementById('sendButton');
  const pasteButton = document.getElementById('pasteButton');
  const submitButton = document.getElementById('submitButton');
  const codeInput = document.getElementById('codeInput');

  let nextResetTime = null;
  let miningEndTime = null;
  let resetTimer;
  let endTimer;

  // Display the Telegram username
  usernameEl.textContent = username;

  // Generic API caller
  async function apiAction(action, extra = {}) {
    const payload = { action, telegramId, ...extra };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-appwrite-project': PROJECT_ID
      },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  // Start the countdown timers
  function startTimers() {
    clearInterval(resetTimer);
    clearInterval(endTimer);

    // Daily reset countdown
    resetTimer = setInterval(() => {
      const now = new Date();
      const diff = nextResetTime - now;
      if (diff <= 0) {
        clearInterval(resetTimer);
        onReset();
        return;
      }
      const hrs = String(Math.floor(diff / (1000 * 60 * 60)) % 24).padStart(2, '0');
      const mins = String(Math.floor(diff / (1000 * 60)) % 60).padStart(2, '0');
      const secs = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
      countdownEl.textContent = `daily resets in ${hrs}:${mins}:${secs}`;
    }, 1000);

    // Mining end countdown (90-day period)
    endTimer = setInterval(() => {
      const now = new Date();
      const diff = miningEndTime - now;
      if (diff <= 0) {
        clearInterval(endTimer);
        miningEndEl.textContent = 'Ended';
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs  = String(Math.floor(diff / (1000 * 60 * 60)) % 24).padStart(2, '0');
      const mins = String(Math.floor(diff / (1000 * 60)) % 60).padStart(2, '0');
      const secs = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
      miningEndEl.textContent = `${days}d ${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // Fetch current state from backend
  async function fetchState() {
    try {
      const resp = await apiAction('mine');
      if (resp.error) throw new Error(resp.message);

      // Safely extract numeric values
      const bal   = Number(resp.balance ?? resp.mined ?? 0);
      const pow   = Number(resp.mining_power ?? 1);
      const totM  = Number(resp.total_mined ?? 0);
      const tMin  = Number(resp.total_miners ?? 0);
      const code  = resp.daily_code ?? '';
      const subD  = resp.code_submissions_today ?? 0;
      const subT  = resp.total_code_submissions ?? 0;

      balanceEl.textContent     = bal.toFixed(3);
      powerEl.textContent       = pow.toFixed(1);
      minedEl.textContent       = totM.toFixed(3);
      totalMinersEl.textContent = tMin;
      dailyCodeEl.textContent   = code;
      subsOfCodeEl.textContent  = `${subD}/10`;
      totalOfCodeEl.textContent = subT;

      nextResetTime  = new Date(resp.next_reset);
      miningEndTime  = new Date(resp.mining_end_date);

      // Button state
      if (resp.mining_ended) {
        mineButton.disabled   = true;
        mineButton.textContent = 'Ended';
      } else if (resp.active_session) {
        mineButton.disabled   = true;
        mineButton.textContent = 'Mining...';
      } else {
        mineButton.disabled   = false;
        mineButton.textContent = 'Start Mining';
      }

      startTimers();
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  }

  // Start a mining session
  async function startMining() {
    mineButton.disabled   = true;
    mineButton.textContent = 'Mining...';
    try {
      const resp = await apiAction('start_mining');
      if (resp.error) throw new Error(resp.message);

      const bal  = Number(resp.balance ?? resp.mined ?? 0);
      const pow  = Number(resp.mining_power ?? 1);
      const subD = resp.code_submissions_today ?? 0;
      const subT = resp.total_code_submissions ?? Number(totalOfCodeEl.textContent);

      balanceEl.textContent     = bal.toFixed(3);
      powerEl.textContent       = pow.toFixed(1);
      dailyCodeEl.textContent   = resp.daily_code ?? dailyCodeEl.textContent;
      subsOfCodeEl.textContent  = `${subD}/10`;
      totalOfCodeEl.textContent = subT;

      nextResetTime  = new Date(resp.next_reset);
      miningEndTime  = new Date(resp.mining_end_date);
      startTimers();
    } catch (err) {
      console.error('Error starting mining:', err);
      mineButton.disabled   = false;
      mineButton.textContent = 'Start Mining';
    }
  }

  // Handle daily reset
  function onReset() {
    mineButton.disabled   = false;
    mineButton.textContent = 'Start Mining';
    fetchState();
  }

  // Copy daily code
  copyButton.addEventListener('click', async () => {
    const code = dailyCodeEl.textContent;
    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied';
      setTimeout(() => copyButton.textContent = 'Copy', 2000);
    } catch {}
  });

  // Share via Telegram
  sendButton.addEventListener('click', () => {
    const code = dailyCodeEl.textContent;
    tg.openLink(`https://t.me/share/url?url=&text=${encodeURIComponent(code)}`);
    sendButton.textContent = 'Sent';
    setTimeout(() => sendButton.textContent = 'Send', 2000);
  });

  // Paste into input
  pasteButton.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      codeInput.value = text;
      pasteButton.textContent = 'Pasted';
      setTimeout(() => pasteButton.textContent = 'Paste', 2000);
    } catch {}
  });

  // Submit referral code
  submitButton.addEventListener('click', async () => {
    const codeVal = codeInput.value.trim();
    if (!codeVal) return;
    submitButton.disabled   = true;
    submitButton.textContent = 'Submitting...';
    try {
      const resp = await apiAction('submit_code', { code: codeVal });
      if (resp.error) throw new Error(resp.message);

      const bal  = Number(resp.balance ?? 0);
      const pow  = Number(resp.mining_power ?? 1);
      const subO = resp.owner_submissions ?? Number(subsOfCodeEl.textContent.split('/')[0]);
      const subT = resp.total_code_submissions ?? Number(totalOfCodeEl.textContent);

      balanceEl.textContent     = bal.toFixed(3);
      powerEl.textContent       = pow.toFixed(1);
      subsOfCodeEl.textContent  = `${subO}/10`;
      totalOfCodeEl.textContent = subT;
      submitButton.textContent  = 'Submitted';
    } catch (err) {
      console.error('Submit error:', err);
      submitButton.textContent = 'Error';
    } finally {
      setTimeout(() => {
        submitButton.disabled   = false;
        submitButton.textContent = 'Submit';
      }, 2000);
    }
  });

  // Mine button handler
  mineButton.addEventListener('click', startMining);

  // Initial load
  fetchState();
});
