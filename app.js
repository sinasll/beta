import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

let isMining     = false;
let userBalance  = 0;
let totalMined   = 0;
let mineInterval = null;

const minedEl        = document.getElementById('mined');
const balanceEl      = document.getElementById('balance');
const totalMinersEl  = document.getElementById('totalminers');
const mineBtn        = document.getElementById('mineButton');

mineBtn.addEventListener('click', () => {
  if (!isMining) {
    startMining();
  } else {
    stopMining();
  }
});

function startMining() {
  isMining = true;
  mineBtn.textContent = 'Stop Mining';

  mineInterval = setInterval(async () => {
    try {
      const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify({}));
      const data = JSON.parse(execution.responseBody);
      const increment = data.mined || 0;

      userBalance += increment;
      totalMined  += increment;

      balanceEl.textContent = userBalance.toFixed(3);
      minedEl.textContent   = totalMined.toFixed(3);
    } catch (err) {
      console.error('Mining error:', err);
      stopMining();
    }
  }, 1000);
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  isMining     = false;
  mineBtn.textContent = 'Start Mining';
}
