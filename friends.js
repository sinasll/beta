import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

let tg;
let USER_ID = "default-user-id"; // Fallback

try {
  tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    USER_ID = tg.initDataUnsafe?.user?.id || USER_ID;
  }
} catch (error) {
  console.warn("Telegram WebApp not available:", error);
}

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);

function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showAlert("Link copied to clipboard!");
  }).catch(() => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showAlert("Link copied to clipboard!");
    } catch {
      showAlert("Failed to copy link");
    }
    document.body.removeChild(textarea);
  });
}

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
    }).catch(() => {
      copyToClipboard(shareUrl);
    });
  } else {
    copyToClipboard(shareUrl);
  }
}

async function fetchUser() {
  try {
    const response = await functions.createExecution(
      "6804e1e20023090e16fc",
      JSON.stringify({
        telegram_id: USER_ID,
        referral_code: "optional-referral-code"
      })
    );

    console.log("Raw Appwrite function response:", response);

    let data;
    if (typeof response === 'string') {
      data = JSON.parse(response);
    } else if (response.response) {
      data = typeof response.response === 'string' 
        ? JSON.parse(response.response)
        : response.response;
    } else {
      data = response;
    }

    console.log("Parsed Appwrite Function Response:", data);

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to fetch user data");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user data", error);
    showAlert("Failed to load user data");
    throw error;
  }
}

async function loadFriends() {
  try {
    const response = await fetchUser();

    const user = response.user;

    if (!user?.referral_code) {
      throw new Error("Referral code missing");
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
    const ul = document.getElementById("invitedFriendsList");
    ul.innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFriends);
