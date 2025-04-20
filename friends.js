import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6800cf6c0038c2026f07";
const FUNCTION_ID = "6804e1e20023090e16fc";

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
const functions = new Functions(client);

let tg = null;
let USER_ID = null;

// ——————————————————
// 1) Telegram Init
// ——————————————————
function initTelegramWebApp() {
  if (!window.Telegram?.WebApp) return false;
  tg = window.Telegram.WebApp;
  tg.ready?.();
  tg.expand?.();
  USER_ID = extractTelegramUserId();
  return Boolean(USER_ID);
}

function extractTelegramUserId() {
  const unsafe = tg.initDataUnsafe;
  if (unsafe?.user?.id) return unsafe.user.id.toString();
  try {
    const params = new URLSearchParams(tg.initData || "");
    const raw = params.get("user");
    if (raw) {
      const p = JSON.parse(decodeURIComponent(raw));
      return p?.id?.toString();
    }
  } catch {}
  return unsafe?.start_param || null;
}

// ——————————————————
// 2) Execute Function
// ——————————————————
async function executeAppwriteFunction(payload) {
  try {
    const exec = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(payload),
      false // synchronous execution
    );
    
    if (!exec.response) {
      console.error("Execution details:", exec);
      throw new Error("Function executed but returned no response");
    }
    
    return JSON.parse(exec.response);
  } catch (err) {
    console.error("Function execution failed:", err);
    throw new Error("Failed to execute function: " + err.message);
  }
}

// ——————————————————
// 3) Fetch & Display
// ——————————————————
async function fetchAndShow() {
  try {
    if (!USER_ID) throw new Error("Telegram user ID not found");

    const payload = {
      telegram_id: USER_ID,
      referral_code: tg.initDataUnsafe?.start_param || ""
    };

    console.log("Sending payload:", payload);
    const result = await executeAppwriteFunction(payload);
    console.log("Received result:", result);

    if (!result?.success) {
      throw new Error(result?.error || result?.message || "Unknown error from function");
    }

    displayUserData(result.user);
  } catch (err) {
    console.error("fetchAndShow error:", err);
    throw err;
  }
}

function displayUserData(user) {
  const code = user.referral_code || "N/A";
  const invites = user.total_invites || 0;
  const link = `https://t.me/betamineitbot?start=${code}`;

  document.getElementById("referralCode").textContent = code;
  document.getElementById("totalInvites").textContent = invites;
  document.getElementById("referralLink").textContent = link;

  document.getElementById("inviteButton").onclick = () => {
    if (tg.share) {
      tg.share({
        title: "Join $BLACK Mining",
        text: `Use my code: ${code}`,
        url: link
      }).catch(() => copy(link));
    } else {
      copy(link);
    }
  };

  document.getElementById("copyButton").onclick = () => copy(link);

  const listEl = document.getElementById("invitedFriendsList");
  listEl.innerHTML = (user.invited_friends?.length > 0)
    ? user.invited_friends.map(id => `<li>${id}</li>`).join("")
    : "<li>No friends invited yet</li>";
}

function copy(text) {
  navigator.clipboard.writeText(text)
    .then(() => showAlert("Link copied!"))
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showAlert("Link copied!");
    });
}

function showAlert(msg) {
  tg.showAlert ? tg.showAlert(msg) : alert(msg);
}

function showError(msg) {
  const e = document.createElement("div");
  e.className = "error-message";
  e.textContent = `Error: ${msg}`;
  document.querySelector(".container")?.prepend(e);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Placeholder while loading
    document.getElementById("referralCode").textContent = "Loading...";
    document.getElementById("invitedFriendsList").innerHTML = "<li>Loading...</li>";

    if (!initTelegramWebApp()) throw new Error("Please open in Telegram WebApp");
    await fetchAndShow();
  } catch (err) {
    console.error("App failed:", err);
    showError(err.message);
  }
});