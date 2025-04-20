import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite
const appwrite = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(appwrite);

// DOM Elements
const elements = {
  referralCode: document.getElementById("referralCode"),
  totalInvites: document.getElementById("totalInvites"),
  referralLink: document.getElementById("referralLink"),
  inviteButton: document.getElementById("inviteButton"),
  copyButton: document.getElementById("copyButton"),
  friendsList: document.getElementById("invitedFriendsList"),
  codeInput: document.getElementById("codeInput"),
  submitButton: document.getElementById("submitButton"),
  userIdInput: document.getElementById("userIdInput")
};

// State
let currentUser = {
  id: null,
  referralCode: null,
  isTelegram: false
};

// Initialize Application
async function initApp() {
  detectTelegram();
  setupEventListeners();
  await loadUserData();
}

// Detect Telegram WebApp
function detectTelegram() {
  if (window.Telegram?.WebApp) {
    currentUser.isTelegram = true;
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    // Get user ID from Telegram
    currentUser.id = tg.initDataUnsafe?.user?.id?.toString() || 
                    extractUserId(tg.initData) || 
                    generateUserId();
    
    // Get referral code from start_param if available
    currentUser.referralCode = tg.initDataUnsafe?.start_param;
  } else {
    currentUser.isTelegram = false;
    currentUser.id = localStorage.getItem('user_id') || generateUserId();
    localStorage.setItem('user_id', currentUser.id);
  }
}

function extractUserId(initData) {
  try {
    const params = new URLSearchParams(initData);
    const user = params.get("user");
    return user ? JSON.parse(decodeURIComponent(user)).id?.toString() : null;
  } catch {
    return null;
  }
}

function generateUserId() {
  return 'web_' + Math.random().toString(36).substring(2, 11);
}

// Setup UI Event Listeners
function setupEventListeners() {
  elements.inviteButton.addEventListener('click', shareReferralLink);
  elements.copyButton.addEventListener('click', copyReferralLink);
  
  if (elements.submitButton) {
    elements.submitButton.addEventListener('click', submitReferralCode);
  }
  
  // Show/hide appropriate UI based on user type
  if (currentUser.isTelegram) {
    document.querySelectorAll('.telegram-only').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.web-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.telegram-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.web-only').forEach(el => el.style.display = 'block');
  }
}

// Load User Data
async function loadUserData() {
  try {
    showLoadingState();
    
    // For new users with a referral code
    if (currentUser.referralCode) {
      await processReferral(currentUser.id, currentUser.referralCode);
    }
    
    // Fetch user's own referral data
    const response = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify({
        action: "get_user",
        user_id: currentUser.id
      }),
      false
    );

    if (response.response) {
      const data = JSON.parse(response.response);
      updateUI(data.data);
    }
  } catch (error) {
    console.error("Failed to load user data:", error);
    showError(error.message);
  }
}

// Process Referral
async function processReferral(userId, referralCode) {
  try {
    const response = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify({
        action: "process_referral",
        user_id: userId,
        referral_code: referralCode
      }),
      false
    );

    if (!response.response) {
      throw new Error("No response from server");
    }

    const result = JSON.parse(response.response);
    
    if (!result.success) {
      throw new Error(result.error || "Referral processing failed");
    }

    return result.data;
  } catch (error) {
    console.error("Referral processing failed:", error);
    throw error;
  }
}

// Submit Referral Code (for web users)
async function submitReferralCode() {
  const code = elements.codeInput.value.trim();
  const userId = elements.userIdInput?.value.trim() || currentUser.id;

  if (!code) {
    showError("Please enter a referral code");
    return;
  }

  try {
    const result = await processReferral(userId, code);
    showAlert("Referral code applied successfully!");
    updateUI(result);
  } catch (error) {
    showError(error.message);
  }
}

// Update UI
function updateUI(data) {
  if (!data) return;

  const referralCode = data.referral_code || generateReferralCode(currentUser.id);
  const referralLink = `https://yourdomain.com?ref=${referralCode}`;

  elements.referralCode.textContent = referralCode;
  elements.totalInvites.textContent = data.total_invites || 0;
  elements.referralLink.textContent = referralLink;

  // Update friends list
  elements.friendsList.innerHTML = (data.invited_friends?.length > 0)
    ? data.invited_friends.map(id => `<li>${id}</li>`).join("")
    : "<li>No referrals yet</li>";

  // Save generated referral code
  currentUser.referralCode = referralCode;
}

function generateReferralCode(userId) {
  return 'REF_' + userId.slice(-8).toUpperCase();
}

// Share Functions
function shareReferralLink() {
  const link = elements.referralLink.textContent;
  
  if (currentUser.isTelegram && window.Telegram.WebApp.share) {
    window.Telegram.WebApp.share({
      title: "Join My App",
      text: `Use my referral code: ${currentUser.referralCode}`,
      url: link
    }).catch(() => copyToClipboard(link));
  } else if (navigator.share) {
    navigator.share({
      title: "Join My App",
      text: `Use my referral code: ${currentUser.referralCode}`,
      url: link
    }).catch(() => copyToClipboard(link));
  } else {
    copyToClipboard(link);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showAlert("Copied to clipboard!"))
    .catch(() => {
      const tempInput = document.createElement("textarea");
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      showAlert("Copied to clipboard!");
    });
}

// UI Helpers
function showLoadingState() {
  elements.referralCode.textContent = "Loading...";
  elements.totalInvites.textContent = "0";
  elements.friendsList.innerHTML = "<li>Loading...</li>";
}

function showAlert(message) {
  if (currentUser.isTelegram && window.Telegram.WebApp.showAlert) {
    window.Telegram.WebApp.showAlert(message);
  } else {
    alert(message);
  }
}

function showError(message) {
  const errorEl = document.createElement("div");
  errorEl.className = "error-message";
  errorEl.textContent = message;
  document.querySelector(".container").prepend(errorEl);
  setTimeout(() => errorEl.remove(), 5000);
}

// Initialize
document.addEventListener("DOMContentLoaded", initApp);