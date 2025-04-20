import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
let tg = null;
let USER_ID = null;

// Robust Telegram initialization with error handling
function initTelegramWebApp() {
  try {
    // Check if running in Telegram
    if (!window.Telegram?.WebApp) {
      console.warn("Not running in Telegram WebApp");
      return false;
    }

    tg = window.Telegram.WebApp;
    
    // Initialize WebApp
    try {
      tg.expand();
      tg.ready();
    } catch (e) {
      console.warn("Telegram WebApp initialization error:", e);
    }

    // Get user ID from multiple possible sources
    USER_ID = getTelegramUserId();
    return !!USER_ID;
    
  } catch (error) {
    console.error("Telegram initialization failed:", error);
    return false;
  }
}

// Multiple methods to get Telegram user ID
function getTelegramUserId() {
  // 1. Try from initDataUnsafe
  if (tg.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id.toString();
  }

  // 2. Parse initData
  try {
    const initData = new URLSearchParams(tg.initData || '');
    const userJson = initData.get('user');
    if (userJson) {
      const user = JSON.parse(decodeURIComponent(userJson));
      return user?.id?.toString();
    }
  } catch (e) {
    console.warn("Failed to parse initData:", e);
  }

  // 3. Try from start_param
  if (tg.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param;
  }

  return null;
}

// Robust function execution with timeout handling
async function executeAppwriteFunction(payload) {
  const FUNCTION_ID = "6804e1e20023090e16fc"; // Your function ID
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify(payload)
      );

      if (!execution?.$id) {
        throw new Error("No execution ID returned");
      }

      // Wait for completion
      const result = await waitForExecution(execution.$id);
      return JSON.parse(result.response);
      
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function waitForExecution(executionId, timeout = 5000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const result = await functions.getExecution(executionId);
    
    if (result.status === "completed") return result;
    if (result.status === "failed") {
      throw new Error("Function execution failed");
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error("Function execution timeout");
}

// Main data fetching function
async function fetchUserData() {
  if (!USER_ID) throw new Error("Telegram user ID not available");

  try {
    const data = await executeAppwriteFunction({
      telegram_id: USER_ID,
      referral_code: getReferralCodeFromUrl()
    });

    if (!data?.success) {
      throw new Error(data?.error || "Invalid response from function");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    throw error;
  }
}

function getReferralCodeFromUrl() {
  return tg?.initDataUnsafe?.start_param || '';
}

// UI Functions
function displayUserData(user) {
  // Update referral info
  document.getElementById("referralCode").textContent = user.referral_code || "N/A";
  document.getElementById("totalInvites").textContent = user.total_invites || "0";
  
  const referralLink = `https://t.me/betamineitbot?start=${user.referral_code}`;
  document.getElementById("referralLink").textContent = referralLink;

  // Setup buttons
  setupShareButton(referralLink, user.referral_code);
  setupCopyButton(referralLink);

  // Update friends list
  updateFriendsList(user.invited_friends);
}

function setupShareButton(link, code) {
  const btn = document.getElementById("inviteButton");
  btn.onclick = () => {
    if (tg?.share) {
      tg.share({
        title: "Join $BLACK Mining",
        text: `Use my code: ${code}`,
        url: link
      }).catch(() => copyToClipboard(link));
    } else {
      copyToClipboard(link);
    }
  };
}

function setupCopyButton(link) {
  const btn = document.getElementById("copyButton");
  btn.onclick = () => copyToClipboard(link);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showAlert("Link copied!"))
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showAlert("Link copied!");
    });
}

function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

function updateFriendsList(friends) {
  const list = document.getElementById("invitedFriendsList");
  list.innerHTML = friends?.length
    ? friends.map(id => `<li>${id}</li>`).join('')
    : '<li>No friends invited yet</li>';
}

// Initialize app with proper error handling
async function initApp() {
  try {
    // Show loading state
    document.getElementById("referralCode").textContent = "Loading...";
    document.getElementById("invitedFriendsList").innerHTML = "<li>Loading...</li>";

    // Initialize Telegram
    const isTelegram = initTelegramWebApp();
    if (!isTelegram) {
      throw new Error("Please open in Telegram app");
    }

    // Fetch and display data
    const data = await fetchUserData();
    displayUserData(data.user);

  } catch (error) {
    console.error("App initialization failed:", error);
    showError(error.message);
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = `Error: ${message}`;
  
  const container = document.querySelector('.container');
  container.prepend(errorDiv);
}

// Start the app
document.addEventListener("DOMContentLoaded", initApp);
