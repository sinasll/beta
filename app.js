import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";
const INITIAL_MINING_DAYS = 90;

// DOM Elements
const elements = {
  minedEl: document.getElementById('mined'),
  balanceEl: document.getElementById('balance'),
  usernameEl: document.getElementById('username'),
  powerEl: document.getElementById('power'),
  mineBtn: document.getElementById('mineButton'),
  totalMinersEl: document.getElementById('totalminers'),
  countdownEl: document.getElementById('countdown'),
  codeInput: document.getElementById('codeInput'),
  copyBtn: document.getElementById('copyButton'),
  submitBtn: document.getElementById('submitButton'),
  dailyCodeEl: document.getElementById('dailyCode'),
  subsOfCodeEl: document.getElementById('subsOfCode'),
  sendBtn: document.getElementById('sendButton'),
  referralCountEl: document.getElementById('referral-count'),
  referralEarningsEl: document.getElementById('referral-earnings'),
  shareBtn: document.getElementById('shareButton'),
  miningEndEl: document.getElementById('miningend'),
  totalOfCodeEl: document.getElementById('totalOfCode'),
  referralCodeEl: document.getElementById('referralCode'),
  totalReferralsEl: document.getElementById('totalReferrals'),
  copyReferralBtn: document.getElementById('copyReferralButton'),
  inviteBtn: document.getElementById('inviteButton'),
  usedReferralCodeEl: document.getElementById('used-referral-code'),
  friendsContainerEl: document.getElementById('friendsContainer'),
  claimDailyBtn: document.getElementById('claimDailyBtn'),
  claimJoinBtn: document.getElementById('claimJoinBtn'),
  claimFollowBtn: document.getElementById('claimFollowBtn'),
  claimSubsBtn: document.getElementById('claimSubsBtn'),
  dailyTaskStatus: document.getElementById('dailyTaskStatus'),
  joinTaskStatus: document.getElementById('joinTaskStatus'),
  followTaskStatus: document.getElementById('followTaskStatus'),
  subsTaskStatus: document.getElementById('subsTaskStatus')
};

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
    hasClaimedDaily: false,
    hasClaimedJoin: false,
    hasClaimedFollow: false,
    hasClaimedSubs: false
};

let mineInterval = null;
let miningEndDate = null;
let miningEnded = false;

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
        // Update all elements that exist
        if (elements.balanceEl) elements.balanceEl.textContent = userData.balance.toFixed(3);
        if (elements.minedEl) elements.minedEl.textContent = userData.totalMined.toFixed(3);
        if (elements.powerEl) elements.powerEl.textContent = userData.miningPower.toFixed(1);
        
        if (elements.mineBtn) {
            elements.mineBtn.textContent = userData.isMining ? 'Mining...' : (miningEnded ? 'Mining Ended' : 'Start Mining');
            elements.mineBtn.disabled = userData.isMining || isAfterResetTime() || miningEnded;
        }
        
        if (elements.dailyCodeEl) elements.dailyCodeEl.textContent = userData.dailyCode;
        if (elements.subsOfCodeEl) elements.subsOfCodeEl.textContent = `${userData.codeSubmissionsToday}/10`;
        if (elements.totalOfCodeEl) elements.totalOfCodeEl.textContent = userData.totalCodeSubmissions;
        if (elements.referralCountEl) elements.referralCountEl.textContent = userData.referrals;
        if (elements.referralEarningsEl) elements.referralEarningsEl.textContent = userData.referralEarnings.toFixed(3);
        if (elements.referralCodeEl) elements.referralCodeEl.textContent = userData.ownReferralCode;
        if (elements.totalReferralsEl) elements.totalReferralsEl.textContent = userData.totalInvites;
        if (elements.usedReferralCodeEl) elements.usedReferralCodeEl.textContent = userData.usedReferralCode || 'None';
        
        // Task UI updates
        if (elements.claimDailyBtn) {
            elements.claimDailyBtn.disabled = userData.hasClaimedDaily;
            elements.claimDailyBtn.textContent = userData.hasClaimedDaily ? 'Claimed ✓' : 'Claim +0.1x Power';
            elements.dailyTaskStatus.textContent = userData.hasClaimedDaily ? 'Claimed' : 'Available';
        }
        
        if (elements.claimJoinBtn) {
            elements.claimJoinBtn.disabled = userData.hasClaimedJoin;
            elements.claimJoinBtn.textContent = userData.hasClaimedJoin ? 'Claimed ✓' : 'Claim +5 $BLACK';
            elements.joinTaskStatus.textContent = userData.hasClaimedJoin ? 'Claimed' : 'Available';
        }
        
        if (elements.claimFollowBtn) {
            elements.claimFollowBtn.disabled = userData.hasClaimedFollow;
            elements.claimFollowBtn.textContent = userData.hasClaimedFollow ? 'Claimed ✓' : 'Claim +5 $BLACK';
            elements.followTaskStatus.textContent = userData.hasClaimedFollow ? 'Claimed' : 'Available';
        }
        
        if (elements.claimSubsBtn) {
            const subsDisabled = userData.hasClaimedSubs || userData.totalCodeSubmissions < 10;
            elements.claimSubsBtn.disabled = subsDisabled;
            elements.claimSubsBtn.textContent = userData.hasClaimedSubs ? 'Claimed ✓' : 
                `Claim +10 $BLACK (${userData.totalCodeSubmissions}/10)`;
            elements.subsTaskStatus.textContent = userData.hasClaimedSubs ? 'Claimed' : 
                `${userData.totalCodeSubmissions}/10 submissions`;
        }

        if (elements.miningEndEl && miningEndDate) {
            const days = userData.daysRemaining || calculateDaysRemaining(miningEndDate);
            elements.miningEndEl.textContent = days <= 0 ? "Ended" : `${days} days`;
            miningEnded = days <= 0;
        }
    } catch (error) {
        console.error('UI update error:', error);
    }
}

function updateCountdown() {
    if (!userData.nextReset || !elements.countdownEl) return;
    const now = new Date();
    const nextReset = new Date(userData.nextReset);
    const timeUntilReset = nextReset - now;

    if (timeUntilReset <= 0) {
        elements.countdownEl.textContent = 'Reset time!';
        if (userData.isMining) stopMining();
        return;
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset / (1000 * 60)) % 60);
    const seconds = Math.floor((timeUntilReset / 1000) % 60);

    elements.countdownEl.textContent = `Daily reset in ${hours}h ${minutes}m ${seconds}s`;
}

async function fetchReferredFriends() {
    try {
        const payload = {
            ...initializeUser(),
            action: 'get_referred_friends'
        };
        const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const friends = JSON.parse(exec.responseBody || '[]');
        populateFriends(friends);
    } catch (error) {
        console.error('Error fetching referred friends:', error);
    }
}

function populateFriends(friends) {
    if (!elements.friendsContainerEl) return;
    
    elements.totalReferralsEl.textContent = friends.length;
    elements.friendsContainerEl.innerHTML = '';

    friends.forEach(f => {
        const row = document.createElement('div');
        row.className = 'friend-row stats-row';
        row.innerHTML = `<div>${f.username}</div>`;
        elements.friendsContainerEl.appendChild(row);
    });
}

async function fetchUserData() {
    try {
        const payload = initializeUser();
        if (elements.usernameEl) elements.usernameEl.textContent = payload.username;

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
        userData.codeSubmissionsToday = data.code_submissions_today || 0;
        userData.referrals = data.referrals || 0;
        userData.referralEarnings = data.referral_earnings || 0;
        userData.totalCodeSubmissions = data.total_code_submissions || 0;
        userData.ownReferralCode = data.own_referral_code || '';
        userData.totalInvites = data.total_invites || 0;
        userData.usedReferralCode = data.used_referral_code || '';
        userData.referralLinksClicked = data.referral_links_clicked || 0;
        userData.hasClaimedDaily = data.has_claimed_daily || false;
        userData.hasClaimedJoin = data.has_claimed_join_channel || false;
        userData.hasClaimedFollow = data.has_claimed_follow_ceo || false;
        userData.hasClaimedSubs = data.has_claimed_subs_task || false;

        if (data.mining_end_date) {
            miningEndDate = data.mining_end_date;
            userData.daysRemaining = data.days_remaining || calculateDaysRemaining(data.mining_end_date);
        }
        if (data.mining_ended) {
            miningEnded = true;
            stopMining();
        }

        if (elements.totalMinersEl && data.total_miners) {
            elements.totalMinersEl.textContent = Number(data.total_miners).toLocaleString('en-US');
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
        userData.codeSubmissionsToday = data.code_submissions_today || userData.codeSubmissionsToday;
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
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                this.classList.add('active');
            }
        });
    });
}

async function handleTaskClaim(taskType) {
    try {
        const payload = {
            ...initializeUser(),
            action: 'claim_task',
            task: taskType
        };

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error) {
            alert(data.message || 'Failed to claim task');
            return;
        }

        // Update all relevant user data from response
        userData.balance = data.balance || userData.balance;
        userData.miningPower = data.mining_power || userData.miningPower;
        userData.hasClaimedDaily = data.has_claimed_daily || userData.hasClaimedDaily;
        userData.hasClaimedJoin = data.has_claimed_join_channel || userData.hasClaimedJoin;
        userData.hasClaimedFollow = data.has_claimed_follow_ceo || userData.hasClaimedFollow;
        userData.hasClaimedSubs = data.has_claimed_subs_task || userData.hasClaimedSubs;

        saveMiningState();
        updateUI();
        alert(data.message || 'Task claimed successfully!');
        
        // Refresh full user state
        await fetchUserData();
    } catch (err) {
        console.error('Task claim failed:', err);
        alert(err.message || 'Failed to claim task');
    }
}

function setupEventListeners() {
    // Mine button
    if (elements.mineBtn) {
        elements.mineBtn.addEventListener('click', async () => {
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

    // Copy button
    if (elements.copyBtn) {
        elements.copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(elements.dailyCodeEl.textContent);
                elements.copyBtn.textContent = 'Copied';
                setTimeout(() => {
                    if (elements.copyBtn) elements.copyBtn.textContent = 'Copy';
                }, 2000);
            } catch {}
        });
    }

    // Submit button
    if (elements.submitBtn) {
        elements.submitBtn.addEventListener('click', async () => {
            if (miningEnded) {
                alert("The mining period has ended. No more code submissions allowed.");
                return;
            }
            
            const submittedCode = elements.codeInput.value.trim();
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
                    elements.codeInput.value = '';
                } else {
                    alert(data.message || 'Code submission failed');
                }
            } catch (err) {
                console.error('Code submission failed:', err);
                alert(err.message || 'Failed to submit code.');
            }
        });
    }

    // Task buttons
    if (elements.claimDailyBtn) {
        elements.claimDailyBtn.addEventListener('click', () => handleTaskClaim('daily'));
    }
    if (elements.claimJoinBtn) {
        elements.claimJoinBtn.addEventListener('click', () => handleTaskClaim('join_channel'));
    }
    if (elements.claimFollowBtn) {
        elements.claimFollowBtn.addEventListener('click', () => handleTaskClaim('follow_ceo'));
    }
    if (elements.claimSubsBtn) {
        elements.claimSubsBtn.addEventListener('click', () => handleTaskClaim('subs'));
    }

    // Other buttons
    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', () => {
            const code = elements.dailyCodeEl.textContent;
            const shareText = `Use my $BLACK code today: ${code}`;
            
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.sendData(shareText);
                tg.openLink(`https://t.me/share/url?url=${encodeURIComponent(shareText)}`);
            } else {
                alert(`Share this code: ${code}`);
            }
            
            elements.sendBtn.textContent = 'Sent ✓';
            setTimeout(() => {
                if (elements.sendBtn) elements.sendBtn.textContent = 'Send';
            }, 2000);
        });
    }

    if (elements.copyReferralBtn) {
        elements.copyReferralBtn.addEventListener('click', async () => {
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

    if (elements.inviteBtn) {
        elements.inviteBtn.addEventListener('click', async () => {
            try {
                const code = userData.ownReferralCode;
                const shareUrl = `https://t.me/betamineitbot?startapp=${code}`;
                const message = `🚀 Join $BLACK Mining!\nUse my code: ${code}\n${shareUrl}`;

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
    try {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.expand();
            tg.ready();
            tg.enableClosingConfirmation();
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        setupTabs();
        loadMiningState();
        
        // Initialize elements that exist
        await fetchUserData();
        await fetchReferredFriends();
        
        // Setup event listeners after elements are loaded
        setupEventListeners();

        if (userData.isMining && !isAfterResetTime() && !miningEnded) {
            await startMining();
        }

        // Start countdown if element exists
        if (elements.countdownEl) {
            setInterval(updateCountdown, 1000);
        }

        // Periodic refresh
        setInterval(async () => {
            await fetchUserData();
            updateUI();
        }, 300000);
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Start the application
init();
