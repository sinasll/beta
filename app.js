import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// Elements
const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const powerEl = document.getElementById('power');
const mineBtn = document.getElementById('mineButton');
const totalMinersEl = document.getElementById('totalminers');
const countdownEl = document.getElementById('countdown');
const codeInput = document.getElementById('codeInput');
const copyBtn = document.getElementById('copyButton');
const submitBtn = document.getElementById('submitButton');
const dailyCodeEl = document.getElementById('dailyCode');
const subsOfCodeEl = document.getElementById('subsOfCode');
const sendBtn = document.getElementById('sendButton');
const referralCountEl = document.getElementById('referral-count');
const referralEarningsEl = document.getElementById('referral-earnings');
const shareBtn = document.getElementById('shareButton');
const miningEndEl = document.getElementById('miningend');
const totalOfCodeEl = document.getElementById('totalOfCode');

// State
let userData = {
    isMining: false,
    balance: 0,
    totalMined: 0,
    miningPower: 1.0,
    nextReset: null,
    dailyCode: '',
    submittedCodes: [],
    codeSubmissionsToday: 0,
    referrals: 0,
    referralEarnings: 0,
    totalCodeSubmissions: 0
};

let mineInterval = null;
let miningEndDate = null;
let miningEnded = false;

// Utilities
function getDefaultResetTime() {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(12, 0, 0, 0);
    if (now >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    return resetTime.toISOString();
}

function isAfterResetTime() {
    if (!userData.nextReset) return false;
    return new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
    localStorage.setItem('isMining', JSON.stringify(userData.isMining));
    localStorage.setItem('nextReset', userData.nextReset);
    localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
    localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
    localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions.toString());
}

function loadMiningState() {
    const storedReset = localStorage.getItem('nextReset');
    const storedIsMining = localStorage.getItem('isMining') === 'true';
    const storedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
    const storedSubmissions = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
    const storedTotalSubmissions = parseInt(localStorage.getItem('totalCodeSubmissions') || '0');
    
    if (storedReset && new Date() < new Date(storedReset)) {
        userData.isMining = storedIsMining;
        userData.nextReset = storedReset;
        userData.submittedCodes = storedCodes;
        userData.codeSubmissionsToday = storedSubmissions;
        userData.totalCodeSubmissions = storedTotalSubmissions;
    } else {
        localStorage.removeItem('isMining');
        localStorage.removeItem('nextReset');
        localStorage.removeItem('submittedCodes');
        localStorage.removeItem('codeSubmissionsToday');
        userData.isMining = false;
        userData.submittedCodes = [];
        userData.codeSubmissionsToday = 0;
    }
}

function initializeUser() {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        const username = user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        return {
            username,
            telegramId: user.id.toString(),
            referralCode: new URLSearchParams(window.location.search).get('ref') || ''
        };
    }

    let username = localStorage.getItem('guestUsername');
    if (!username) {
        username = 'guest_' + Math.random().toString(36).substring(2, 7);
        localStorage.setItem('guestUsername', username);
    }

    return {
        username,
        telegramId: '',
        referralCode: new URLSearchParams(window.location.search).get('ref') || ''
    };
}

function updateUI() {
    balanceEl.textContent = userData.balance.toFixed(3);
    minedEl.textContent = userData.totalMined.toFixed(3);
    powerEl.textContent = userData.miningPower.toFixed(1);
    mineBtn.textContent = userData.isMining ? 'Mining...' : (miningEnded ? 'Mining Ended' : 'Start Mining');
    mineBtn.disabled = userData.isMining || isAfterResetTime() || miningEnded;
    if (userData.dailyCode) dailyCodeEl.textContent = userData.dailyCode;
    subsOfCodeEl.textContent = `${userData.codeSubmissionsToday}/10`;
    totalOfCodeEl.textContent = userData.totalCodeSubmissions; // Updated to show total submissions
    referralCountEl.textContent = userData.referrals;
    referralEarningsEl.textContent = userData.referralEarnings.toFixed(3);
    
    // Update mining end countdown
    if (miningEndDate) {
        const now = new Date();
        const endDate = new Date(miningEndDate);
        const timeRemaining = endDate - now;
        
        if (timeRemaining <= 0) {
            miningEndEl.textContent = "Ended";
            mineBtn.disabled = true;
            mineBtn.textContent = "Mining Ended";
        } else {
            const days = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
            miningEndEl.textContent = `${days} days`;
        }
    }
    
    // Disable submit button if code is invalid or mining ended
    const code = codeInput.value.trim();
    submitBtn.disabled = code.length !== 10 || 
                        code === userData.dailyCode || 
                        userData.submittedCodes.includes(code) ||
                        miningEnded;
}

function updateCountdown() {
    if (!userData.nextReset) return;
    const now = new Date();
    const nextReset = new Date(userData.nextReset);
    const timeUntilReset = nextReset - now;

    if (timeUntilReset <= 0) {
        countdownEl.textContent = 'Reset time!';
        if (userData.isMining) stopMining();
        return;
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset / (1000 * 60)) % 60);
    const seconds = Math.floor((timeUntilReset / 1000) % 60);

    countdownEl.textContent = `Daily reset in ${hours}h ${minutes}m ${seconds}s`;
}

async function fetchUserData() {
    try {
        const payload = initializeUser();
        usernameEl.textContent = payload.username;

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error) {
            console.error('Backend error:', data.message);
            return;
        }

        userData.isMining = data.active_session || false;
        userData.balance = data.balance || 0;
        userData.totalMined = data.total_mined || 0;
        userData.miningPower = data.mining_power || 1.0;
        userData.nextReset = data.next_reset || getDefaultResetTime();
        userData.dailyCode = data.daily_code || '';
        userData.submittedCodes = data.submitted_codes || [];
        userData.codeSubmissionsToday = data.code_submissions_today || 0;
        userData.referrals = data.referrals || 0;
        userData.referralEarnings = data.referral_earnings || 0;
        userData.totalCodeSubmissions = data.total_code_submissions || 0; // Get from backend

        // Store mining end date if provided
        if (data.mining_end_date) {
            miningEndDate = data.mining_end_date;
        }
        if (data.mining_ended) {
            miningEnded = true;
            stopMining();
        }

        if (data.total_miners) totalMinersEl.textContent = data.total_miners;

        saveMiningState();
        updateUI();
        return data;
    } catch (err) {
        console.error('Failed to fetch user data:', err);
    }
}

async function mineCoins() {
    if (isAfterResetTime() || miningEnded) {
        stopMining();
        return;
    }

    try {
        const payload = initializeUser();
        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error || !data.updated?.active_session) {
            console.error('Mining error:', data.message);
            stopMining();
            return;
        }

        userData.balance = data.updated.balance;
        userData.totalMined = data.total_mined;
        userData.miningPower = data.updated.mining_power;
        userData.nextReset = data.next_reset || userData.nextReset;
        userData.codeSubmissionsToday = data.code_submissions_today || userData.codeSubmissionsToday;
        userData.referrals = data.referrals || userData.referrals;
        userData.referralEarnings = data.referral_earnings || userData.referralEarnings;
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;

        if (data.mining_ended) {
            miningEnded = true;
            stopMining();
        }

        updateUI();
    } catch (err) {
        console.error('Mining failed:', err);
        stopMining();
    }
}

async function startMining() {
    if (userData.isMining || isAfterResetTime() || miningEnded) return;
    
    try {
        const payload = {
            ...initializeUser(),
            action: 'start_mining'
        };

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error || !data.started) {
            alert(data.message || 'Failed to start mining');
            return;
        }

        userData.isMining = true;
        userData.nextReset = data.next_reset || userData.nextReset;
        userData.codeSubmissionsToday = data.code_submissions_today || 0;
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
        if (data.mining_end_date) miningEndDate = data.mining_end_date;
        if (data.mining_ended) miningEnded = true;
        
        saveMiningState();
        updateUI();
        
        await mineCoins();
        mineInterval = setInterval(mineCoins, 60000);
    } catch (err) {
        console.error('Start mining failed:', err);
        stopMining();
    }
}

function stopMining() {
    clearInterval(mineInterval);
    mineInterval = null;
    userData.isMining = false;
    saveMiningState();
    updateUI();
}

// Tab switching functionality
function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-list li a');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs and links
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-list li a').forEach(tabLink => {
                tabLink.classList.remove('active');
            });
            
            // Add active class to clicked tab and link
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            this.classList.add('active');
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Mining Button
    mineBtn.addEventListener('click', async () => {
        if (miningEnded) {
            mineBtn.textContent = '⛔ Ended!';
            setTimeout(() => mineBtn.textContent = 'Start Mining', 2000);
            return;
        }
        
        const originalText = mineBtn.textContent;
        mineBtn.textContent = '⏳ Starting...';
        mineBtn.disabled = true;

        try {
            if (!userData.isMining && !isAfterResetTime()) {
                await startMining();
            } else if (isAfterResetTime()) {
                await fetchUserData();
                mineBtn.textContent = '♻️ Refreshed!';
            }
        } catch (err) {
            mineBtn.textContent = '❌ Failed!';
            console.error('Mining error:', err);
        } finally {
            setTimeout(() => {
                mineBtn.textContent = originalText;
                mineBtn.disabled = false;
            }, 2000);
        }
    });

    // Copy Button
    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(dailyCodeEl.textContent);
            copyButton.textContent = '✓ Copied!';
            setTimeout(() => copyButton.textContent = 'Copy', 2000);
        } catch {
            copyButton.textContent = '❌ Failed!';
            setTimeout(() => copyButton.textContent = 'Copy', 2000);
        }
    });

    // Paste Button
    pasteButton.addEventListener('click', async () => {
        try {
            codeInput.value = await navigator.clipboard.readText();
            pasteButton.textContent = '✓ Pasted!';
            setTimeout(() => pasteButton.textContent = 'Paste', 2000);
        } catch {
            pasteButton.textContent = '❌ Failed!';
            setTimeout(() => pasteButton.textContent = 'Paste', 2000);
        }
    });

    // Submit Button
    submitButton.addEventListener('click', async () => {
        if (miningEnded) {
            submitButton.textContent = '⛔ Ended!';
            setTimeout(() => submitButton.textContent = 'Submit', 2000);
            return;
        }
        
        const submittedCode = codeInput.value.trim();
        if (!submittedCode) {
            submitButton.textContent = '⚠️ Enter Code!';
            setTimeout(() => submitButton.textContent = 'Submit', 2000);
            return;
        }
    
        const originalText = submitButton.textContent;
        submitButton.textContent = '⏳ Processing...';
        submitButton.disabled = true;
    
        try {
            const payload = { 
                action: 'submit_code', 
                code: submittedCode, 
                telegramId: userData.telegramId 
            };
            const response = await apiAction(payload);
            
            if (response.success) {
                submitButton.textContent = '✓ Success!';
                codeInput.value = '';
                updateUIFromResponse(response);
            } else {
                submitButton.textContent = `❌ ${response.message || 'Failed'}`;
            }
        } catch (err) {
            submitButton.textContent = '⚠️ Error!';
            console.error('Submission error:', err);
        } finally {
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 2000);
        }
    });

    // Send/Share Button
    sendButton.addEventListener('click', () => {
        const code = dailyCodeEl.textContent;
        const referralLink = `${window.location.origin}?ref=${code}`;
        
        if (!code || code === '…') {
            sendButton.textContent = '⚠️ No Code!';
            setTimeout(() => sendButton.textContent = 'Send', 1500);
            return;
        }

        const originalText = sendButton.textContent;
        sendButton.textContent = '✈️ Sharing...';
        sendButton.disabled = true;

        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                const message = `💰 Join $BLACK Mining!\nUse my code: ${code}\n${referralLink}`;
                tg.openLink(`tg://msg?text=${encodeURIComponent(message)}`);
                sendButton.textContent = '✓ Shared!';
            } else {
                navigator.clipboard.writeText(`${code} - ${referralLink}`);
                sendButton.textContent = '📋 Copied!';
            }
        } catch (err) {
            sendButton.textContent = '❌ Failed!';
            console.error('Sharing error:', err);
        } finally {
            setTimeout(() => {
                sendButton.textContent = originalText;
                sendButton.disabled = false;
            }, 2000);
        }
    });
}

// Initialize App
async function init() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.expand();
        tg.ready();
        tg.enableClosingConfirmation();
        
        // Initialize Telegram user
        if (tg.initDataUnsafe?.user) {
            userData.telegramId = tg.initDataUnsafe.user.id;
            userData.username = tg.initDataUnsafe.user.username || 
                              `User${tg.initDataUnsafe.user.id.slice(-4)}`;
        }
    }

    setupTabs();
    setupEventListeners();
    loadMiningState();
    await fetchUserData();

    if (userData.isMining && !isAfterResetTime() && !miningEnded) {
        await startMining();
    }

    // Update counters every second
    setInterval(updateCountdown, 1000);
    
    // Refresh data every 5 minutes
    setInterval(async () => {
        await fetchUserData();
        updateUI();
    }, 300000);
}

// Start application
document.addEventListener('DOMContentLoaded', init);

// Helper function: Update UI from API response
function updateUIFromResponse(response) {
    balanceEl.textContent = response.balance?.toFixed(3) || '0.000';
    powerEl.textContent = response.mining_power?.toFixed(1) || '1.0';
    minedEl.textContent = response.total_mined?.toFixed(3) || '0.000';
    totalminersEl.textContent = response.total_miners || '0';
    subsOfCodeEl.textContent = `${response.owner_submissions || 0}/10`;
    totalOfCodeEl.textContent = response.total_code_submissions || '0';
    
    if (response.daily_code) {
        dailyCodeEl.textContent = response.daily_code;
    }
}
