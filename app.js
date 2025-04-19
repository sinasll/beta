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

const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const mineBtn = document.getElementById('mineButton');

let generatedGuestUsername = null;

function getUserPayload() {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  let username = 'miner';
  let telegramId = '';
  if (user) {
    telegramId = user?.id?.toString();
    username = user?.username || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  } else {
    if (!generatedGuestUsername) {
      generatedGuestUsername = 'guest_' + Math.random().toString(36).substring(2, 7);
    }
    username = generatedGuestUsername;
  }

  return {
    username,
    telegramId,
    referralCode: localStorage.getItem('referral') || ''
  };
}

function startMining() {
  isMining = true;
  mineBtn.textContent = 'Stop Mining';

  mineInterval = setInterval(async () => {
    try {
      const body = getUserPayload();

      if (!usernameEl.textContent || usernameEl.textContent === 'username') {
        usernameEl.textContent = body.username;
      }

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
  }, 1000);
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  isMining = false;
  mineBtn.textContent = 'Start Mining';
}

mineBtn.addEventListener('click', () => {
  if (!isMining) {
    startMining();
  } else {
    stopMining();
  }
});
