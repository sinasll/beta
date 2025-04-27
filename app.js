import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";
const INITIAL_MINING_DAYS = 90;

// DOM Elements
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
const referralCodeEl = document.getElementById('referralCode');
const totalReferralsEl = document.getElementById('totalReferrals');
const copyReferralBtn = document.getElementById('copyReferralButton');
const inviteBtn = document.getElementById('inviteButton');
const usedReferralCodeEl = document.getElementById('used-referral-code');
const friendsContainerEl = document.getElementById('friendsContainer');

// Task Elements
const taskItems = document.querySelectorAll('.task-item');

// Wire each “Claim” button to open the <a> in its description:
taskItems.forEach(li => {
  const btn  = li.querySelector('.complete-task');
  const link = li.querySelector('.task-desc a');
  
  if (link) {
    btn.disabled = false;
    btn.addEventListener('click', () => {
      window.open(link.href, '_blank');
    });
  }
});

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
    totalCodeSubmissions: 0,
    ownReferralCode: '',
    totalInvites: 0,
    usedReferralCode: '',
    referralLinksClicked: 0,
    daysRemaining: INITIAL_MINING_DAYS,
    tasksCompleted: {}
};

let mineInterval = null;
let miningEndDate = null;
let miningEnded = false;

// Helper function to format numbers (NEW)
function formatNumber(num, decimals = 3) {
    if (isNaN(num)) return '0' + '0'.repeat(decimals);
    
    const parts = Number(num).toFixed(decimals).split('.');
    const wholePart = parts[0];
    const decimalPart = parts[1] || '';
    
    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return formattedWhole + (decimalPart ? '.' + decimalPart : '');
}

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

function calculateDaysRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const timeRemaining = end - now;
    return Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
}

function saveMiningState() {
    localStorage.setItem('isMining', JSON.stringify(userData.isMining));
    localStorage.setItem('nextReset', userData.nextReset);
    localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
    localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
    localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions.toString());
    localStorage.setItem('daysRemaining', userData.daysRemaining.toString());
}

function loadMiningState() {
    const storedReset = localStorage.getItem('nextReset');
    const storedIsMining = localStorage.getItem('isMining') === 'true';
    const storedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
    const storedSubmissions = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
    const storedTotalSubmissions = parseInt(localStorage.getItem('totalCodeSubmissions') || '0');
    const storedDaysRemaining = parseInt(localStorage.getItem('daysRemaining') || INITIAL_MINING_DAYS);
    
    if (storedReset && new Date() < new Date(storedReset)) {
        userData.isMining = storedIsMining;
        userData.nextReset = storedReset;
        userData.submittedCodes = storedCodes;
        userData.codeSubmissionsToday = storedSubmissions;
        userData.totalCodeSubmissions = storedTotalSubmissions;
        userData.daysRemaining = storedDaysRemaining;
    } else {
        localStorage.removeItem('isMining');
        localStorage.removeItem('nextReset');
        localStorage.removeItem('submittedCodes');
        localStorage.removeItem('codeSubmissionsToday');
        localStorage.removeItem('daysRemaining');
        userData.isMining = false;
        userData.submittedCodes = [];
        userData.codeSubmissionsToday = 0;
        userData.daysRemaining = INITIAL_MINING_DAYS;
    }
}

function initializeUser() {
    const tg = window.Telegram?.WebApp;
    let referralCode = '';

    if (tg?.initDataUnsafe?.start_param) {
        referralCode = tg.initDataUnsafe.start_param;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        referralCode = urlParams.get('startapp') || urlParams.get('ref') || '';
    }

    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        return {
            username: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            telegramId: user.id.toString(),
            referralCode: referralCode
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
        referralCode: referralCode
    };
}

function updateUI() {
    try {
        // Updated with formatted numbers
        if (balanceEl) balanceEl.textContent = formatNumber(userData.balance);
        if (minedEl) minedEl.textContent = formatNumber(userData.totalMined);
        if (powerEl) powerEl.textContent = formatNumber(userData.miningPower, 1);
        if (mineBtn) {
            mineBtn.textContent = userData.isMining ? 'Mining...' : (miningEnded ? 'Mining Ended' : 'Start Mining');
            mineBtn.disabled = userData.isMining || isAfterResetTime() || miningEnded;
        }
        if (dailyCodeEl) dailyCodeEl.textContent = userData.dailyCode;
        if (subsOfCodeEl) subsOfCodeEl.textContent = `${formatNumber(userData.codeSubmissionsToday, 0)}/10`;
        if (totalOfCodeEl) totalOfCodeEl.textContent = formatNumber(userData.totalCodeSubmissions, 0);
        if (referralCountEl) referralCountEl.textContent = formatNumber(userData.referrals, 0);
        if (referralEarningsEl) referralEarningsEl.textContent = formatNumber(userData.referralEarnings);
        if (referralCodeEl) referralCodeEl.textContent = userData.ownReferralCode;
        if (totalReferralsEl) totalReferralsEl.textContent = formatNumber(userData.totalInvites, 0);
        if (usedReferralCodeEl) usedReferralCodeEl.textContent = userData.usedReferralCode || 'None';
        
        refreshTasksState();

        if (miningEndDate) {
            const days = userData.daysRemaining || calculateDaysRemaining(miningEndDate);
            miningEndEl.textContent = days <= 0 ? "Ended" : `${formatNumber(days, 0)} days`;
            miningEnded = days <= 0;
        }
    } catch (error) {
        console.error('UI update error:', error);
    }
}

function updateCountdown() {
    if (!userData.nextReset || !countdownEl) return;
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

    countdownEl.textContent = `Daily reset in ${formatNumber(hours, 0)}h ${formatNumber(minutes, 0)}m ${formatNumber(seconds, 0)}s`;
}

async function fetchReferredFriends() {
    const payload = {
        ...initializeUser(),
        action: 'get_referred_friends'
    };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const friends = JSON.parse(exec.responseBody || '[]');
    populateFriends(friends);
}

function populateFriends(friends) {
    totalReferralsEl.textContent = formatNumber(friends.length, 0);
    friendsContainerEl.innerHTML = '';
    friends.forEach(f => {
        const row = document.createElement('div');
        row.className = 'friend-row stats-row';
        row.innerHTML = `
            <div>${f.username}</div>
            <div>${formatNumber(f.balance)} $BLACK</div>
        `;
        friendsContainerEl.appendChild(row);
    });
}

function refreshTasksState() {
    taskItems.forEach(li => {
        const task = li.dataset.task;
        const done = !!userData.tasksCompleted[task];
        const prereqMet = task !== 'code10' || userData.totalCodeSubmissions >= 10;
        const btn = li.querySelector('.complete-task');
        btn.disabled = done || !prereqMet;
        btn.textContent = done ? 'Done' : 'Claim';
    });
}

async function handleTaskClick(task) {
    try {
        const payload = {
            ...initializeUser(),
            action: 'complete_task',
            task
        };
        const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(exec.responseBody || '{}');
        
        if (data.success) {
            userData.balance     = data.balance;
            userData.miningPower = data.mining_power;
            
            userData.tasksCompleted[task] = true;
            
            refreshTasksState();
            updateUI();
        } else {
            alert(data.message || 'Task failed');
        }
    } catch (err) {
        console.error('Task error:', err);
        alert(err.message || 'Error completing task');
    }
}


taskItems.forEach(li => {
    li.querySelector('.complete-task').addEventListener('click', () => {
        const task = li.dataset.task;
        handleTaskClick(task);
    });
});

async function fetchUserData() {
    try {
        const payload = initializeUser();
        if (usernameEl) usernameEl.textContent = payload.username;

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error) {
            console.error('Backend error:', data.message);
            return data;
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
        userData.totalCodeSubmissions = data.total_code_submissions || 0;
        userData.ownReferralCode = data.own_referral_code || '';
        userData.totalInvites = data.total_invites || 0;
        userData.usedReferralCode = data.used_referral_code || '';
        userData.referralLinksClicked = data.referral_links_clicked || 0;
        userData.tasksCompleted = data.tasks_completed || {};

        if (data.mining_end_date) {
            miningEndDate = data.mining_end_date;
            userData.daysRemaining = data.days_remaining || calculateDaysRemaining(data.mining_end_date);
        }
        if (data.mining_ended) {
            miningEnded = true;
            stopMining();
        }

        if (data.total_miners && totalMinersEl) {
            totalMinersEl.textContent = formatNumber(data.total_miners, 0);
        }

        saveMiningState();
        updateUI();
        return data;
    } catch (err) {
        console.error('Failed to fetch user data:', err);
        return null;
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
        userData.codeSubmissionsToday = data.updated.code_submissions_today || userData.codeSubmissionsToday;
        userData.referrals = data.referrals || userData.referrals;
        userData.referralEarnings = data.referral_earnings || userData.referralEarnings;
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
        userData.daysRemaining = data.days_remaining || userData.daysRemaining;

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
        if (data.mining_end_date) {
            miningEndDate = data.mining_end_date;
            userData.daysRemaining = data.days_remaining || calculateDaysRemaining(data.mining_end_date);
        }
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

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-list li a');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-list li a').forEach(tabLink => {
                tabLink.classList.remove('active');
            });
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            this.classList.add('active');
        });
    });
}

function setupEventListeners() {
    if (mineBtn) {
        mineBtn.addEventListener('click', async () => {
            if (miningEnded) {
                alert("The mining period has ended. No more mining is allowed.");
                return;
            }
            
            if (!userData.isMining && !isAfterResetTime()) {
                await startMining();
            } else if (isAfterResetTime()) {
                alert('Mining reset — please start again!');
                await fetchUserData();
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(dailyCodeEl.textContent);
                copyBtn.textContent = 'Copied';
                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
            } catch {}
        });
    }

    const pasteButton = document.getElementById('pasteButton');
    if (pasteButton) {
        pasteButton.addEventListener('click', async () => {
            try {
                codeInput.value = await navigator.clipboard.readText();
                pasteButton.textContent = 'Pasted';
                setTimeout(() => pasteButton.textContent = 'Paste', 2000);
            } catch {}
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (miningEnded) {
                alert("The mining period has ended. No more code submissions allowed.");
                return;
            }
            
            const submittedCode = codeInput.value.trim();
            if (!submittedCode) return alert('Please enter a code to submit');

            try {
                const payload = {
                    ...initializeUser(),
                    action: 'submit_code',
                    code: submittedCode
                };

                const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
                const data = JSON.parse(execution.responseBody || '{}');

                if (data.success) {
                    userData.balance = data.balance;
                    userData.submittedCodes = [...userData.submittedCodes, submittedCode];
                    userData.codeSubmissionsToday = data.owner_submissions || userData.codeSubmissionsToday;
                    userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
                    
                    saveMiningState();
                    updateUI();
                    alert(data.message || 'Code submitted successfully!');
                    codeInput.value = '';
                } else {
                    alert(data.message || 'Code submission failed');
                }
            } catch (err) {
                console.error('Code submission failed:', err);
                alert(err.message || 'Failed to submit code.');
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const code = dailyCodeEl.textContent;
            const shareText = `\nUse my $BLACK code today\n \`${code}\``;
            const shareUrl = `https://t.me/betamineitbot?startapp`;
            
            if (window.Telegram?.WebApp) {
                // Use Telegram's native sharing with proper formatting
                window.Telegram.WebApp.openTelegramLink(
                    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
                );
            } else {
                // Fallback for browsers
                navigator.clipboard.writeText(shareText);
                alert('Code copied to clipboard!');
            }
            
            sendBtn.textContent = 'Sending';
            setTimeout(() => sendBtn.textContent = 'Send', 2000);
        });
    }

    if (copyReferralBtn) {
        copyReferralBtn.addEventListener('click', async () => {
            try {
                const code = userData.ownReferralCode;
                const link = `https://t.me/betamineitbot?startapp=${code}`;
                await navigator.clipboard.writeText(link);
                
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.showAlert('Referral link copied!');
                } else {
                    alert('Link copied to clipboard!');
                }
            } catch (error) {
                console.error('Copy failed:', error);
                prompt('Please copy this link manually:', link);
            }
        });
    }

    if (inviteBtn) {
        inviteBtn.addEventListener('click', async () => {
            try {
                const code = userData.ownReferralCode;
                const shareUrl = `https://t.me/betamineitbot?startapp=${code}`;
                const message = `\nstart mining $BLACK today with one button!`;

                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openTelegramLink(
                        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`
                    );
                } else {
                    const shareLink = `tg://msg?text=${encodeURIComponent(message)}`;
                    window.open(shareLink, '_blank');
                }
            } catch (error) {
                console.error('Sharing failed:', error);
            }
        });
    }
}
async function init() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.expand();
        tg.ready();
        tg.enableClosingConfirmation();
    }

    setupTabs();
    setupEventListeners();
    loadMiningState();
    
    try {
        await fetchUserData();
        await fetchReferredFriends();    // ← NEW: load friends/referrals
        if (userData.isMining && !isAfterResetTime() && !miningEnded) {
            await startMining();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }

    setInterval(updateCountdown, 1000);
    setInterval(async () => {
        await fetchUserData();
        updateUI();
    }, 300000);
}

document.addEventListener('DOMContentLoaded', init);
