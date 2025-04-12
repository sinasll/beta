// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAzXSCn_QL2XeyRZD71By443sl4wOtXf2Y",
    authDomain: "pipcore-8844f.firebaseapp.com",
    projectId: "pipcore-8844f",
    storageBucket: "pipcore-8844f.appspot.com",
    messagingSenderId: "921115337984",
    appId: "1:921115337984:web:17161651342ad78017bfe5"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  // DOM Elements
  const elements = {
    username: document.getElementById('username'),
    balance: document.getElementById('balance'),
    mined: document.getElementById('mined'),
    totalminers: document.getElementById('totalminers'),
    activeminers: document.getElementById('activeminers'),
    power: document.getElementById('power'),
    submissionCount: document.getElementById('submissionCount'),
    dailyCode: document.getElementById('dailyCode'),
    mineButton: document.getElementById('mineButton'),
    submitCodeButton: document.getElementById('submitCodeButton'),
    submitCodeInput: document.getElementById('submitCodeInput'),
    copyCodeButton: document.getElementById('copyCodeButton'),
    upgradeButton: document.getElementById('upgradeButton'),
    countdown: document.getElementById('countdown')
  };
  
  // Global Variables
  let currentUserRef = null;
  let userData = null;
  let miningInterval = null;
  const baseMiningRate = 0.003472; // ~5 tokens per day at 1x power
  const globalStatsRef = db.collection('stats').doc('global');
  let activeMinersSet = new Set(); // Track active miners
  
  // Utility Functions
  function generateDailyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  function generateUniqueUsername() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `blackminer${randomNum}`;
  }
  
  async function getUniqueUsername() {
    let username = generateUniqueUsername();
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 5) {
      const query = await db.collection('users').where('username', '==', username).limit(1).get();
      exists = !query.empty;
      if (exists) {
        username = generateUniqueUsername();
        attempts++;
      }
    }
    
    return username;
  }
  
  function getTimestamp(timestamp) {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  }
  
  function isWithin24Hours(timestamp) {
    const date = getTimestamp(timestamp);
    return Date.now() - date.getTime() < 24 * 60 * 60 * 1000;
  }
  
  function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Initialize Global Stats
  async function initializeGlobalStats() {
    const doc = await globalStatsRef.get();
    if (!doc.exists) {
      await globalStatsRef.set({
        totalSupply: 0,
        totalMiners: 0,
        activeMiners: 0,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  
  // Stats Management
  async function updateStats(activeChange = 0, minedChange = 0, minerChange = 0) {
    try {
      const updates = {};
      if (minedChange !== 0) updates.totalSupply = firebase.firestore.FieldValue.increment(minedChange);
      if (minerChange !== 0) updates.totalMiners = firebase.firestore.FieldValue.increment(minerChange);
      
      if (activeChange !== 0) {
        updates.activeMiners = firebase.firestore.FieldValue.increment(activeChange);
      }
      
      if (Object.keys(updates).length > 0) {
        await globalStatsRef.update(updates);
      }
    } catch (error) {
      console.error("Error updating stats:", error);
      if (error.code === 'not-found') {
        await initializeGlobalStats();
        await updateStats(activeChange, minedChange, minerChange);
      }
    }
  }
  
  // Mining Functions
  function calculateEarnings() {
    if (!userData?.mining) return 0;
    const now = Date.now();
    const lastUpdate = getTimestamp(userData.lastMiningUpdate).getTime();
    const elapsed = (now - lastUpdate) / 1000;
    const effectivePower = userData.miningPower + 
                          (userData.hasSubmittedToday ? 0.5 : 0) + 
                          (userData.submissionsReceived || 0) * 0.1;
    return (baseMiningRate * effectivePower * elapsed) / 60;
  }
  
  async function startMining() {
    if (miningInterval) clearInterval(miningInterval);
    
    elements.mineButton.textContent = "Mining...";
    
    // Process any pending earnings
    const pendingEarnings = calculateEarnings();
    if (pendingEarnings > 0) {
      await currentUserRef.update({
        balance: firebase.firestore.FieldValue.increment(pendingEarnings),
        lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
      });
      await updateStats(0, pendingEarnings);
    }
    
    // Add to active miners set and update stats if not already active
    if (!activeMinersSet.has(currentUserRef.id)) {
      activeMinersSet.add(currentUserRef.id);
      await updateStats(1);
    }
    
    // Start new interval
    miningInterval = setInterval(async () => {
      const earned = calculateEarnings();
      if (earned > 0) {
        try {
          await currentUserRef.update({
            balance: firebase.firestore.FieldValue.increment(earned),
            lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
          });
          await updateStats(0, earned);
        } catch (error) {
          console.error("Mining error:", error);
        }
      }
    }, 1000);
  }
  
  async function stopMining() {
    if (miningInterval) {
      clearInterval(miningInterval);
      miningInterval = null;
      elements.mineButton.textContent = "Start Mining";
      
      // Remove from active miners set and update stats if was active
      if (activeMinersSet.has(currentUserRef.id)) {
        activeMinersSet.delete(currentUserRef.id);
        await updateStats(-1);
      }
      
      // Process any pending earnings
      const pendingEarnings = calculateEarnings();
      if (pendingEarnings > 0) {
        await currentUserRef.update({
          balance: firebase.firestore.FieldValue.increment(pendingEarnings),
          lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        await updateStats(0, pendingEarnings);
      }
    }
  }
  
  // User Management
  async function initializeUser(user) {
    // Use Telegram username if available, otherwise generate unique username
    const telegramUsername = Telegram?.WebApp?.initDataUnsafe?.user?.username;
    const docId = telegramUsername ? `user_${telegramUsername}` : user.uid;
    currentUserRef = db.collection('users').doc(docId);
    
    const doc = await currentUserRef.get();
    if (!doc.exists) {
      // New user setup
      const username = telegramUsername ? telegramUsername : await getUniqueUsername();
      const initialData = {
        username: username,
        balance: 0,
        miningPower: 1.0,
        dailyCode: generateDailyCode(),
        codeTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        submissionsReceived: 0,
        hasSubmittedToday: false,
        mining: false,
        lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await currentUserRef.set(initialData);
      await updateStats(0, 0, 1);
      userData = initialData;
      updateUI();
    } else {
      userData = doc.data();
      
      // Daily reset logic
      if (!userData.codeTimestamp || !isWithin24Hours(userData.codeTimestamp)) {
        await currentUserRef.update({
          dailyCode: generateDailyCode(),
          codeTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
          submissionsReceived: 0,
          hasSubmittedToday: false
        });
      }
      
      updateUI();
      
      // Start mining if active
      if (userData.mining) {
        await startMining();
      }
    }
    
    // Setup real-time listener for user data
    currentUserRef.onSnapshot((doc) => {
      const newData = doc.data();
      const wasMining = userData?.mining;
      userData = newData;
      
      // Handle mining state changes
      if (wasMining !== newData.mining) {
        if (newData.mining) {
          startMining();
        } else {
          stopMining();
        }
      }
      
      updateUI();
    });
  }
  
  // Code Submission
  async function submitCode(code) {
    try {
      // Validate input
      if (!code.match(/^[A-Za-z0-9!@#$%^&*()]{12}$/)) {
        alert("Please enter a valid 12-character code with letters, numbers, and symbols");
        return;
      }
      
      if (userData.hasSubmittedToday) {
        alert("You've already submitted a code today");
        return;
      }
      
      if (code === userData.dailyCode) {
        alert("You can't submit your own code");
        return;
      }
      
      // Find code owner
      const querySnapshot = await db.collection('users')
        .where('dailyCode', '==', code)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) {
        alert("Invalid code - not found in system");
        return;
      }
      
      const codeOwnerDoc = querySnapshot.docs[0];
      const codeOwnerRef = codeOwnerDoc.ref;
      const codeOwnerData = codeOwnerDoc.data();
      
      // Validate code
      if (!codeOwnerData.codeTimestamp || !isWithin24Hours(codeOwnerData.codeTimestamp)) {
        alert("This code has expired (older than 24 hours)");
        return;
      }
      
      if (codeOwnerData.submissionsReceived >= 10) {
        alert("This code has reached its maximum submissions (10)");
        return;
      }
      
      // Create batch for atomic updates
      const batch = db.batch();
      
      // Update code owner
      batch.update(codeOwnerRef, {
        submissionsReceived: firebase.firestore.FieldValue.increment(1)
      });
      
      // Update current user
      batch.update(currentUserRef, {
        hasSubmittedToday: true,
        miningPower: firebase.firestore.FieldValue.increment(0.5)
      });
      
      // Update global stats with bonus
      batch.update(globalStatsRef, {
        totalSupply: firebase.firestore.FieldValue.increment(50)
      });
      
      // Commit the batch
      await batch.commit();
      
      alert("Code submitted successfully! You received +0.5x mining power");
      elements.submitCodeInput.value = '';
    } catch (error) {
      console.error("Error submitting code:", error);
      alert("An error occurred while submitting the code");
    }
  }
  
  // Transfer tokens to CEO (@pipcoretg)
  async function transferToCEO(amount) {
    try {
      // First get the CEO's user reference
      const ceoQuery = await db.collection('users').where('username', '==', 'pipcoretg').limit(1).get();
      
      if (ceoQuery.empty) {
        console.error("CEO account not found");
        return false;
      }
      
      const ceoRef = ceoQuery.docs[0].ref;
      
      // Create a batch for atomic transactions
      const batch = db.batch();
      
      // Deduct from user
      batch.update(currentUserRef, {
        balance: firebase.firestore.FieldValue.increment(-amount)
      });
      
      // Add to CEO
      batch.update(ceoRef, {
        balance: firebase.firestore.FieldValue.increment(amount)
      });
      
      // Commit the transaction
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Transfer to CEO failed:", error);
      return false;
    }
  }
  
  // Handle power upgrades
  async function handlePowerUpgrade(powerIncrease, price) {
    // Calculate new power (base + increase)
    const newPower = userData.miningPower + powerIncrease;
    
    if (userData.balance < price) {
      alert(`You need ${price} $BLACK to purchase this upgrade`);
      return false;
    }
    
    try {
      // First transfer tokens to CEO
      const transferSuccess = await transferToCEO(price);
      
      if (!transferSuccess) {
        throw new Error("Failed to transfer tokens to CEO");
      }
      
      // Then apply the upgrade
      await currentUserRef.update({
        miningPower: newPower
      });
      
      alert(`Upgrade successful! ${price} $BLACK sent to @pipcoretg\nYour new mining power: ${newPower.toFixed(1)}x`);
      return true;
    } catch (error) {
      console.error("Upgrade failed:", error);
      alert("Upgrade failed. Please try again.");
      return false;
    }
  }
  
  // UI Functions
  function updateUI() {
    if (!userData) return;
    
    // Update user stats
    elements.balance.textContent = userData.balance.toFixed(3);
    elements.username.textContent = userData.username;
    elements.dailyCode.textContent = userData.dailyCode;
    elements.submissionCount.textContent = userData.submissionsReceived || 0;
    
    // Calculate effective power
    const effectivePower = userData.miningPower + 
                          (userData.hasSubmittedToday ? 0.5 : 0) + 
                          (userData.submissionsReceived || 0) * 0.1;
    elements.power.textContent = effectivePower.toFixed(1);
    
    // Update mining button
    elements.mineButton.textContent = userData.mining ? "Mining..." : "Start Mining";
    
    // Update countdown timer
    updateCountdown();
  }
  
  function updateCountdown() {
    if (!userData?.codeTimestamp) {
      elements.countdown.textContent = "Daily reset in --:--:--";
      return;
    }
    
    try {
      const resetTime = getTimestamp(userData.codeTimestamp).getTime() + 24 * 60 * 60 * 1000;
      const remaining = resetTime - Date.now();
      elements.countdown.textContent = remaining > 0 
        ? `Daily reset in ${formatTime(remaining)}` 
        : "Daily reset pending...";
    } catch (error) {
      console.error("Countdown error:", error);
      elements.countdown.textContent = "Daily reset in --:--:--";
    }
  }
  
  // Event Listeners
  function setupEventListeners() {
    // Mining button
    elements.mineButton.addEventListener('click', async () => {
      if (!currentUserRef) return;
      
      try {
        await currentUserRef.update({
          mining: !userData.mining,
          lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error("Error toggling mining:", error);
      }
    });
  
    // Code submission
    elements.submitCodeButton.addEventListener('click', () => {
      const code = elements.submitCodeInput.value.trim();
      submitCode(code);
    });
  
    // Copy code button
    elements.copyCodeButton.addEventListener('click', () => {
      navigator.clipboard.writeText(userData.dailyCode)
        .then(() => alert('Daily code copied to clipboard!'))
        .catch(() => alert('Failed to copy code'));
    });
  
    // Upgrade button
    elements.upgradeButton.addEventListener('click', () => {
      document.getElementById('upgradeModal').style.display = 'flex';
    });
  
    // Close modal button
    document.getElementById('closeModal').addEventListener('click', () => {
      document.getElementById('upgradeModal').style.display = 'none';
    });
  
    // Power upgrade buttons
    document.querySelectorAll('.power-buy').forEach(button => {
      button.addEventListener('click', async (e) => {
        const powerIncrease = parseFloat(e.target.dataset.power);
        const price = parseInt(e.target.dataset.price);
        
        const success = await handlePowerUpgrade(powerIncrease, price);
        if (success) {
          document.getElementById('upgradeModal').style.display = 'none';
        }
      });
    });
  }
  
  // Global Stats Listener
  function setupStatsListener() {
    globalStatsRef.onSnapshot((doc) => {
      const stats = doc.data();
      if (stats) {
        elements.mined.textContent = (stats.totalSupply || 0).toFixed(2);
        elements.totalminers.textContent = stats.totalMiners || 0;
        elements.activeminers.textContent = stats.activeMiners || 0;
      }
    });
  }
  
  // Initialize App
  async function initializeApp() {
    try {
      await initializeGlobalStats();
      await auth.signInAnonymously();
      setupEventListeners();
      setupStatsListener();
      setInterval(updateCountdown, 1000);
    } catch (error) {
      console.error("App initialization error:", error);
    }
  }
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && userData?.mining) {
      const earned = calculateEarnings();
      if (earned > 0) {
        await currentUserRef.update({
          balance: firebase.firestore.FieldValue.increment(earned),
          lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        await updateStats(0, earned);
      }
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', async () => {
    if (userData?.mining) {
      const earned = calculateEarnings();
      if (earned > 0) {
        await currentUserRef.update({
          balance: firebase.firestore.FieldValue.increment(earned),
          lastMiningUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        await updateStats(0, earned);
      }
      
      if (activeMinersSet.has(currentUserRef.id)) {
        activeMinersSet.delete(currentUserRef.id);
        await updateStats(-1);
      }
    }
  });
  
  // Auth State Listener
  auth.onAuthStateChanged((user) => {
    if (user) {
      initializeUser(user);
    } else {
      console.log("User not authenticated");
    }
  });
  
  // Start the application
  initializeApp();