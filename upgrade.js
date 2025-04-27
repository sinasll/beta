import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

  const functions = new Functions(client);
const UPGRADE_FN_ID = '680e403b001ed82fa62a';

// ─── Grab Telegram ID ────────────────────────────────────────────────────────
let telegramId = '';
try {
  telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
} catch (e) {
  console.error('Telegram init error', e);
}
if (!telegramId) {
  alert('🚫 Please open this WebApp inside Telegram.');
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────
const updateMiningPower = (m) => {
  const p = m.toFixed(2);
  const el = document.getElementById('power');
  if (el) el.textContent = p;
};
const disableButtons = () => {
  document.querySelectorAll('.purchase-button').forEach(b => b.disabled = true);
};

// ─── Wait for Function to Complete ──────────────────────────────────────────
async function waitExecution(execId, attempts = 10, interval = 500) {
  for (let i = 0; i < attempts; i++) {
    const status = await functions.getExecution(UPGRADE_FN_ID, execId);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Function execution timed out');
}

// ─── Purchase Handler ────────────────────────────────────────────────────────
async function purchase(multiplier, cost) {
  if (!telegramId) return;

  const payload = { action: 'purchase_upgrade', telegramId, multiplier, cost };

  try {
    // 1) kick off the Function
    const exec = await functions.createExecution(
      UPGRADE_FN_ID,
      JSON.stringify(payload)
    );

    // 2) wait for it to finish
    const result = await waitExecution(exec.$id);

    // 3) parse & apply
    const resp = JSON.parse(result.response || '{}');
    if (resp.success) {
      updateMiningPower(resp.mining_power);
      disableButtons();
      alert(`✅ Purchased!\nNew balance: ${resp.balance} $BLACK`);
    } else {
      alert(`❌ ${resp.message || 'Purchase failed.'}`);
    }

  } catch (err) {
    console.error('Upgrade error:', err);
    alert(`❌ ${err.message}`);
  }
}

// ─── Wire Up Buttons ─────────────────────────────────────────────────────────
document.querySelectorAll('.purchase-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = parseFloat(btn.dataset.multiplier);
    const c = parseInt(btn.dataset.cost, 10);
    purchase(m, c);
  });
});