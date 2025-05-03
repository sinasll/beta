// app.js — fetch & display global stats with Telegram WebApp integration

import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

// Appwrite Functions instance
const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// DOM elements for global stats
const minedEl       = document.getElementById('mined');
const totalMinersEl = document.getElementById('totalminers');
const usernameEl    = document.getElementById('username');
const balanceEl     = document.getElementById('balance');

// Format numbers with commas and fixed decimals
function formatNumber(num, decimals = 3) {
  if (isNaN(num)) return '0' + '0'.repeat(decimals);
  const parts = Number(num).toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
}

// Grab Telegram user info (or fallback to guest)
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const username = user.username
      ? user.username
      : `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return {
      username,
      telegramId: user.id.toString(),
    };
  }
  // Fallback guest
  const guest = localStorage.getItem('guestUsername');
  if (guest) return { username: guest, telegramId: '' };
  const newGuest = 'guest_' + Math.random().toString(36).substring(2, 8);
  localStorage.setItem('guestUsername', newGuest);
  return { username: newGuest, telegramId: '' };
}

// Fetch global stats from your Appwrite Function
async function fetchGlobalStats() {
  try {
    const payload = initializeUser();
    const exec = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(payload)
    );
    const data = JSON.parse(exec.responseBody || '{}');

    if (data.error) {
      console.error('Error fetching stats:', data.message);
      return;
    }

    // Update UI
    minedEl.textContent       = formatNumber(data.total_mined);
    totalMinersEl.textContent = formatNumber(data.total_miners, 0);
    usernameEl.textContent    = data.username || payload.username;
    balanceEl.textContent     = formatNumber(data.balance);
  } catch (err) {
    console.error('Failed to fetch global stats:', err);
  }
}

// Initialize Telegram WebApp and kick off stats fetch
function init() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }

  fetchGlobalStats();
}

// Run on page load
window.addEventListener('DOMContentLoaded', init);
