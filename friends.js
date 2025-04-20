import { Client, Databases, Query } from "https://esm.sh/appwrite@13.0.0";
import Telegram from 'telegram-webapp';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6800cf6c0038c2026f07');

const telegram = new Telegram.WebApp();
telegram.ready();

let userData = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize with Telegram user data
        const initData = telegram.initData;
        const tgUser = initData.user ? JSON.parse(initData.user) : null;
        
        if (!tgUser) {
            window.location.href = 'https://t.me/betamineitbot';
            return;
        }

        // Get referral info
        const response = await fetch('/function/referralFunction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Data': JSON.stringify(initData)
            },
            body: JSON.stringify({ action: 'get_referral_info' })
        });
        
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        // Display referral info
        const referralLink = `https://t.me/betamineitbot?start=${data.code}`;
        document.getElementById('referralLink').textContent = referralLink;
        
        // Invite button handler
        document.getElementById('inviteButton').addEventListener('click', () => {
            telegram.showAlert(`Share your referral link: ${referralLink}`);
            telegram.shareText(referralLink);
        });
        
        // Copy button handler
        document.getElementById('copyButton').addEventListener('click', async () => {
            await navigator.clipboard.writeText(referralLink);
            telegram.showAlert('Link copied to clipboard!');
        });
        
        // Load invited friends
        const friendsResponse = await fetch('/function/referralFunction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Data': JSON.stringify(initData)
            },
            body: JSON.stringify({ action: 'get_invited_friends' })
        });
        
        const friendsData = await friendsResponse.json();
        const friendsList = document.getElementById('invitedFriendsList');
        
        if (friendsData.friends.length > 0) {
            friendsData.friends.forEach(friend => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="friend-item">
                        <span>${friend.username}</span>
                        <span>Joined: ${new Date(friend.joined).toLocaleDateString()}</span>
                    </div>
                `;
                friendsList.appendChild(li);
            });
        } else {
            friendsList.innerHTML = '<li>No invited friends yet</li>';
        }
        
    } catch (error) {
        console.error('Error:', error);
        telegram.showAlert(`Error: ${error.message}`);
    }
});

// Handle referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
    applyReferralCode(refCode);
}

async function applyReferralCode(code) {
    try {
        const initData = telegram.initData;
        const response = await fetch('/function/referralFunction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Data': JSON.stringify(initData)
            },
            body: JSON.stringify({ 
                action: 'apply_referral',
                code: code 
            })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        telegram.showAlert(`Referral applied! Mining power increased by ${REFERRAL_REWARD}`);
    } catch (error) {
        telegram.showAlert(`Referral error: ${error.message}`);
    }
}