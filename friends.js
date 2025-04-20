import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);

// Telegram WebApp initialization
let tgWebApp;
let userId;

function initTelegram() {
  if (window.Telegram?.WebApp) {
    tgWebApp = window.Telegram.WebApp;
    tgWebApp.ready();
    tgWebApp.expand();
    
    // Extract user ID
    const unsafeData = tgWebApp.initDataUnsafe;
    userId = unsafeData?.user?.id?.toString() || 
             unsafeData?.start_param || 
             extractUserIdFromInitData(tgWebApp.initData);
    
    return !!userId;
  }
  return false;
}

function extractUserIdFromInitData(initData) {
  try {
    const params = new URLSearchParams(initData || "");
    const userData = params.get("user");
    return userData ? JSON.parse(decodeURIComponent(userData)).id?.toString() : null;
  } catch {
    return null;
  }
}

async function processReferral() {
  try {
    if (!initTelegram()) {
      throw new Error("Please open this page through Telegram");
    }

    const referralCode = tgWebApp.initDataUnsafe?.start_param;
    if (!referralCode) {
      throw new Error("No referral code found");
    }

    const response = await fetch('https://6804e1e37bd3748026ac.fra.appwrite.run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: userId,
        referral_code: referralCode
      })
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to process referral");
    }

    updateUI(data.data);
  } catch (error) {
    console.error("Referral processing failed:", error);
    showError(error.message);
  }
}

function updateUI(data) {
  document.getElementById("referralCode").textContent = data.referral_code || "N/A";
  document.getElementById("totalInvites").textContent = data.total_invites || 0;
  
  const referralLink = `https://t.me/betamineitbot?start=${data.referral_code}`;
  document.getElementById("referralLink").textContent = referralLink;

  // Setup buttons
  document.getElementById("inviteButton").onclick = () => shareLink(referralLink);
  document.getElementById("copyButton").onclick = () => copyToClipboard(referralLink);

  // Update friends list
  const friendsList = document.getElementById("invitedFriendsList");
  friendsList.innerHTML = data.invited_friends?.length > 0
    ? data.invited_friends.map(id => `<li>${id}</li>`).join("")
    : "<li>No referrals yet</li>";
}

function shareLink(link) {
  if (tgWebApp?.share) {
    tgWebApp.share({
      title: "Join $BLACK Mining",
      text: `Use my referral code: ${link.split('=').pop()}`,
      url: link
    }).catch(() => copyToClipboard(link));
  } else {
    copyToClipboard(link);
  }
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
  if (tgWebApp?.showAlert) {
    tgWebApp.showAlert(message);
  } else {
    alert(message);
  }
}

function showError(message) {
  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.textContent = message;
  document.querySelector(".container").prepend(errorElement);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    processReferral();
  } catch (error) {
    console.error("Initialization failed:", error);
    showError("Failed to initialize. Please try again.");
  }
});
