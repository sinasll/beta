import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");
const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

let logicTasks = [
  { id: 'mine60',      title: 'Mine for 60 seconds',           completed: false },
  { id: 'submitCode',  title: 'Submit a referral code',        completed: false },
  { id: 'reachPower2', title: 'Reach x2 mining power',          completed: false },
  { id: 'inviteFriend',title: 'Invite a friend who opens app', completed: false },
  { id: 'earnBonus',   title: 'Claim your 0.1× bonus',         completed: false }
];

let userDataTasks = { codeSubmissionsToday:0, miningPower:1, referrals:0, hasEarnedBonus:false };

function initializeUser() {
  const tg = window.Telegram?.WebApp;
  let username, telegramId;
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    username   = u.username || `${u.first_name||''} ${u.last_name||''}`.trim();
    telegramId = String(u.id);
  } else {
    let guest = localStorage.getItem('guestUsername');
    if (!guest) {
      guest = 'guest_'+Math.random().toString(36).slice(2,7);
      localStorage.setItem('guestUsername',guest);
    }
    username   = guest;
    telegramId = guest;
  }
  const ref = new URLSearchParams(location.search).get('ref')||'';
  return { username, telegramId, referralCode:ref };
}

async function fetchUserDataTasks() {
  const payload = { ...initializeUser(), action:'mine' };
  const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
  const data = JSON.parse(exec.responseBody||'{}');
  userDataTasks.codeSubmissionsToday = data.code_submissions_today||0;
  userDataTasks.miningPower         = data.mining_power||1;
  userDataTasks.referrals           = data.total_invites||0;
  userDataTasks.hasEarnedBonus      = data.has_earned_bonus||false;

  const done = data.completed_tasks||[];
  logicTasks = logicTasks.map(t=>({
    ...t,
    completed: done.includes(t.id) || (t.id==='earnBonus'&&userDataTasks.hasEarnedBonus)
  }));
  renderTasks();
}

function renderTasks() {
  const c = document.getElementById('tasks-container');
  c.innerHTML='';
  logicTasks.forEach(t=>{
    const done = t.completed;
    const btn = t.id==='earnBonus'? 'Claim':'Complete';
    const html = `
      <span class="task-title">${t.title}</span>
      ${done
        ?'<span class="task-completed">✔ '+(t.id==='earnBonus'?'Claimed':'Completed')+'</span>'
        :`<button class="task-button" id="btn_${t.id}">${btn}</button>`
      }
    `;
    const div = document.createElement('div');
    div.className='task-item';
    div.innerHTML=html;
    c.appendChild(div);
    if (!done) document.getElementById(`btn_${t.id}`)
      .addEventListener('click',()=>completeTask(t.id));
  });
}

async function completeTask(id) {
  // pre-check
  const now=Date.now();
  switch(id){
    case 'mine60': {
      const start = parseInt(localStorage.getItem('miningSessionStart')||'0',10);
      if (!start||now-start<60000) return alert('Mine 60s first');
      break;
    }
    case 'submitCode':
      if (userDataTasks.codeSubmissionsToday<1) return alert('Submit a code first');
      break;
    case 'reachPower2':
      if (userDataTasks.miningPower<2) return alert('Reach 2× power first');
      break;
    case 'inviteFriend':
      if (userDataTasks.referrals<1) return alert('Invite a friend first');
      break;
    case 'earnBonus':
      break;
  }
  // record
  const payload = { ...initializeUser(), action:'complete_task', taskId:id };
  const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
  const data = JSON.parse(exec.responseBody||'{}');
  if (data.error) return alert(data.message);
  logicTasks = logicTasks.map(t=>t.id===id?{...t,completed:true}:t);
  renderTasks();
  alert('Task done!');
}

document.addEventListener('DOMContentLoaded',fetchUserDataTasks);
