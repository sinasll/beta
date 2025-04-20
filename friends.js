import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);

// Telegram WebApp initialization
let tgWebApp;
let userId;

function initTelegram() {
  try {
    if (window.Telegram?.WebApp) {
      tgWebApp = window.Telegram.WebApp;
      tgWebApp.ready();
      tgWebApp.expand();
      
      // Get user ID
      userId = tgWebApp.initDataUnsafe?.user?.id || 
               extractUserId(tgWebApp.initData);
      
      if (userId) {
        setupEventListeners();
        loadReferralData();
      } else {
        showError("Could not get your user ID");
      }
    } else {
      showError("Please open in Telegram app");
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Initialization failed");
  }
}

function extractUserId(initData) {
  try {
    const params = new URLSearchParams(initData || "");
    const user = params.get("user");
    return user ? JSON.parse(decodeURIComponent(user)).id : null;
  } catch {
    return null;
  }
}

function setupEventListeners() {
  try {
    const inviteBtn = document.getElementById("inviteButton");
    const copyBtn = document.getElementById("copyButton");
    
    if (inviteBtn) {
      inviteBtn.addEventListener("click", shareReferralLink);
    }
    
    if (copyBtn) {
      copyBtn.addEventListener("click", copyReferralLink);
    }
  } catch (error) {
    console.error("Event listener setup failed:", error);
  }
}

async function loadReferralData() {
  try {
    showLoadingState();
    
    const response = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify({
        action: "get_stats",
        user_id: userId
      })
    );

    if (!response.response) {
      throw new Error("No response from server");
    }

    const data = JSON.parse(response.response);
    
    if (data.success) {
      updateUI(data.stats);
    } else {
      throw new Error(data.error || "Failed to load data");
    }
  } catch (error) {
    console.error("Error loading data:", error);
    showError(error.message);
  }
}

function updateUI(stats) {
  try {
    const referralLink = `https://t.me/betamineitbot?start=${userId}`;
    
    // Update count
    const countElement = document.getElementById("referralCount");
    if (countElement) {
      countElement.textContent = stats?.referral_count || 0;
    }
    
    // Update link
    const linkElement = document.getElementById("referralLink");
    if (linkElement) {
      linkElement.textContent = referralLink;
    }
    
    // Update friends list if available
    const friendsList = document.getElementById("invitedFriendsList");
    if (friendsList) {
      friendsList.innerHTML = stats?.recent_referrals?.length > 0
        ? stats.recent_referrals.map(id => `<li>${id}</li>`).join("")
        : "<li>No referrals yet</li>";
    }
  } catch (error) {
    console.error("UI update failed:", error);
  }
}

function shareReferralLink() {
  try {
    const link = document.getElementById("referralLink")?.textContent;
    if (!link) return;
    
    if (tgWebApp?.share) {
      tgWebApp.share({
        title: "Join $BLACK Mining",
        text: "Use my referral link to join!",
        url: link
      }).catch(() => copyToClipboard(link));
    } else if (navigator.share) {
      navigator.share({
        title: "Join $BLACK Mining",
        text: "Use my referral link to join!",
        url: link
      }).catch(() => copyToClipboard(link));
    } else {
      copyToClipboard(link);
    }
  } catch (error) {
    console.error("Sharing failed:", error);
    copyToClipboard(link);
  }
}

function copyReferralLink() {
  const link = document.getElementById("referralLink")?.textContent;
  if (link) copyToClipboard(link);
}

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text)
      .then(() => showAlert("Copied to clipboard!"))
      .catch(() => {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        showAlert("Copied to clipboard!");
      });
  } catch (error) {
    console.error("Copy failed:", error);
  }
}

function showLoadingState() {
  const friendsList = document.getElementById("invitedFriendsList");
  if (friendsList) {
    friendsList.innerHTML = "<li>Loading...</li>";
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
  console.error("Error:", message);
  const friendsList = document.getElementById("invitedFriendsList");
  if (friendsList) {
    friendsList.innerHTML = `<li class="error">${message}</li>`;
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", initTelegram);