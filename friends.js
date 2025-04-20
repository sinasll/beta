import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

let tg;
let USER_ID = null;

// Initialize Telegram WebApp and safely extract user ID
function initTelegram() {
  return new Promise((resolve) => {
    try {
      tg = window.Telegram?.WebApp;
      if (tg) {
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        USER_ID = user?.id || null;
        resolve(USER_ID);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.warn("Telegram init error:", error);
      resolve(null);
    }
  });
}

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07"); // Replace with your project ID

const functions = new Functions(client);

// Function to show alert
function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

// Fetch user via Appwrite Function
async function fetchUser() {
  try {
    if (!USER_ID) throw new Error("Telegram ID not available.");

    const execution = await functions.createExecution(
      "6804e1e20023090e16fc", // Replace with your actual function ID
      JSON.stringify({
        telegram_id: USER_ID,
        referral_code: "" // Optional: pass actual referral code if available
      })
    );

    if (!execution || !execution.$id) {
      throw new Error("Failed to create function execution");
    }

    const executionId = execution.$id;
    let statusResponse = null;
    let attempts = 0;

    while (attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait 300ms
      const check = await functions.getExecution(executionId);
      if (check.status === "completed") {
        statusResponse = check;
        break;
      }
      attempts++;
    }

    if (!statusResponse || !statusResponse.response) {
      throw new Error("Function did not complete or returned no data");
    }

    let data;
    try {
      data = JSON.parse(statusResponse.response);
    } catch (err) {
      console.error("Invalid JSON from function:", statusResponse.response);
      throw new Error("Failed to parse response");
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to fetch user data");
    }

    return data;
  } catch (error) {
    console.error("fetchUser error:", error);
    throw error;
  }
}

// Share referral link
function shareMiniApp(referralCode) {
  const shareUrl = `https://t.me/betamineitbot?start=${referralCode}`;

  if (tg?.share) {
    tg.share({
      title: "Join me in $BLACK Mining!",
      text: "Let's go to the HOLE!",
      url: shareUrl
    });
  } else if (navigator.share) {
    navigator.share({
      title: "Join me in $BLACK Mining!",
      text: "Let's go to the HOLE!",
      url: shareUrl
    }).catch(err => {
      console.error("Share failed:", err);
      copyToClipboard(shareUrl);
    });
  } else {
    copyToClipboard(shareUrl);
  }
}

// Copy to clipboard helper
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showAlert("Link copied to clipboard!");
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showAlert("Link copied to clipboard!");
    } catch (err) {
      showAlert("Failed to copy link");
    }
    document.body.removeChild(textarea);
  });
}

// Load user & friends list
async function loadFriends() {
  try {
    const response = await fetchUser();

    if (!response.success || !response.user) {
      throw new Error("Failed to load user data");
    }

    const user = response.user;

    if (!user.referral_code) {
      throw new Error("User data is incomplete");
    }

    const link = `https://t.me/betamineitbot?start=${user.referral_code}`;
    document.getElementById("referralLink").textContent = link;

    document.getElementById("inviteButton").addEventListener("click", () => {
      shareMiniApp(user.referral_code);
    });

    document.getElementById("copyButton").addEventListener("click", () => {
      copyToClipboard(link);
    });

    const ul = document.getElementById("invitedFriendsList");
    ul.innerHTML = "";

    if (!user.invited_friends || user.invited_friends.length === 0) {
      ul.innerHTML = "<li>No invited friends yet.</li>";
      return;
    }

    user.invited_friends.forEach(friendId => {
      const li = document.createElement("li");
      li.textContent = `Friend ID: ${friendId}`;
      ul.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading friends", error);
    document.getElementById("invitedFriendsList").innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

// Initialize app on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  await initTelegram();
  if (!USER_ID) {
    document.getElementById("invitedFriendsList").innerHTML = `<li>Error: Telegram ID not found. Please open in Telegram app.</li>`;
    return;
  }
  loadFriends();
});
