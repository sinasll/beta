import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);

// Telegram WebApp Initialization
function initTelegramWebApp() {
  try {
    if (!window.Telegram?.WebApp) {
      console.warn("Telegram WebApp not detected - running in browser mode");
      return false;
    }
    
    const tg = window.Telegram.WebApp;
    
    // Initialize WebApp
    tg.ready();
    tg.expand();
    
    // Return the initialized WebApp instance
    return tg;
  } catch (error) {
    console.error("Telegram initialization failed:", error);
    return false;
  }
}

// Get User ID from Telegram
function getTelegramUserId(tg) {
  try {
    // Try unsafe method first
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id.toString();
    }
    
    // Fallback to parsing initData
    if (tg?.initData) {
      const params = new URLSearchParams(tg.initData);
      const user = params.get("user");
      if (user) {
        const userObj = JSON.parse(decodeURIComponent(user));
        return userObj?.id?.toString();
      }
    }
    
    // Final fallback to start_param
    return tg?.initDataUnsafe?.start_param || null;
  } catch (error) {
    console.error("Failed to get Telegram user ID:", error);
    return null;
  }
}

// Process Referral
async function processReferral() {
  const tg = initTelegramWebApp();
  
  if (!tg) {
    // Provide fallback for browser testing
    const testMode = window.location.search.includes("test_mode");
    if (testMode) {
      console.warn("Running in test mode without Telegram");
      await fetchAndShow({
        telegram_id: "TEST_USER_123",
        referral_code: "TESTCODE123"
      });
      return;
    }
    throw new Error("Please open this page through the Telegram app");
  }

  const userId = getTelegramUserId(tg);
  if (!userId) {
    throw new Error("Could not get your Telegram user ID");
  }

  const referralCode = tg.initDataUnsafe?.start_param || 
                     tg.initDataUnsafe?.query_id || 
                     prompt("Please enter your referral code");

  if (!referralCode) {
    throw new Error("No referral code found");
  }

  await fetchAndShow({
    telegram_id: userId,
    referral_code: referralCode
  });
}

// Fetch and display data
async function fetchAndShow(payload) {
  try {
    showLoadingState();
    
    const response = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify(payload),
      false // synchronous
    );

    if (!response.response) {
      throw new Error("No response from server");
    }

    const data = JSON.parse(response.response);
    
    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    updateUI(data.data || data.user);
  } catch (error) {
    console.error("Fetch failed:", error);
    showError(error.message);
  }
}

// UI Functions
function showLoadingState() {
  document.getElementById("referralCode").textContent = "Loading...";
  document.getElementById("totalInvites").textContent = "0";
  document.getElementById("invitedFriendsList").innerHTML = "<li>Loading...</li>";
}

function updateUI(data) {
  const code = data.referral_code || "N/A";
  const link = `https://t.me/betamineitbot?start=${code}`;

  document.getElementById("referralCode").textContent = code;
  document.getElementById("totalInvites").textContent = data.total_invites || 0;
  document.getElementById("referralLink").textContent = link;

  // Setup buttons
  setupShareButton(link);
  setupCopyButton(link);

  // Update friends list
  updateFriendsList(data.invited_friends);
}

function setupShareButton(link) {
  document.getElementById("inviteButton").onclick = () => {
    if (window.Telegram?.WebApp?.share) {
      window.Telegram.WebApp.share({
        title: "Join $BLACK Mining",
        text: `Use my referral code: ${link.split('=').pop()}`,
        url: link
      }).catch(() => copyToClipboard(link));
    } else {
      copyToClipboard(link);
    }
  };
}

function setupCopyButton(link) {
  document.getElementById("copyButton").onclick = () => copyToClipboard(link);
}

function updateFriendsList(friends = []) {
  const listEl = document.getElementById("invitedFriendsList");
  listEl.innerHTML = friends.length > 0
    ? friends.map(id => `<li>${id}</li>`).join("")
    : "<li>No referrals yet</li>";
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showAlert("Copied!"))
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

function showAlert(message) {
  if (window.Telegram?.WebApp?.showAlert) {
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
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Add test mode handler
  if (window.location.search.includes("test_mode")) {
    document.body.classList.add("test-mode");
    console.log("Running in test mode");
  }

  processReferral().catch(error => {
    console.error("Initialization failed:", error);
    showError(error.message);
  });
});
