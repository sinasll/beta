import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07"); // Replace with your actual Project ID

const functions = new Functions(client);
const REFERRAL_FUNCTION_ID = "6804e1e20023090e16fc"; // Your real function ID

async function loadReferralInfo(userId) {
  try {
    console.log("Calling function with ID:", REFERRAL_FUNCTION_ID);

    const response = await functions.createExecution(
      REFERRAL_FUNCTION_ID,
      JSON.stringify({
        action: "get_referral_info",
        telegramId: userId,
      }),
      false, // Async = false for immediate result
      "/", // Path
      "POST", // Method
      {
        "X-Telegram-Data": window.Telegram?.WebApp?.initData || "",
        "Content-Type": "application/json",
      }
    );

    console.log("Raw function response:", response);

    let data;
    if (typeof response.response === "string") {
      try {
        data = JSON.parse(response.response);
      } catch (e) {
        throw new Error("Failed to parse function response as JSON");
      }
    } else {
      data = response.response;
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || "Unknown function error");
    }

    return data;
  } catch (error) {
    console.error("Function call error:", error);
    throw new Error(`Failed to load referral info: ${error.message}`);
  }
}

// Initialization on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) throw new Error("Please open in Telegram");

    tg.expand();

    const tgUser = tg.initDataUnsafe?.user;
    if (!tgUser?.id) throw new Error("Telegram user not found");

    const referralInfo = await loadReferralInfo(tgUser.id);

    document.getElementById("referralLink").textContent =
      `https://t.me/betamineitbot?start=${referralInfo.code}`;

    if (referralInfo.friends && Array.isArray(referralInfo.friends)) {
      displayFriendsList(referralInfo.friends);
    }
  } catch (err) {
    console.error("Initialization error:", err);
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(err.message);
    } else {
      alert(err.message);
    }
  }
});

function displayFriendsList(friends) {
  const container = document.getElementById("invitedFriendsList");
  container.innerHTML = "";

  if (!friends.length) {
    container.innerHTML = '<li class="no-friends">No invited friends yet</li>';
    return;
  }

  friends.forEach((friend) => {
    const li = document.createElement("li");
    li.className = "friend-item";
    li.innerHTML = `
      <div class="friend-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="friend-details">
        <span class="friend-name">${friend.username || "Anonymous"}</span>
        <span class="friend-date">Joined: ${new Date(friend.joined).toLocaleDateString()}</span>
      </div>
      <div class="friend-power">
        <i class="fas fa-bolt"></i> ${friend.mining_power?.toFixed(1) || "1.0"}x
      </div>
    `;
    container.appendChild(li);
  });
}
