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
const pasteBtn = document.getElementById('pasteButton');
const submitBtn = document.getElementById('submitButton');
const sendBtn = document.getElementById('sendButton');
const shareBtn = document.getElementById('shareButton');
const dailyCodeEl = document.getElementById('dailyCode');
const subsOfCodeEl = document.getElementById('subsOfCode');
const totalOfCodeEl = document.getElementById('totalOfCode');
const referralCountEl = document.getElementById('referral-count');
const referralEarningsEl = document.getElementById('referral-earnings');
const miningEndEl = document.getElementById('miningend');

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
let miningDotInterval = null;
let miningDotCount = 0;
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
    return userData.nextReset && new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
    localStorage.setItem('isMining', userData.isMining);
    localStorage.setItem('nextReset', userData.nextReset);
    localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
    localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday);
    localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions);
}

function loadMiningState() {
    const reset = localStorage.getItem('nextReset');
    if (reset && new Date() < new Date(reset)) {
        userData.isMining = localStorage.getItem('isMining') === 'true';
        userData.nextReset = reset;
        userData.submittedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
        userData.codeSubmissionsToday = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
        userData.totalCodeSubmissions = parseInt(localStorage.getItem('totalCodeSubmissions') || '0');
    } else {
        localStorage.clear();
        userData.isMining = false;
        userData.submittedCodes = [];
        userData.codeSubmissionsToday = 0;
        userData.totalCodeSubmissions = 0;
    }
}

function initializeUser() {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        const username = u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim();
        return { username, telegramId: u.id.toString(), referralCode: new URLSearchParams(location.search).get('ref') || '' };
    }
    let name = localStorage.getItem('guestUsername');
    if (!name) {
        name = 'guest_' + Math.random().toString(36).substr(2,5);
        localStorage.setItem('guestUsername', name);
    }
    return { username: name, telegramId: '', referralCode: new URLSearchParams(location.search).get('ref') || '' };
}

function startDotAnimation() {
    clearInterval(miningDotInterval);
    miningDotCount = 0;
    miningDotInterval = setInterval(() => {
        miningDotCount = (miningDotCount % 3) + 1;
        mineBtn.textContent = 'Mining' + '.'.repeat(miningDotCount);
    }, 500);
}

function stopDotAnimation() {
    clearInterval(miningDotInterval);
    miningDotInterval = null;
    updateUI();
}

function updateUI() {
    balanceEl.textContent = userData.balance.toFixed(3);
    minedEl.textContent = userData.totalMined.toFixed(3);
    powerEl.textContent = userData.miningPower.toFixed(1);
    if (!userData.isMining) {
        mineBtn.textContent = miningEnded ? 'Mining Ended' : 'Start Mining';
    }
    mineBtn.disabled = userData.isMining || isAfterResetTime() || miningEnded;
    dailyCodeEl.textContent = userData.dailyCode || '…';
    subsOfCodeEl.textContent = `${userData.codeSubmissionsToday}/10`;
    totalOfCodeEl.textContent = userData.totalCodeSubmissions;
    referralCountEl.textContent = userData.referrals;
    referralEarningsEl.textContent = userData.referralEarnings.toFixed(3);
    if (miningEndDate) {
        const rem = new Date(miningEndDate) - new Date();
        if (rem <= 0) {
            miningEndEl.textContent = 'Ended'; miningEnded = true; stopMining();
        } else {
            miningEndEl.textContent = Math.ceil(rem/(1000*60*60*24)) + ' days';
        }
    }
    const code = codeInput.value.trim();
    submitBtn.disabled = code.length !== 10 || code === userData.dailyCode || userData.submittedCodes.includes(code) || miningEnded;
}

function updateCountdown() {
    if (!userData.nextReset) return;
    const diff = new Date(userData.nextReset) - new Date();
    if (diff <= 0) { countdownEl.textContent = 'Reset time!'; if (userData.isMining) stopMining(); return; }
    const h = Math.floor(diff/3600000), m = Math.floor((diff/60000)%60), s = Math.floor((diff/1000)%60);
    countdownEl.textContent = `Daily reset in ${h}h ${m}m ${s}s`;
}

async function fetchUserData() {
    const { username } = initializeUser(); usernameEl.textContent = username;
    try {
        const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(initializeUser()));
        const data = JSON.parse(exec.responseBody||'{}');
        if (!data.error) {
            userData = {
                isMining: data.active_session,
                balance: data.balance||0,
                totalMined: data.total_mined||0,
                miningPower: data.mining_power||1,
                nextReset: data.next_reset||getDefaultResetTime(),
                dailyCode: data.daily_code||'',
                submittedCodes: data.submitted_codes||[],
                codeSubmissionsToday: data.code_submissions_today||0,
                referrals: data.referrals||0,
                referralEarnings: data.referral_earnings||0,
                totalCodeSubmissions: data.total_code_submissions||0
            };
            miningEndDate = data.mining_end_date;
            miningEnded = data.mining_ended;
            if (data.total_miners) totalMinersEl.textContent = data.total_miners;
            saveMiningState(); updateUI();
        }
    } catch(e){ console.error(e); }
}

async function mineCoins() {
    if (isAfterResetTime()||miningEnded) { stopMining(); return; }
    try {
        const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(initializeUser()));
        const d = JSON.parse(exec.responseBody||'{}');
        if (d.updated?.active_session) {
            Object.assign(userData, {
                balance: d.updated.balance,
                totalMined: d.total_mined,
                miningPower: d.updated.mining_power,
                nextReset: d.next_reset||userData.nextReset,
                codeSubmissionsToday: d.code_submissions_today||userData.codeSubmissionsToday,
                referrals: d.referrals||userData.referrals,
                referralEarnings: d.referral_earnings||userData.referralEarnings,
                totalCodeSubmissions: d.total_code_submissions||userData.totalCodeSubmissions
            });
            if(d.mining_ended) miningEnded=true;
            updateUI();
        } else stopMining();
    } catch(e){ console.error(e); stopMining(); }
}

async function startMining() {
    if (userData.isMining||isAfterResetTime()||miningEnded) return;
    try {
        const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify({...initializeUser(), action:'start_mining'}));
        const d = JSON.parse(exec.responseBody||'{}');
        if(d.started) {
            userData.isMining = true;
            userData.nextReset = d.next_reset||userData.nextReset;
            userData.codeSubmissionsToday = d.code_submissions_today||0;
            miningEndDate = d.mining_end_date;
            miningEnded = d.mining_ended;
            saveMiningState(); startDotAnimation(); await mineCoins();
            mineInterval = setInterval(mineCoins,60000);
        }
    } catch(e){ console.error(e); }
}

function stopMining() {
    clearInterval(mineInterval); mineInterval=null; userData.isMining=false;
    saveMiningState(); stopDotAnimation();
}

// Tab switching
function setupTabs(){
    document.querySelectorAll('.tab-list li a').forEach(link=>{ link.addEventListener('click',e=>{
        e.preventDefault();
        document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.tab-list li a').forEach(l=>l.classList.remove('active'));
        document.getElementById(link.dataset.tab).classList.add('active');
        link.classList.add('active');
    });});
}

// Button feedback
copyBtn.addEventListener('click',async()=>{
    await navigator.clipboard.writeText(userData.dailyCode||'');
    copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy',2000);
});

pasteBtn.addEventListener('click',async()=>{
    try{const t=await navigator.clipboard.readText(); codeInput.value=t; pasteBtn.textContent='Pasted';}
    catch{pasteBtn.textContent='Error';}
    setTimeout(()=>pasteBtn.textContent='Paste',2000);
});

submitBtn.addEventListener('click',async()=>{
    const c=codeInput.value.trim();
    if(!c){submitBtn.textContent='Enter code';return setTimeout(()=>submitBtn.textContent='Submit',2000);}
    try{
        const exec=await functions.createExecution(FUNCTION_ID,JSON.stringify({...initializeUser(),action:'submit_code',code:c}));
        const d=JSON.parse(exec.responseBody||'{}');
        if(d.success){
            userData.balance=d.balance; userData.miningPower=d.mining_power;
            userData.submittedCodes.push(c); userData.totalCodeSubmissions=d.total_code_submissions;
            userData.codeSubmissionsToday=d.owner_submissions;
            saveMiningState(); updateUI();
            submitBtn.textContent='Submitted';
        } else submitBtn.textContent='Failed';
    } catch{submitBtn.textContent='Error';}
    setTimeout(()=>submitBtn.textContent='Submit',2000);
});

sendBtn.addEventListener('click',()=>{
    const code=userData.dailyCode;
    if(!code){sendBtn.textContent='No code';return setTimeout(()=>sendBtn.textContent='Send',2000);}
    if(window.Telegram?.WebApp){
        window.Telegram.WebApp.sendData(`Use my $BLACK code: ${code}`);
        window.Telegram.WebApp.close();
    } else {
        navigator.clipboard.writeText(code);
        sendBtn.textContent='Copied'; setTimeout(()=>sendBtn.textContent='Send',2000);
    }
});

shareBtn.addEventListener('click',()=>{
    const link=`${location.origin}${location.pathname}?ref=${userData.dailyCode}`;
    if(navigator.share){ navigator.share({title:'Join $BLACK Mining',text:'Use my referral code!',url:link}); }
    else { navigator.clipboard.writeText(link); shareBtn.textContent='Copied'; setTimeout(()=>shareBtn.textContent='Share',2000); }
});

codeInput.addEventListener('input',updateUI);

async function init(){
    const tg=window.Telegram?.WebApp;
    if(tg){tg.expand();tg.ready();tg.enableClosingConfirmation();}
    setupTabs(); loadMiningState(); await fetchUserData();
    if(userData.isMining&&!isAfterResetTime()&&!miningEnded){startDotAnimation(); mineInterval=setInterval(mineCoins,60000);}    
    setInterval(updateCountdown,1000);
    setInterval(async()=>{await fetchUserData();updateUI();},300000);
}

document.addEventListener('DOMContentLoaded',init);
