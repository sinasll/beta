import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);

let telegramId = null;
let telegramUsername = null;
let referralLink = "";

if (Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
  const tgUser = Telegram.WebApp.initDataUnsafe.user;
  telegramId = tgUser.id.toString();
  telegramUsername = tgUser.username || null;
} else {
  alert("Please open this app via Telegram for full functionality.");
}

async function fetchReferralData() {
  if (!telegramId) return;

  try {
    const execution = await functions.createExecution("6804e1e20023090e16fc", JSON.stringify({
      telegram_id: telegramId,
      telegram_username: telegramUsername
    }));

    let response;
    try {
      response = JSON.parse(execution.response);
    } catch (e) {
      console.error("Failed to parse function response:", execution.response);
      return;
    }

    const { referral_code, total_invites, invited_friends } = response;

    referralLink = `https://t.me/betamineitbot?start=${referral_code}`;
    document.getElementById("referralLink").innerText = referralLink;

    if (total_invites !== undefined) {
      const inviteList = document.getElementById("invitedFriendsList");
      inviteList.innerHTML = invited_friends.map(friend => `<li>${friend}</li>`).join("");
    }

  } catch (err) {
    console.error("Referral fetch error:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchReferralData();

  document.getElementById("inviteButton").addEventListener("click", () => {
    if (Telegram.WebApp.platform) {
      Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join $BLACK and earn rewards with me!`);
    } else {
      alert("Telegram share only works inside Telegram.");
    }
  });

  document.getElementById("copyButton").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      alert("Referral link copied!");
    } catch (err) {
      alert("Failed to copy link.");
    }
  });
});
