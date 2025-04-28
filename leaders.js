import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const PROJECT_ID   = "6800cf6c0038c2026f07";
const FUNCTION_ID  = "680442d4002cb52d1977"; 

const client    = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject(PROJECT_ID);
const functions = new Functions(client);

async function fetchLeaderboard() {
  try {
    const execution = await functions.createExecution(
      FUNCTION_ID,
      undefined,
      false
    );

    console.log("Execution result:", execution);

    const { status, responseStatusCode, responseBody } = execution;

    if (status === 'completed' && responseStatusCode === 200 && responseBody) {
      const result = JSON.parse(responseBody);

      if (result.success && Array.isArray(result.leaderboard)) {
        renderLeaderboard(result.leaderboard);
      } else {
        showError("Invalid leaderboard data");
      }
    } else {
      showError(`Function execution failed: status=${status}, code=${responseStatusCode}`);
    }
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    showError("Failed to load leaderboard. See console.");
  }
}

function renderLeaderboard(leaderboard) {
  const container = document.getElementById("leaderboard-rows");
  container.innerHTML = "";

  if (leaderboard.length === 0) {
    container.innerHTML = `<div class="no-data">No miners yet</div>`;
    return;
  }

  function formatNumber(num) {
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  }
  
  leaderboard.forEach(miner => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <div class="rank">#${miner.rank}</div>
      <div class="user-info">
        <span class="username">${escapeHtml(miner.username)}</span>
      </div>
      <div class="amount">${escapeHtml(formatNumber(miner.amount))}</div>
    `;
    container.appendChild(row);
  });
}

function showError(message) {
  document.getElementById("leaderboard-rows")
    .innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", fetchLeaderboard);