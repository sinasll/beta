import { Client, Functions, Account } from "https://esm.sh/appwrite@13.0.0";

// pull all three values from your .env via Vite
const ENDPOINT    = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID  = import.meta.env.VITE_PROJECT_ID;
const FUNCTION_ID = import.meta.env.VITE_FUNCTION_ID;

// single client instance, properly configured
const client    = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

const functions = new Functions(client);
const account   = new Account(client);

// Ensure we have a valid Appwrite session (anonymous if needed)
async function ensureSession() {
  try {
    // if already logged in, this resolves
    await account.get();
  } catch {
    // otherwise, spin up an anonymous session
    await account.createAnonymousSession();
  }
}

async function fetchLeaderboard() {
  try {
    // 1) Make sure we have a session
    await ensureSession();

    // 2) Grab a JWT now that we're authenticated
    const { jwt } = await account.createJWT();
    client.setJWT(jwt);

    // 3) Fetch the current user so we can extract their telegramId
    const user = await account.get();
    const telegramId = user?.prefs?.telegramId;
    if (!telegramId) {
      throw new Error("Missing telegramId in user profile");
    }

    // 4) Call your function, passing telegramId in the payload
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({ telegramId })
    );

    const { status, responseStatusCode, responseBody } = execution;
    if (status === "completed" && responseStatusCode === 200 && responseBody) {
      const result = JSON.parse(responseBody);
      if (result.success && Array.isArray(result.leaderboard)) {
        renderLeaderboard(result.leaderboard);
      } else {
        showError("Invalid leaderboard data");
      }
    } else {
      showError("Failed to load leaderboard");
    }
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    showError("Failed to load leaderboard. Please try again later.");
  }
}

function renderLeaderboard(leaderboard) {
  const container = document.getElementById("leaderboard-rows");
  container.innerHTML = "";

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    const noData = document.createElement("div");
    noData.className = "no-data";
    noData.textContent = "No miners yet";
    container.appendChild(noData);
    return;
  }

  leaderboard.forEach(miner => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    const rankEl   = document.createElement("div");
    rankEl.className   = "rank";
    rankEl.textContent = `#${miner.rank}`;

    const userInfo      = document.createElement("div");
    userInfo.className  = "user-info";
    const nameEl        = document.createElement("span");
    nameEl.className    = "username";
    nameEl.textContent  = miner.username;
    userInfo.appendChild(nameEl);

    const amountEl      = document.createElement("div");
    amountEl.className  = "amount";
    amountEl.textContent= `${miner.amount}`;

    row.append(rankEl, userInfo, amountEl);
    container.appendChild(row);
  });
}

function showError(message) {
  const container = document.getElementById("leaderboard-rows");
  container.innerHTML = "";
  const errEl = document.createElement("div");
  errEl.className = "error";
  errEl.textContent = message;
  container.appendChild(errEl);
}

document.addEventListener("DOMContentLoaded", fetchLeaderboard);
