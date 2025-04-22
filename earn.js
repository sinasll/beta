import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "68062657001a181032e7";

// Constants (add these at the top)
const CODE_SUBMISSION_REWARD_THRESHOLD = 100;
const CODE_SUBMISSION_REWARD_AMOUNT = 5;

// Elements
const usernameEl = document.getElementById('username');
const dailyButton = document.getElementById('dailyButton');
const twitterButton = document.getElementById('twitterButton');

// State
let userData = {
  username: '',
  telegramId: '',
  tasks: {
    code_reward: {
      completed: false,
      claimed: false,
      progress: 0,
      required: CODE_SUBMISSION_REWARD_THRESHOLD,
      reward: `${CODE_SUBMISSION_REWARD_AMOUNT} $BLACK`
    },
    daily_bonus: {
      completed: true,
      claimed: false,
      reward: '+0.1x mining power'
    },
    twitter_follow: {
      completed: true,
      claimed: false,
      reward: '+0.1x mining power'
    }
  }
};

// Initialize user data
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    return {
      username: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      telegramId: user.id.toString()
    };
  }
  
  let username = localStorage.getItem('guestUsername');
  if (!username) {
    username = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestUsername', username);
  }
  
  return {
    username,
    telegramId: ''
  };
}

async function fetchTasksStatus() {
  try {
    const payload = {
      ...initializeUser(),
      action: 'get_tasks_status'
    };
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error) {
      console.error('Backend error:', data.message);
      return;
    }
    
    userData.tasks = data.tasks;
    updateUI();
  } catch (err) {
    console.error('Failed to fetch tasks status:', err);
  }
}

async function claimDailyBonus() {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_daily_bonus'
    };
    
    dailyButton.disabled = true;
    dailyButton.textContent = 'Processing...';
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      showTemporaryMessage(dailyButton, data.message, 2000);
      await fetchTasksStatus();
    } else {
      showTemporaryMessage(dailyButton, data.message || 'Failed', 2000);
    }
  } catch (err) {
    console.error('Claim failed:', err);
    showTemporaryMessage(dailyButton, 'Error!', 2000);
  }
}

async function followTwitter() {
  try {
    const payload = {
      ...initializeUser(),
      action: 'follow_twitter'
    };
    
    twitterButton.disabled = true;
    twitterButton.textContent = 'Processing...';
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      showTemporaryMessage(twitterButton, data.message, 2000);
      await fetchTasksStatus();
    } else {
      showTemporaryMessage(twitterButton, data.message || 'Failed', 2000);
    }
  } catch (err) {
    console.error('Twitter follow failed:', err);
    showTemporaryMessage(twitterButton, 'Error!', 2000);
  }
}

function showTemporaryMessage(element, message, duration) {
  const originalText = element.textContent;
  element.textContent = message;
  element.disabled = true;
  
  setTimeout(() => {
    element.textContent = originalText;
    element.disabled = false;
    updateUI();
  }, duration);
}

function updateUI() {
  const user = initializeUser();
  usernameEl.textContent = user.username;
  
  // Update daily bonus button
  if (userData.tasks.daily_bonus.claimed) {
    dailyButton.textContent = 'Claimed';
    dailyButton.disabled = true;
  } else {
    dailyButton.textContent = 'Claim Daily Bonus';
    dailyButton.disabled = false;
  }
  
  // Update Twitter follow button
  if (userData.tasks.twitter_follow.claimed) {
    twitterButton.textContent = 'Followed';
    twitterButton.disabled = true;
  } else {
    twitterButton.textContent = 'Follow';
    twitterButton.disabled = false;
  }
  
  // Add code submission task dynamically
  const tasksContainer = document.querySelector('.card');
  const existingCodeTask = document.getElementById('codeSubmissionTask');
  
  if (!existingCodeTask) {
    const codeTaskHTML = `
      <div class="task" id="codeSubmissionTask">
        <div class="task-content">
          <div class="task-info">
            <div class="task-details">
              <div class="task-name">Code Submissions</div>
              <div class="task-desc">Get ${CODE_SUBMISSION_REWARD_THRESHOLD} total code submissions</div>
              <div class="task-progress">${userData.tasks.code_reward.progress}/${CODE_SUBMISSION_REWARD_THRESHOLD}</div>
            </div>
          </div>
          <div class="task-reward">${CODE_SUBMISSION_REWARD_AMOUNT} $BLACK</div>
        </div>
        <button class="task-button" id="codeRewardButton" 
          ${userData.tasks.code_reward.completed && !userData.tasks.code_reward.claimed ? '' : 'disabled'}>
          ${userData.tasks.code_reward.claimed ? 'Claimed' : 
           userData.tasks.code_reward.completed ? 'Claim' : 'Incomplete'}
        </button>
      </div>
    `;
    
    tasksContainer.insertAdjacentHTML('afterbegin', codeTaskHTML);
    
    // Add event listener for the new button
    document.getElementById('codeRewardButton')?.addEventListener('click', claimCodeReward);
  } else {
    const progressEl = existingCodeTask.querySelector('.task-progress');
    const buttonEl = existingCodeTask.querySelector('.task-button');
    
    if (progressEl) {
      progressEl.textContent = `${userData.tasks.code_reward.progress}/${CODE_SUBMISSION_REWARD_THRESHOLD}`;
    }
    
    if (buttonEl) {
      buttonEl.disabled = !(userData.tasks.code_reward.completed && !userData.tasks.code_reward.claimed);
      buttonEl.textContent = userData.tasks.code_reward.claimed ? 'Claimed' : 
                            userData.tasks.code_reward.completed ? 'Claim' : 'Incomplete';
    }
  }
}

async function claimCodeReward() {
  try {
    const payload = {
      ...initializeUser(),
      action: 'claim_code_reward'
    };
    
    const button = document.getElementById('codeRewardButton');
    button.disabled = true;
    button.textContent = 'Processing...';
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      showTemporaryMessage(button, data.message, 2000);
      await fetchTasksStatus();
    } else {
      showTemporaryMessage(button, data.message || 'Failed', 2000);
    }
  } catch (err) {
    console.error('Claim failed:', err);
    const button = document.getElementById('codeRewardButton');
    showTemporaryMessage(button, 'Error!', 2000);
  }
}

// Event Listeners
dailyButton.addEventListener('click', claimDailyBonus);
twitterButton.addEventListener('click', followTwitter);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
  }

  updateUI();
  await fetchTasksStatus();
});