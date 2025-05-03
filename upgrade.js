document.getElementById('buyUpgradeButton').addEventListener('click', async () => {
    const tgId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
    if (!tgId) {
      alert("Telegram ID missing.");
      return;
    }
  
    const button = document.getElementById('buyUpgradeButton');
    button.disabled = true;
    button.innerText = "Processing...";
  
    try {
      const response = await fetch("http://680e403dcabf3d90bb9c.fra.appwrite.run/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: tgId }),
      });
  
      const result = await response.json();
      if (result.success) {
        document.getElementById("power").innerText = result.mining_power.toFixed(1);
        document.getElementById("upgradeStatus").innerText = "Purchased ✅";
        alert("Upgrade successful!");
      } else {
        alert(result.message);
        button.disabled = false;
        button.innerText = "Buy for 100 Stars";
      }
    } catch (e) {
      console.error(e);
      alert("Error buying upgrade.");
      button.disabled = false;
      button.innerText = "Buy for 100 Stars";
    }
  });
  