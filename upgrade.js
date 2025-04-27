import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07")
  .setKey('standard_7bceec7ebf159377560f2f18c323a9c75924086dd7058f791a208052b7324402b7f7f49cdb96ac16ab08abc026b817d6e31b5f6ee941fd3af8dc0330655c019d26082185101cc78c59ea06f8fb0c8c312e9205938f88ee17016ef38fc017e0d1b63f65ee20903452bcdcc66e928dbc389afd6db4fc97ca26934935ec33aaa4de');

  const functions = new Functions(client);
const UPGRADE_FN_ID = '680e403b001ed82fa62a';

let telegramId = '';
try {
  telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
} catch (e) {
  console.error('Telegram init error', e);
}
if (!telegramId) {
  alert('🚫 Please open this WebApp inside Telegram.');
}

const updateMiningPower = (m) => {
  const p = m.toFixed(2);
  const el = document.getElementById('power');
  if (el) el.textContent = p;
};
const disableButtons = () => {
  document.querySelectorAll('.purchase-button').forEach(b => b.disabled = true);
};

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

async function purchase(multiplier, cost) {
  if (!telegramId) return;

  const payload = { action: 'purchase_upgrade', telegramId, multiplier, cost };

  try {
    const exec = await functions.createExecution(
      UPGRADE_FN_ID,
      JSON.stringify(payload)
    );

    const result = await waitExecution(exec.$id);

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

document.querySelectorAll('.purchase-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = parseFloat(btn.dataset.multiplier);
    const c = parseInt(btn.dataset.cost, 10);
    purchase(m, c);
  });
});