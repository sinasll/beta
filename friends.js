import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite client
const client = new Client();
client
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6800cf6c0038c2026f07');

const functions = new Functions(client);

// Telegram WebApp initialization
let tgWebApp = null;
if (window.Telegram && window.Telegram.WebApp) {
  tgWebApp = window.Telegram.WebApp;
  tgWebApp.expand();
}

// Main execution
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!tgWebApp || !tgWebApp.initDataUnsafe?.user) {
      redirectToTelegram();
      return;
    }

    const tgUser = tgWebApp.initDataUnsafe.user;
    await loadReferralInfo(tgUser.id);
    await loadInvitedFriends(tgUser.id);
    setupEventListeners();

    // Check for referral code in URL
    checkForReferralCode(tgUser.id);
  } catch (error) {
    showError(error);
  }
});

// Core functions
async function loadReferralInfo(userId) {
  try {
    const response = await functions.createExecution(
      'referralFunction',
      JSON.stringify({
        action: 'get_referral_info',
        telegramId: userId
      }),
      false,
      '/',
      'POST',
      {
        'X-Telegram-Data': tgWebApp.initData
      }
    );

    const data = JSON.parse(response.response);
    if (!data.success) throw new Error(data.error);

    displayReferralInfo(data);
  } catch (error) {
    throw new Error(`Failed to load referral info: ${error.message}`);
  }
}

async function loadInvitedFriends(userId) {
  try {
    const response = await functions.createExecution(
      'referralFunction',
      JSON.stringify({
        action: 'get_invited_friends',
        telegramId: userId
      }),
      false,
      '/',
      'POST',
      {
        'X-Telegram-Data': tgWebApp.initData
      }
    );

    const data = JSON.parse(response.response);
    if (!data.success) throw new Error(data.error);

    displayFriendsList(data.friends);
  } catch (error) {
    throw new Error(`Failed to load friends list: ${error.message}`);
  }
}

// UI functions
function displayReferralInfo(info) {
  const referralLink = `https://t.me/betamineitbot?start=${info.code}`;
  document.getElementById('referralLink').textContent = referralLink;
}

function displayFriendsList(friends) {
  const friendsList = document.getElementById('invitedFriendsList');
  friendsList.innerHTML = '';

  if (friends && friends.length > 0) {
    friends.forEach(friend => {
      const friendItem = document.createElement('li');
      friendItem.className = 'friend-item';
      friendItem.innerHTML = `
        <div class="friend-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="friend-details">
          <span class="friend-name">${friend.username || 'Anonymous'}</span>
          <span class="friend-date">Joined: ${formatDate(friend.joined)}</span>
        </div>
        <div class="friend-power">
          <i class="fas fa-bolt"></i> ${friend.mining_power?.toFixed(1) || '1.0'}x
        </div>
      `;
      friendsList.appendChild(friendItem);
    });
  } else {
    friendsList.innerHTML = '<li class="no-friends">No invited friends yet</li>';
  }
}

// Event handlers
function setupEventListeners() {
  document.getElementById('inviteButton').addEventListener('click', handleInviteClick);
  document.getElementById('copyButton').addEventListener('click', handleCopyClick);
}

async function handleInviteClick() {
  const referralLink = document.getElementById('referralLink').textContent;
  
  if (tgWebApp?.shareText) {
    try {
      tgWebApp.shareText(referralLink);
    } catch (error) {
      await copyToClipboard(referralLink);
      showAlert('Link copied to clipboard!');
    }
  } else {
    await copyToClipboard(referralLink);
    showAlert('Link copied to clipboard!');
  }
}

async function handleCopyClick() {
  const referralLink = document.getElementById('referralLink').textContent;
  await copyToClipboard(referralLink);
  showAlert('Referral link copied!');
}

// Helper functions
function checkForReferralCode(userId) {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    applyReferralCode(userId, refCode);
  }
}

async function applyReferralCode(userId, code) {
  try {
    const response = await functions.createExecution(
      'referralFunction',
      JSON.stringify({
        action: 'apply_referral',
        code: code,
        telegramId: userId
      }),
      false,
      '/',
      'POST',
      {
        'X-Telegram-Data': tgWebApp.initData
      }
    );

    const data = JSON.parse(response.response);
    if (!data.success) throw new Error(data.error);

    showAlert('Referral applied! Mining power bonus activated.');
  } catch (error) {
    showError(`Failed to apply referral: ${error.message}`);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}

function showAlert(message) {
  if (tgWebApp?.showAlert) {
    tgWebApp.showAlert(message);
  } else {
    alert(message);
  }
}

function showError(message) {
  console.error(message);
  showAlert(message);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function redirectToTelegram() {
  if (confirm('Please open this page in Telegram to continue. Open now?')) {
    window.location.href = 'https://t.me/betamineitbot';
  }
}