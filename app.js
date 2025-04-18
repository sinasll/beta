import { Client, Functions, Databases, Query } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const databases = new Databases(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// User state management
let userState = {
  balance: 0,
  miningPower: 1.0,
  telegramId: '',
  lastMined: 0,
  isMining: false,
  miningInterval: null
};

// DOM Elements
const elements = {
  balance: document.getElementById('balance'),
  power: document.getElementById('power'),
  mined: document.getElementById('mined'),
  totalMiners: document.getElementById('totalminers'),
  username: document.getElementById('username'),
  mineButton: document.getElementById('mineButton'),
  upgradeButton: document.getElementById('upgradeButton'),
  upgradeModal: document.getElementById('upgradeModal'),
  closeModal: document.getElementById('closeModal')
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initializeUser();
  await loadGlobalStats();
});

function setupEventListeners() {
  // Mining control
  elements.mineButton.addEventListener('click', toggleMining);
  
  // Upgrade modal
  elements.upgradeButton.addEventListener('click', openUpgradeModal);
  elements.closeModal.addEventListener('click', closeUpgradeModal);
  
  // Upgrade options
  document.querySelectorAll('.power-buy').forEach(button => {
    button.addEventListener('click', () => handleUpgrade(
      parseFloat(button.dataset.power),
      parseFloat(button.dataset.price)
    ));
  });
  
  // Close modal when clicking outside
  elements.upgradeModal.addEventListener('click', (e) => {
    if (e.target === elements.upgradeModal) closeUpgradeModal();
  });
  
  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.upgradeModal.classList.contains('active')) {
      closeUpgradeModal();
    }
  });
}

async function initializeUser() {
  try {
    // Get Telegram user data if available
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const user = tg.initDataUnsafe?.user;
      userState.telegramId = user?.id.toString();
      elements.username.textContent = user?.username || 
                                   `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 
                                   'miner';
    } else {
      userState.telegramId = 'web-' + Math.random().toString(36).substring(2, 9);
      elements.username.textContent = 'web-miner';
    }

    // Initialize or load user
    const response = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({
        action: 'init',
        telegramId: userState.telegramId,
        username: elements.username.textContent
      })
    );

    const result = JSON.parse(response.responseBody);
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Update user state
    if (result.user) {
      userState.balance = result.user.balance || 0;
      userState.miningPower = result.user.mining_power || 1.0;
      updateUI();
    }

  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to initialize: ' + error.message);
  }
}

async function loadGlobalStats() {
  try {
    const stats = await databases.listDocuments(
      '6800de0c0035c758bb6f',
      '6800df4e002aadae499f',
      [Query.select(['total_mined'])]
    );
    
    const totalMined = stats.documents.reduce((sum, user) => sum + (user.total_mined || 0), 0);
    elements.mined.textContent = (totalMined / 1000000).toFixed(3);
    elements.totalMiners.textContent = stats.total;
  } catch (error) {
    console.error('Failed to load global stats:', error);
  }
}

async function toggleMining() {
  if (userState.isMining) {
    stopMining();
  } else {
    await startMining();
  }
}

async function startMining() {
  try {
    // Client-side cooldown check
    const MINING_COOLDOWN = 1000 * 30; // 30 seconds
    if (userState.lastMined && Date.now() - userState.lastMined < MINING_COOLDOWN) {
      alert(`Please wait ${Math.ceil((MINING_COOLDOWN - (Date.now() - userState.lastMined)) / 1000)} seconds`);
      return;
    }

    userState.isMining = true;
    elements.mineButton.textContent = 'Stop Mining';
    elements.mineButton.disabled = true;

    // Initial mining request
    const response = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({
        action: 'mine',
        telegramId: userState.telegramId,
        lastMined: userState.lastMined || Date.now()
      })
    );

    const result = JSON.parse(response.responseBody);
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Update state
    userState.balance = result.newBalance;
    userState.miningPower = result.miningPower || userState.miningPower;
    userState.lastMined = Date.now();
    
    updateUI();
    
    // Start recursive mining with delay
    userState.miningInterval = setTimeout(startMining, 10000);

  } catch (error) {
    console.error('Mining error:', error);
    alert('Mining failed: ' + error.message);
    stopMining();
  } finally {
    elements.mineButton.disabled = false;
  }
}

function stopMining() {
  clearTimeout(userState.miningInterval);
  userState.isMining = false;
  userState.miningInterval = null;
  elements.mineButton.textContent = 'Start Mining';
  
  // Notify server mining stopped
  updateUserSession(false).catch(console.error);
}

async function handleUpgrade(power, price) {
  try {
    if (userState.balance < price) {
      throw new Error('Insufficient balance');
    }

    const response = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({
        action: 'upgrade',
        telegramId: userState.telegramId,
        power: power,
        price: price
      })
    );

    const result = JSON.parse(response.responseBody);
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Update local state
    userState.balance = result.newBalance;
    userState.miningPower = result.miningPower;
    updateUI();
    closeUpgradeModal();

  } catch (error) {
    console.error('Upgrade failed:', error);
    alert('Upgrade error: ' + error.message);
  }
}

async function updateUserSession(isActive) {
  try {
    await databases.updateDocument(
      '6800de0c0035c758bb6f',
      '6800df4e002aadae499f',
      userState.telegramId,
      {
        active_session: isActive,
        last_active: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('Session update failed:', error);
  }
}

function updateUI() {
  elements.balance.textContent = userState.balance.toFixed(3);
  elements.power.textContent = userState.miningPower.toFixed(1);
}

function openUpgradeModal() {
  elements.upgradeModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUpgradeModal() {
  elements.upgradeModal.classList.remove('active');
  document.body.style.overflow = '';
}

// Service Worker registration for background mining
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful');
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}