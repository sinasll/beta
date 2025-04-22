import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6800cf6c0038c2026f07');

const databases = new Databases(client);

// DOM elements
const usernameElement = document.getElementById('username');
const submissionCountElement = document.getElementById('submissionCount');
const submissionProgressElement = document.getElementById('submissionProgress');
const milestoneButton = document.getElementById('milestoneButton');
const dailyButton = document.getElementById('dailyButton');
const twitterButton = document.getElementById('twitterButton');

// Telegram WebApp initialization
let tg = window.Telegram.WebApp;
let telegramId = tg.initDataUnsafe?.user?.id || '';

// User data
let userData = null;
let milestoneClaimed = false;

// Initialize the app
async function initApp() {
  if (!telegramId) {
    console.log('No Telegram ID found');
    return;
  }

  try {
    // Get user data
    const response = await databases.listDocuments(
      '6800de0c0035c758bb6f',
      '6800df4e002aadae499f',
      [Query.equal('telegram_id', telegramId)]
    );

    if (response.total > 0) {
      userData = response.documents[0];
      updateUI();
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Update UI with user data
function updateUI() {
  if (!userData) return;

  // Set username
  if (userData.username) {
    usernameElement.textContent = userData.username;
  }

  // Update submission milestone
  const submissions = userData.total_code_submissions || 0;
  submissionCountElement.textContent = submissions;
  
  // Calculate progress
  const progress = Math.min((submissions / 100) * 100, 100);
  submissionProgressElement.style.width = `${progress}%`;
  
  // Enable/disable milestone button
  milestoneClaimed = submissions < 100;
  milestoneButton.disabled = milestoneClaimed;
  milestoneButton.textContent = milestoneClaimed ? 'In Progress' : 'Claim Reward';
}

// Claim milestone reward
async function claimMilestoneReward() {
  if (!userData || milestoneClaimed) return;

  try {
    // Update user balance
    const updatedUser = await databases.updateDocument(
      '6800de0c0035c758bb6f',
      '6800df4e002aadae499f',
      userData.$id,
      {
        balance: userData.balance + 5,
        total_code_submissions: 0 // Reset counter after claiming
      }
    );

    // Update local data
    userData = updatedUser;
    milestoneClaimed = true;
    updateUI();

    // Show success message
    tg.showAlert('Congratulations! You earned 5 $BLACK for reaching 100 code submissions!');
  } catch (error) {
    console.error('Error claiming milestone:', error);
    tg.showAlert('Failed to claim reward. Please try again.');
  }
}

// Event listeners
milestoneButton.addEventListener('click', claimMilestoneReward);
dailyButton.addEventListener('click', () => tg.showAlert('Daily bonus claimed!'));
twitterButton.addEventListener('click', () => {
  window.open('https://twitter.com/blacktg', '_blank');
  tg.showAlert('Followed on X! Claim your reward.');
});

// Initialize the app when Telegram is ready
if (window.Telegram && window.Telegram.WebApp) {
  tg.ready();
  tg.expand();
  initApp();
} else {
  // For testing outside Telegram
  console.log('Running outside Telegram');
  initApp();
}