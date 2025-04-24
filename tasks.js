// --------------------------------------------------
// Appwrite Client (uses same endpoint/project)
// --------------------------------------------------
import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");
const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// --------------------------------------------------
// Task Definitions
// --------------------------------------------------
let logicTasks = [
  { id: 'mine60',      title: 'Mine for 60 seconds',           completed: false },
  { id: 'submitCode',  title: 'Submit a referral code',        completed: false },
  { id: 'reachPower2', title: 'Reach x2 mining power',          completed: false },
  { id: 'inviteFriend',title: 'Invite a friend who opens app', completed: false },
  { id: 'earnBonus',   title: 'Claim your 0.1× bonus',         completed: false }
];

// State we fetch from backend
let userDataTasks = {
  codeSubmissionsToday: 0,
  miningPower: 1.0,
  referrals: 0,
  hasEarnedBonus: false
};

// Read mining-session start (set by your main app)
function getMiningSessionStart() {
  return parseInt(localStorage.getItem('miningSessionStart') || '0', 10);
}

// --------------------------------------------------
// UI Renderer
// --------------------------------------------------
function renderTasks() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';

  logicTasks.forEach(task => {
    // if backend says this task is done, or we just completed it, show ✔
    const done = task.completed;
    const btnLabel = task.id === 'earnBonus' ? 'Claim' : 'Complete';

    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <span class="task-title">${task.title}</span>
      ${
        done
          ? `<span class="task-completed">✔ ${task.id==='earnBonus'?'Claimed':'Completed'}</span>`
          : `<button class="task-button" id="btn_${task.id}">${btnLabel}</button>`
      }
    `;
    container.appendChild(div);

    if (!done) {
      document
        .getElementById(`btn_${task.id}`)
        .addEventListener('click', () => completeTask(task.id));
    }
  });
}

// --------------------------------------------------
// Task Completer (with server‐side persist)
// --------------------------------------------------
async function completeTask(taskId) {
  // 1) local prereq checks
  const now = Date.now();
  switch (taskId) {
    case 'mine60': {
      const start = getMiningSessionStart();
      if (!start || now - start < 60_000) {
        return alert('You must mine for at least 60 seconds first.');
      }
      break;
    }
    case 'submitCode':
      if (userDataTasks.codeSubmissionsToday < 1) {
        return alert('Submit at least one code today first.');
      }
      break;
    case 'reachPower2':
      if (userDataTasks.miningPower < 2.0) {
        return alert('Boost your mining power to 2× first.');
      }
      break;
    case 'inviteFriend':
      if (userDataTasks.referrals < 1) {
        return alert('Invite a friend and have them open the app.');
      }
      break;
    case 'earnBonus':
      // always allowed once
      break;
    default:
      return;
  }

  // 2) call the same backend function
  try {
    const payload = {
      ...initializeUser(),
      action: 'complete_task',
      taskId
    };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error) throw new Error(data.message);

    // 3) update local state and re-render
    logicTasks = logicTasks.map(t =>
      t.id === taskId ? { ...t, completed: true } : t
    );
    renderTasks();
    alert('Task completed! 🎉');
  } catch (err) {
    console.error('Task completion failed:', err);
    alert(err.message || 'Could not complete task right now.');
  }
}

// --------------------------------------------------
// User Fetch (same Telegram/guest logic as app.js)
// --------------------------------------------------
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    const name = u.username || `${u.first_name||''} ${u.last_name||''}`.trim();
    const ref  = new URLSearchParams(location.search).get('ref') || '';
    return { username: name, telegramId: String(u.id), referralCode: ref };
  }
  let guest = localStorage.getItem('guestUsername');
  if (!guest) {
    guest = 'guest_' + Math.random().toString(36).slice(2,7);
    localStorage.setItem('guestUsername', guest);
  }
  const ref = new URLSearchParams(location.search).get('ref') || '';
  return { username: guest, telegramId: '', referralCode: ref };
}

// --------------------------------------------------
// Load User Data + Completed Tasks
// --------------------------------------------------
async function fetchUserDataTasks() {
  const payload = initializeUser();
  try {
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error) throw new Error(data.message);

    // map only what tasks need:
    userDataTasks.codeSubmissionsToday = data.code_submissions_today || 0;
    userDataTasks.miningPower         = data.mining_power || 1.0;
    userDataTasks.referrals           = data.referrals || 0;
    userDataTasks.hasEarnedBonus      = !!data.has_earned_bonus;

    // mark any tasks the server already recorded
    const done = data.completed_tasks || [];
    logicTasks = logicTasks.map(t => ({
      ...t,
      completed: done.includes(t.id) || (t.id==='earnBonus' && userDataTasks.hasEarnedBonus)
    }));

    renderTasks();
  } catch (err) {
    console.error('fetchUserDataTasks error:', err);
  }
}

// --------------------------------------------------
// Initialize
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserDataTasks();
});
