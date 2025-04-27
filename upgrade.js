import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "680e403b001ed82fa62a";

// 2) Grab Telegram ID
let telegramId = '';
try {
  telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
} catch (e) {
  console.error('Telegram ID error', e);
}
if (!telegramId) {
  alert('❌ Telegram auth failed. Please open this in Telegram.');
}

// 3) UI helpers
const updateMiningPower = m => {
  document.getElementById('power').textContent = m.toFixed(2);
  document.getElementById('miningPowerDisplay').textContent = `${m.toFixed(2)}×`;
};
const disableButtons = () => {
  document.querySelectorAll('.purchase-button').forEach(b => b.disabled = true);
};

// 4) Purchase action
async function purchase(multiplier, cost) {
  if (!telegramId) return;

  const payload = {
    action: 'purchase_upgrade',
    telegramId,
    multiplier,
    cost
  };

  try {
    const exec = await functions.createExecution(
      '680e403b001ed82fa62a',      // your upgrade Function ID
      JSON.stringify(payload)
    );
    const resp = JSON.parse(exec.response || '{}');

    if (resp.success) {
      updateMiningPower(resp.mining_power);
      disableButtons();
      alert(`✅ Upgrade bought!\nNew balance: ${resp.balance} $BLACK`);
    } else {
      alert(`❌ ${resp.message}`);
    }
  } catch (err) {
    console.error('Upgrade error', err);
    alert('❌ Error making purchase.');
  }
}

// 5) Wire up buttons
document.querySelectorAll('.purchase-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = parseFloat(btn.dataset.multiplier);
    const c = parseInt(btn.dataset.cost, 10);
    purchase(m, c);
  });
});
