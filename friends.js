import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6800cf6c0038c2026f07');

const functions = new Functions(client);

// Use your actual function ID here
const REFERRAL_FUNCTION_ID = '6804e1e20023090e16fc';

async function loadReferralInfo(userId) {
  try {
    console.log('Calling function with ID:', REFERRAL_FUNCTION_ID);
    
    const response = await functions.createExecution(
      REFERRAL_FUNCTION_ID, // Using your specific function ID
      JSON.stringify({
        action: 'get_referral_info',
        telegramId: userId
      }),
      false, // async execution
      '/', // path
      'POST', // method
      {
        'X-Telegram-Data': window.Telegram?.WebApp?.initData || '',
        'Content-Type': 'application/json'
      }
    );

    console.log('Raw response:', response);

    // Handle different response formats
    let data;
    if (typeof response.response === 'string') {
      try {
        data = JSON.parse(response.response);
      } catch (e) {
        throw new Error('Failed to parse function response');
      }
    } else {
      data = response.response;
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Unknown function error');
    }

    return data;
  } catch (error) {
    console.error('Function call error:', error);
    throw new Error(`Failed to load referral info: ${error.message}`);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verify Telegram WebApp is available
    if (!window.Telegram?.WebApp) {
      throw new Error('Please open in Telegram');
    }

    const tgWebApp = window.Telegram.WebApp;
    tgWebApp.expand(); // Expand the web app
    
    const tgUser = tgWebApp.initDataUnsafe?.user;
    if (!tgUser?.id) {
      throw new Error('Telegram user not found');
    }

    // Load and display referral info
    const referralInfo = await loadReferralInfo(tgUser.id);
    document.getElementById('referralLink').textContent = 
      `https://t.me/betamineitbot?start=${referralInfo.code}`;
    
    // Load friends list if available
    if (referralInfo.friends) {
      displayFriendsList(referralInfo.friends);
    }

  } catch (error) {
    console.error('Initialization error:', error);
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(error.message);
    } else {
      alert(error.message);
    }
  }
});

function displayFriendsList(friends) {
  const container = document.getElementById('invitedFriendsList');
  container.innerHTML = '';

  if (friends.length === 0) {
    container.innerHTML = '<li class="no-friends">No invited friends yet</li>';
    return;
  }

  friends.forEach(friend => {
    const li = document.createElement('li');
    li.className = 'friend-item';
    li.innerHTML = `
      <div class="friend-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="friend-details">
        <span class="friend-name">${friend.username || 'Anonymous'}</span>
        <span class="friend-date">Joined: ${new Date(friend.joined).toLocaleDateString()}</span>
      </div>
      <div class="friend-power">
        <i class="fas fa-bolt"></i> ${friend.mining_power?.toFixed(1) || '1.0'}x
      </div>
    `;
    container.appendChild(li);
  });
}