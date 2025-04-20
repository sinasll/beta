import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
let tg = null;
let USER_ID = null;

// Initialize Telegram WebApp
function initTelegramWebApp() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      tg = window.Telegram.WebApp;
      tg.expand();
      
      // Try to get user ID from initData or initDataUnsafe
      const initData = tg.initData || '';
      const initDataUnsafe = tg.initDataUnsafe || {};
      
      if (!initDataUnsafe.user?.id && initData) {
        const params = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (userParam) {
          const user = JSON.parse(userParam);
          USER_ID = user?.id?.toString();
        }
      } else {
        USER_ID = initDataUnsafe.user?.id?.toString();
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Telegram initialization error:", error);
    return false;
  }
}

// Get DOM elements safely
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`Element with ID ${id} not found`);
    throw new Error(`UI element ${id} missing`);
  }
  return el;
}

// Fetch user data from backend
async function fetchUserData() {
  try {
    if (!USER_ID) throw new Error("Telegram user ID not available");

    const payload = {
      telegram_id: USER_ID,
      referral_code: getReferralCodeFromUrl()
    };

    const execution = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify(payload)
    );

    let response;
    let attempts = 0;
    while (attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await functions.getExecution(execution.$id);
      if (result.status === "completed") {
        response = result.response;
        break;
      }
      attempts++;
    }

    if (!response) throw new Error("Function execution timed out");

    const data = JSON.parse(response);
    if (!data.success) throw new Error(data.error || "Failed to fetch user data");

    return data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

// Get referral code from URL if present
function getReferralCodeFromUrl() {
  if (!tg) return '';
  const startParam = tg.initDataUnsafe?.start_param;
  return startParam || '';
}

// Display user data in the UI
function displayUserData(user) {
  try {
    const referralLink = `https://t.me/betamineitbot?start=${user.referral_code}`;
    getElement("referralLink").textContent = referralLink;
    getElement("referralCode").textContent = user.referral_code;
    getElement("totalInvites").textContent = user.total_invites;

    // Setup buttons
    getElement("inviteButton").addEventListener("click", () => {
      shareReferralLink(user.referral_code);
    });

    getElement("copyButton").addEventListener("click", () => {
      copyToClipboard(referralLink);
    });

    // Friends list
    const friendsList = getElement("invitedFriendsList");
    friendsList.innerHTML = '';

    if (!user.invited_friends || user.invited_friends.length === 0) {
      friendsList.innerHTML = '<li class="no-friends">No invited friends yet</li>';
      return;
    }

    user.invited_friends.forEach(friendId => {
      const friendItem = document.createElement("li");
      friendItem.className = "friend-item";
      friendItem.innerHTML = `
        <span class="friend-id">${friendId}</span>
        <span class="friend-status">Joined</span>
      `;
      friendsList.appendChild(friendItem);
    });
  } catch (error) {
    console.error("Error displaying user data:", error);
    throw error;
  }
}

// Share referral link
function shareReferralLink(referralCode) {
  const shareUrl = `https://t.me/betamineitbot?start=${referralCode}`;
  const shareText = `Join me in $BLACK Mining! Use my referral code: ${referralCode}`;

  if (tg?.share) {
    tg.share({
      title: "Join $BLACK Mining",
      text: shareText,
      url: shareUrl
    });
  } else if (navigator.share) {
    navigator.share({
      title: "Join $BLACK Mining",
      text: shareText,
      url: shareUrl
    }).catch(() => copyToClipboard(shareUrl));
  } else {
    copyToClipboard(shareUrl);
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showAlert("Copied to clipboard!");
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showAlert("Copied to clipboard!");
  });
}

// Show alert
function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

// Initialize the app
async function initApp() {
  try {
    // Create main container if it doesn't exist
    if (!document.getElementById("appContent")) {
      const appDiv = document.createElement("div");
      appDiv.id = "appContent";
      document.body.appendChild(appDiv);
    }

    const appContent = getElement("appContent");
    
    // Check if we're in Telegram
    const isTelegram = initTelegramWebApp();
    
    if (!isTelegram) {
      appContent.innerHTML = `
        <div class="error-message">
          Please open this page in Telegram to use all features.
        </div>
      `;
      return;
    }

    // Show loading state
    appContent.classList.add("loading");
    appContent.innerHTML = '<div class="loading-spinner">Loading...</div>';

    // Fetch and display data
    const userData = await fetchUserData();
    displayUserData(userData.user);
    appContent.classList.remove("loading");

  } catch (error) {
    console.error("Initialization error:", error);
    const appContent = document.getElementById("appContent") || document.body;
    appContent.innerHTML = `
      <div class="error-message">
        Error: ${error.message}
      </div>
    `;
  }
}

// Start the app when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);