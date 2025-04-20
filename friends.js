import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6800cf6c0038c2026f07";
const FUNCTION_ID = "6804e1e20023090e16fc";

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(PROJECT_ID);
const functions = new Functions(client);

let tg = null;
let USER_ID = null;

// Initialize Telegram
function initTelegramWebApp() {
  try {
    if (!window.Telegram?.WebApp) return false;
    tg = window.Telegram.WebApp;
    tg.ready?.();
    tg.expand?.();
    USER_ID = extractTelegramUserId();
    return !!USER_ID;
  } catch (e) {
    console.error("Telegram init error:", e);
    return false;
  }
}

function extractTelegramUserId() {
  try {
    const userId = tg?.initDataUnsafe?.user?.id;
    if (userId) return userId.toString();

    const params = new URLSearchParams(tg?.initData || "");
    const userRaw = params.get("user");
    if (userRaw) {
      const parsed = JSON.parse(decodeURIComponent(userRaw));
      return parsed?.id?.toString();
    }

    return tg?.initDataUnsafe?.start_param || null;
  } catch {
    return null;
  }
}

// Call Appwrite Function and wait for completion
async function executeAppwriteFunction(payload) {
  const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
  if (!execution?.$id) throw new Error("No executionId returned");

  const MAX_WAIT_MS = 5000;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const status = await functions.getExecution(execution.$id);
    if (status.status === "completed") return JSON.parse(status.response);
    if (status.status === "failed") throw new Error("Function execution failed");
    await new Promise(r => setTimeout(r, 400));
  }

  throw new Error("Execution timeout");
}

// Main fetch
async function fetchUserData() {
  if (!USER_ID) throw new Error("Missing Telegram user ID");

  const payload = {
    telegram_id: USER_ID,
    referral_code: tg?.initDataUnsafe?.start_param || ''
  };

  const result = await executeAppwriteFunction(payload);
  if (!result?.success) throw new Error(result?.error || "Failed to load user");

  return result.user;
}

// UI Display
function displayUserData(user) {
  const referral = user.referral_code || "N/A";
  const invites = user.total_invites || 0;
  const link = `https://t.me/betamineitbot?start=${referral}`;

  document.getElementById("referralCode").textContent = referral;
  document.getElementById("totalInvites").textContent = invites;
  document.getElementById("referralLink").textContent = link;

  document.getElementById("inviteButton").onclick = () => {
    if (tg?.share) {
      tg.share({
        title: "Join $BLACK Mining",
        text: `Use my code: ${referral}`,
        url: link
      }).catch(() => copyToClipboard(link));
    } else {
      copyToClipboard(link);
    }
  };

  document.getElementById("copyButton").onclick = () => copyToClipboard(link);
  updateFriendsList(user.invited_friends);
}

function updateFriendsList(friends) {
  const list = document.getElementById("invitedFriendsList");
  if (!friends?.length) {
    list.innerHTML = "<li>No friends invited yet</li>";
    return;
  }

  list.innerHTML = friends.map(id => `<li>${id}</li>`).join("");
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showAlert("Link copied!"))
    .catch(() => {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      showAlert("Link copied!");
    });
}

function showAlert(msg) {
  tg?.showAlert ? tg.showAlert(msg) : alert(msg);
}

function showError(msg) {
  const el = document.createElement("div");
  el.className = "error-message";
  el.textContent = `Error: ${msg}`;
  document.querySelector(".container")?.prepend(el);
}

// App init
document.addEventListener("DOMContentLoaded", async () => {
  try {
    document.getElementById("referralCode").textContent = "Loading...";
    document.getElementById("invitedFriendsList").innerHTML = "<li>Loading...</li>";

    const ok = initTelegramWebApp();
    if (!ok) throw new Error("Please open in Telegram");

    const user = await fetchUserData();
    displayUserData(user);
  } catch (e) {
    console.error("App failed:", e);
    showError(e.message);
  }
});
