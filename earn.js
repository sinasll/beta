import { Client, Functions } from "https://cdn.jsdelivr.net/npm/appwrite@9.0.0/+esm";

// ── Appwrite Client Setup ──
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "68062657001a181032e7";

// ── UI Elements ──
const dailyButton   = document.getElementById("dailyButton");
const twitterButton = document.getElementById("twitterButton");

// ── Get Telegram User from WebApp init data ──
const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
if (!telegramUser) {
  alert("Please open this page inside the Telegram WebApp.");
  throw new Error("Telegram user data not found");
}
const telegram_id       = telegramUser.id;
const telegram_username = telegramUser.username || `anon_${telegram_id}`;

// ── Toast helper ──
function showToast(msg, isError = false) {
  const t = document.createElement("div");
  t.className = `toast ${isError ? "error" : "success"}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Core: claim a bonus of given type ──
async function claimBonus(type) {
  const payload = JSON.stringify({
    telegram_id,
    telegram_username,
    type // "daily" or "follow"
  });

  // disable both buttons while working
  dailyButton.disabled = twitterButton.disabled = true;

  try {
    // synchronous execution: no need to call getExecution or have extra scopes
    const exec = await functions.createExecution(FUNCTION_ID, payload, false);
    if (!exec.response) throw new Error("Empty response from server");

    const result = JSON.parse(exec.response);
    if (result.error) {
      showToast(result.error, true);
    } else {
      showToast(result.message);
      // update UI
      if (type === "daily") {
        dailyButton.textContent = "Claimed";
      } else {
        twitterButton.textContent = "Followed";
      }
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Unknown error", true);
  } finally {
    // re-enable only the unclaimed button
    if (dailyButton.textContent !== "Claimed")   dailyButton.disabled = false;
    if (twitterButton.textContent !== "Followed") twitterButton.disabled = false;
  }
}

// ── Event Listeners ──
dailyButton.addEventListener("click", () => claimBonus("daily"));
twitterButton.addEventListener("click", () => {
  window.open("https://x.com/blacktg", "_blank");
  claimBonus("follow");
});
