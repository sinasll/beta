

document.addEventListener('DOMContentLoaded', async () => {
  try {
      // Initialize Appwrite client
      const client = new Appwrite.Client();
      client
          .setEndpoint('https://fra.cloud.appwrite.io/v1')
          .setProject('6800cf6c0038c2026f07');

      // Check if Telegram WebApp is available
      if (window.Telegram && window.Telegram.WebApp) {
          const tgWebApp = window.Telegram.WebApp;
          tgWebApp.expand(); // Expand the web app to full height
          
          // Get Telegram init data
          const initData = tgWebApp.initData || '';
          const initDataUnsafe = tgWebApp.initDataUnsafe || {};
          const tgUser = initDataUnsafe.user;
          
          if (!tgUser) {
              window.location.href = 'https://t.me/betamineitbot';
              return;
          }

          // Get referral info
          const referralInfo = await getReferralInfo(tgUser.id, initData);
          displayReferralInfo(referralInfo);

          // Load invited friends
          const friendsData = await getInvitedFriends(tgUser.id, initData);
          displayFriendsList(friendsData);

          // Handle buttons
          setupButtonHandlers(referralInfo.code, tgWebApp);

          // Check for referral code in URL
          checkUrlForReferral(tgUser.id, initData, tgWebApp);
      } else {
          console.error('Telegram WebApp not detected');
          // Fallback for non-Telegram browsers (optional)
      }
  } catch (error) {
      console.error('Error:', error);
      if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
      } else {
          alert(`Error: ${error.message}`);
      }
  }
});

// Helper functions
async function getReferralInfo(userId, initData) {
  const response = await fetch('/function/referralFunction', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Data': initData
      },
      body: JSON.stringify({ action: 'get_referral_info' })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function getInvitedFriends(userId, initData) {
  const response = await fetch('/function/referralFunction', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Data': initData
      },
      body: JSON.stringify({ action: 'get_invited_friends' })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

function displayReferralInfo(info) {
  const referralLink = `https://t.me/betamineitbot?start=${info.code}`;
  document.getElementById('referralLink').textContent = referralLink;
}

function displayFriendsList(friendsData) {
  const friendsList = document.getElementById('invitedFriendsList');
  friendsList.innerHTML = ''; // Clear existing list

  if (friendsData.friends && friendsData.friends.length > 0) {
      friendsData.friends.forEach(friend => {
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
                  <i class="fas fa-bolt"></i> ${friend.mining_power || 1.0}x
              </div>
          `;
          friendsList.appendChild(li);
      });
  } else {
      friendsList.innerHTML = '<li class="no-friends">No invited friends yet</li>';
  }
}

function setupButtonHandlers(referralCode, tgWebApp) {
  // Invite button
  document.getElementById('inviteButton').addEventListener('click', () => {
      const referralLink = `https://t.me/betamineitbot?start=${referralCode}`;
      if (tgWebApp) {
          tgWebApp.showAlert(`Share your referral link: ${referralLink}`);
          if (tgWebApp.shareText) {
              tgWebApp.shareText(referralLink);
          }
      } else {
          // Fallback for non-Telegram browsers
          navigator.clipboard.writeText(referralLink)
              .then(() => alert('Link copied to clipboard!'));
      }
  });

  // Copy button
  document.getElementById('copyButton').addEventListener('click', async () => {
      const referralLink = `https://t.me/betamineitbot?start=${referralCode}`;
      try {
          await navigator.clipboard.writeText(referralLink);
          if (tgWebApp) {
              tgWebApp.showAlert('Link copied to clipboard!');
          } else {
              alert('Link copied to clipboard!');
          }
      } catch (err) {
          console.error('Failed to copy:', err);
      }
  });
}

function checkUrlForReferral(userId, initData, tgWebApp) {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
      applyReferralCode(userId, refCode, initData, tgWebApp);
  }
}

async function applyReferralCode(userId, code, initData, tgWebApp) {
  try {
      const response = await fetch('/function/referralFunction', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-Telegram-Data': initData
          },
          body: JSON.stringify({ 
              action: 'apply_referral',
              code: code 
          })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      if (tgWebApp) {
          tgWebApp.showAlert(`Referral applied! Mining power increased by 0.5x`);
      }
  } catch (error) {
      console.error('Referral error:', error);
      if (tgWebApp) {
          tgWebApp.showAlert(`Referral error: ${error.message}`);
      }
  }
}