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

  // Cache DOM elements (corrected variable names)
  const usernameEl = document.getElementById('username');
  const balanceEl = document.getElementById('balance');
  const powerEl = document.getElementById('power');
  const minedEl = document.getElementById('mined');
  const totalminersEl = document.getElementById('totalminers');
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

  // Display username
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

  // Timer functions
  function startTimers() {
    clearInterval(resetTimer);
    clearInterval(endTimer);

    // Daily reset timer
    resetTimer = setInterval(() => {
      const now = new Date();
      const diff = nextResetTime - now;
      if (diff <= 0) {
        clearInterval(resetTimer);
        onReset();
        return;
      }
      const hrs = String(Math.floor(diff / 36e5) % 24).padStart(2, '0');
      const mins = String(Math.floor(diff / 6e4) % 60).padStart(2, '0');
      const secs = String(Math.floor(diff / 1e3) % 60).padStart(2, '0');
      countdownEl.textContent = `daily resets in ${hrs}:${mins}:${secs}`;
    }, 1000);

    // Mining end timer
    endTimer = setInterval(() => {
      const now = new Date();
      const diff = miningEndTime - now;
      if (diff <= 0) {
        clearInterval(endTimer);
        miningEndEl.textContent = 'Ended';
        return;
      }
      const days = Math.floor(diff / 864e5);
      const hrs = String(Math.floor(diff / 36e5) % 24).padStart(2, '0');
      const mins = String(Math.floor(diff / 6e4) % 60).padStart(2, '0');
      const secs = String(Math.floor(diff / 1e3) % 60).padStart(2, '0');
      miningEndEl.textContent = `${days}d ${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // Fetch state from backend
  async function fetchState() {
    try {
      const resp = await apiAction('mine');
      if (resp.error) throw new Error(resp.message);

      // Extract values with defaults
      const bal = Number(resp.balance ?? 0);
      const pow = Number(resp.mining_power ?? 1);
      const totM = Number(resp.total_mined ?? 0);
      const tMin = Number(resp.total_miners ?? 0);
      const code = resp.daily_code ?? '';
      const subD = resp.code_submissions_today ?? 0;
      const subT = resp.total_code_submissions ?? 0;

      // Update UI
      balanceEl.textContent = bal.toFixed(3);
      powerEl.textContent = pow.toFixed(1);
      minedEl.textContent = totM.toFixed(3);
      totalminersEl.textContent = tMin;
      dailyCodeEl.textContent = code;
      subsOfCodeEl.textContent = `${subD}/10`;
      totalOfCodeEl.textContent = subT;

      // Handle timers
      nextResetTime = new Date(resp.next_reset);
      miningEndTime = new Date(resp.mining_end_date);

      // Update button state
      mineButton.disabled = !!resp.mining_ended;
      mineButton.textContent = resp.mining_ended ? 'Ended' : 
        resp.active_session ? 'Mining...' : 'Start Mining';

      startTimers();
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  }

  // Mining control
  async function startMining() {
    mineButton.disabled = true;
    mineButton.textContent = 'Mining...';
    try {
      const resp = await apiAction('start_mining');
      if (resp.error) throw new Error(resp.message);

      // Update UI from response
      balanceEl.textContent = Number(resp.balance ?? 0).toFixed(3);
      powerEl.textContent = Number(resp.mining_power ?? 1).toFixed(1);
      dailyCodeEl.textContent = resp.daily_code || dailyCodeEl.textContent;
      subsOfCodeEl.textContent = `${resp.code_submissions_today ?? 0}/10`;
      totalOfCodeEl.textContent = resp.total_code_submissions ?? 0;

      // Update timers
      nextResetTime = new Date(resp.next_reset);
      miningEndTime = new Date(resp.mining_end_date);
      startTimers();
    } catch (err) {
      console.error('Start mining failed:', err);
      mineButton.disabled = false;
      mineButton.textContent = 'Start Mining';
    }
  }

  // Event handlers
  function onReset() {
    mineButton.disabled = false;
    mineButton.textContent = 'Start Mining';
    fetchState();
  }

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dailyCodeEl.textContent);
      copyButton.textContent = 'Copied';
      setTimeout(() => copyButton.textContent = 'Copy', 2000);
    } catch {}
  });

  sendButton.addEventListener('click', () => {
    const code = dailyCodeEl.textContent;
    const text = encodeURIComponent(`💰 Use my $BLACK mining code: ${code}`);
    tg.openLink(`https://t.me/share/url?url=&text=${text}`);
    sendButton.textContent = 'Sent ✓';
    setTimeout(() => sendButton.textContent = 'Share', 2000);
  });

  pasteButton.addEventListener('click', async () => {
    try {
      codeInput.value = await navigator.clipboard.readText();
      pasteButton.textContent = 'Pasted';
      setTimeout(() => pasteButton.textContent = 'Paste', 2000);
    } catch {}
  });

  submitButton.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (!code) return;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
      const resp = await apiAction('submit_code', { code });
      if (resp.error) throw new Error(resp.message);

      balanceEl.textContent = Number(resp.balance ?? 0).toFixed(3);
      powerEl.textContent = Number(resp.mining_power ?? 1).toFixed(1);
      subsOfCodeEl.textContent = `${resp.owner_submissions ?? 0}/10`;
      totalOfCodeEl.textContent = resp.total_code_submissions ?? 0;
      
      submitButton.textContent = 'Submitted';
    } catch (err) {
      console.error('Submit failed:', err);
      submitButton.textContent = 'Error';
    } finally {
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
      }, 2000);
    }
  });

  mineButton.addEventListener('click', startMining);
  fetchState();
});