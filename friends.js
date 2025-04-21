import { Client, Functions } from 'https://esm.sh/appwrite@13.0.0';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Appwrite client & Functions
  const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6800cf6c0038c2026f07');

  const functions = new Functions(client);

  // Telegram WebApp init
  const tg = window.Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe.user;
  const telegramId = user.id.toString();

  // 1. Parse referral code from URL and record invite
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('ref');
  if (refParam) {
    await functions.createExecution('6804e1e20023090e16fc', JSON.stringify({
      action:       'recordInvite',
      telegramId,
      referralCode: refParam
    }));
  }

  // 2. Fetch this user’s referral data
  const exec1 = await functions.createExecution('6804e1e20023090e16fc', JSON.stringify({
    action:     'getReferral',
    telegramId
  }));
  const { referralCode, referralLink, totalInvites, invitedBy } = JSON.parse(exec1.response);

  // Update UI with total invites & inviter
  document.getElementById('totalInvites').textContent = totalInvites;
  if (invitedBy) {
    document.getElementById('invitedBy').textContent = `You were invited by: ${invitedBy}`;
  }

  // 3. Render referral link + buttons
  const linkContainer = document.createElement('div');
  linkContainer.innerHTML = `
    <div class="referral-container">
      <input type="text" id="refLinkInput" readonly value="${referralLink}" />
      <button id="copyBtn">Copy</button>
      <a id="shareBtn" href="https://t.me/share/url?url=${encodeURIComponent(referralLink)}" target="_blank">
        Share on Telegram
      </a>
    </div>
  `;
  document
    .getElementById('invitedFriendsList')
    .parentNode
    .insertBefore(linkContainer, document.getElementById('invitedFriendsList'));

  document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  });

  // 4. Fetch and render list of friends this user has invited
  const exec2 = await functions.createExecution('6804e1e20023090e16fc', JSON.stringify({
    action:     'getInvitedFriends',
    telegramId
  }));
  const { friends } = JSON.parse(exec2.response);

  const listEl = document.getElementById('invitedFriendsList');
  friends.forEach(fr => {
    const li = document.createElement('li');
    li.textContent = fr.username
      ? `${fr.username} (${fr.telegramId})`
      : fr.telegramId;
    listEl.appendChild(li);
  });
});
