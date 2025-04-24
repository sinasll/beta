// --------------------------------------------------
// Appwrite Client (same as app.js)
// --------------------------------------------------
import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");
const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5"; // your mining function that also handles tasks

// --------------------------------------------------
// Task Definitions
// --------------------------------------------------
const logicTasks = [
  { id: 'mine60',       title: 'Mine for 60 seconds',           completed: false },
  { id: 'submitCode',   title: 'Submit a referral code',        completed: false },
  { id: 'reachPower2',  title: 'Reach x2 mining power',          completed: false },
  { id: 'inviteFriend', title: 'Invite a friend who opens app', completed: false },
];

// State we fetch from backend
let userDataTasks = {
  codeSubmissionsToday: 0,
  miningPower: 1.0,
  referrals: 0
};
// Read mining start time from your main app
function getMiningSessionStart() {
  return parseInt(localStorage.getItem('miningSessionStart') || '0', 10);
}

// --------------------------------------------------
// Persistence for tasks
// --------------------------------------------------
function loadTasksState() {
  try {
    const saved = JSON.parse(localStorage.getItem('taskStates') || '[]');
    saved.forEach(s => {
      const t = logicTasks.find(t => t.id === s.id);
      if (t) t.completed = s.completed;
    });
  } catch {}
}

function saveTasksState() {
  const states = logicTasks.map(t => ({ id: t.id, completed: t.completed }));
  localStorage.setItem('taskStates', JSON.stringify(states));
}

// --------------------------------------------------
// UI Rendering
// --------------------------------------------------
function renderTasks() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';
  logicTasks.forEach(task => {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <span class="task-title">${task.title}</span>
      ${
        task.completed
          ? '<span class="task-completed">✔ Completed</span>'
          : `<button class="task-button" id="btn_${task.id}">Complete</button>`
      }
    `;
    container.appendChild(div);
    if (!task.completed) {
      document
        .getElementById(`btn_${task.id}`)
        .addEventListener('click', () => completeTask(task.id));
    }
  });
}

// --------------------------------------------------
// Task Completion Logic (with backend update)
// --------------------------------------------------
async function completeTask(taskId) {
  const task = logicTasks.find(t => t.id === taskId);
  if (!task || task.completed) return;

  // 1) Check local condition first
  let ok = false;
  const now = Date.now();
  switch (taskId) {
    case 'mine60': {
      const start = getMiningSessionStart();
      if (start && now - start >= 60_000) ok = true;
      else return alert('You must mine for at least 60 seconds first.');
      break;
    }
    case 'submitCode':
      if (userDataTasks.codeSubmissionsToday > 0) ok = true;
      else return alert('Submit at least one code today first.');
      break;
    case 'reachPower2':
      if (userDataTasks.miningPower >= 2.0) ok = true;
      else return alert('Boost your mining power to 2×.');
      break;
    case 'inviteFriend':
      if (userDataTasks.referrals >= 1) ok = true;
      else return alert('Invite a friend and have them open the app.');
      break;
  }

  if (!ok) return; 

  // 2) Call backend to record it
  try {
    const payload = {
      ...initializeUser(),
      action: 'complete_task',
      taskId
    };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error) throw new Error(data.message);

    // 3) Mark locally & re-render
    task.completed = true;
    saveTasksState();
    renderTasks();
    alert('Task completed! 🎉');
  } catch (err) {
    console.error('Failed to record task completion:', err);
    alert(err.message || 'Could not complete task. Try again later.');
  }
}

// --------------------------------------------------
// Fetch User Data (same user as mine page)
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

async function fetchUserDataTasks() {
  const payload = initializeUser();
  try {
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error) throw new Error(data.message);

    // Map only what tasks need:
    userDataTasks.codeSubmissionsToday = data.code_submissions_today || 0;
    userDataTasks.miningPower         = data.mining_power || 1.0;
    userDataTasks.referrals           = data.referrals || 0;

    renderTasks();
  } catch (err) {
    console.error('fetchUserDataTasks error:', err);
  }
}

// --------------------------------------------------
// Initialization
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  loadTasksState();
  await fetchUserDataTasks();
  renderTasks();
});
