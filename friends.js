import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
let tg = null;
let USER_ID = null;

// Telegram WebApp initialization
function initTelegramWebApp() {
  try {
    if (!window.Telegram?.WebApp) return false;

    tg = window.Telegram.WebApp;
    tg.expand?.();
    tg.ready?.();

    USER_ID = getTelegramUserId();
    return !!USER_ID;

  } catch (error) {
    console.error("Telegram init failed:", error);
    return false;
  }
}

function getTelegramUserId() {
  if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id.toString();

  try {
    const initData = new URLSearchParams(tg.initData || '');
    const userJson = initData.get('user');
    if (userJson) {
      const user = JSON.parse(decodeURIComponent(userJson));
      return user?.id?.toString();
    }
  } catch (e) {
    console.warn("initData parse failed:", e);
  }

  return tg?.initDataUnsafe?.start_param || null;
}

// Execute Appwrite Function securely
async function executeAppwriteFunction(payload) {
  const FUNCTION_ID = "6804e1e20023090e16fc";

  try {
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(payload),
      true // Wait for completion (no need to poll)
    );

    if (!execution?.response) throw new Error("No response from function");
    return JSON.parse(execution.response);

  } catch (error) {
    console.error("Function execution error:", error);
    throw error;
  }
}

// Fetch and display user data
async function fetchUserData() {
  if (!USER_ID) throw new Error("Telegram user ID not available");

  const payload = {
    telegram_id: USER_ID,
    referral_code: getReferralCodeFromUrl()
  };

  const result = await executeAppwriteFunction(payload);
  if (!result?.success) throw new Error(result?.error || "Invalid response");

  return result;
}

function getReferralCodeFromUrl() {
  return tg?.initDataUnsafe?.start_param || '';
}

function displayUserData(user) {
  document.getElementById("referralCode").textContent = user.referral_code || "N/A";
  document.getElementById("totalInvites").textContent = user.total_invites || "0";

  const referralLink = `https://t.me/betamineitbot?start=${user.referral_code}`;
  document.getElementById("referralLink").textContent = referralLink;

  setupShareButton(referralLink, user.referral_code);
  setupCopyButton(referralLink);
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
  tg?.showAlert ? tg.showAlert(message) : alert(message);
}

function updateFriendsList(friends) {
  const list = document.getElementById("invitedFriendsList");
  list.innerHTML = friends?.length
    ? friends.map(id => `<li>${id}</li>`).join('')
    : '<li>No friends invited yet</li>';
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = `Error: ${message}`;

  const container = document.querySelector('.container');
  container?.prepend(errorDiv);
}

async function initApp() {
  try {
    document.getElementById("referralCode").textContent = "Loading...";
    document.getElementById("invitedFriendsList").innerHTML = "<li>Loading...</li>";

    const ok = initTelegramWebApp();
    if (!ok) throw new Error("Please open in Telegram app");

    const data = await fetchUserData();
    displayUserData(data.user);

  } catch (error) {
    console.error("Init error:", error);
    showError(error.message);
  }
}

document.addEventListener("DOMContentLoaded", initApp);
