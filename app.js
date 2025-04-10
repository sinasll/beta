    // ======================
    // 1. Configuration
    // ======================
    const ENV = {
        BASE_RATE: 0.003472 / 6 // 0.02/hour
      };
      const TOTAL_SUPPLY = 125000000;
  
      // ======================
      // 2. Firebase Setup
      // ======================
      const firebaseConfig = {
        apiKey: "AIzaSyAzXSCn_QL2XeyRZD71By443sl4wOtXf2Y",
        authDomain: "pipcore-8844f.firebaseapp.com",
        projectId: "pipcore-8844f",
        storageBucket: "pipcore-8844f.appspot.com",
        messagingSenderId: "921115337984",
        appId: "1:921115337984:web:17161651342ad78017bfe5"
      };
  
      firebase.initializeApp(firebaseConfig);
      const db = firebase.firestore();
      let userRef, unsubscribeUser;
  
      // ======================
      // 3. Core Application
      // ======================
      class MiningApp {
        constructor() {
          this.userId = null;
          this.miningInterval = null;
          this.init();
        }
  
        async init() {
          try {
            // Initialize Telegram WebApp
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            Telegram.WebApp.MainButton.showProgress();
            Telegram.WebApp.enableClosingConfirmation();
  
            // Get and verify Telegram user
            const tgUser = Telegram.WebApp.initDataUnsafe.user;
            if (!tgUser?.id) throw new Error("Invalid Telegram user");
  
            // Initialize user session
            await this.initUserSession(tgUser);
  
            // Setup real-time listener
            this.setupRealtimeUpdates();
  
            // Handle visibility changes
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
  
            // Start countdown timer
            this.startCountdown();
  
          } catch (error) {
            console.error("App initialization failed:", error);
            this.showError("Failed to initialize. Please restart the app.");
          }
        }
  
        async initUserSession(tgUser) {
          this.userId = `tg_${tgUser.id}`;
          userRef = db.collection('users').doc(this.userId);
  
          const userData = {
            telegramId: tgUser.id,
            username: tgUser.username || `user_${tgUser.id}`,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || '',
            balance: 0,
            miningPower: 1,
            miningActive: false,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          };
  
          await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) {
              transaction.set(userRef, {
                ...userData,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
          });
        }
  
        setupRealtimeUpdates() {
          unsubscribeUser = userRef.onSnapshot(async (doc) => {
            const data = doc.data() || {};
            this.updateUI(data);
  
            if (data.miningActive && !this.miningInterval) {
              this.startMiningEngine();
            }
          }, error => {
            console.error("Realtime update error:", error);
            this.showError("Connection lost. Reconnecting...");
          });
        }
  
        // ======================
        // 4. Mining System
        // ======================
        async toggleMining() {
          const doc = await userRef.get();
          const data = doc.data();
  
          if (data.miningActive) {
            Telegram.WebApp.showAlert("Mining is already active.");
            return;
          } else {
            await userRef.update({
              miningActive: true
            });
          }
        }
  
        startMiningEngine() {
          this.miningInterval = setInterval(async () => {
            const doc = await userRef.get();
            const data = doc.data();
            const earnings = ENV.BASE_RATE * this.calculatePower(data);
  
            await userRef.update({
              balance: firebase.firestore.FieldValue.increment(earnings),
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
          }, 10000);
        }
  
        calculatePower(data) {
          return 1 + (data.premium ? 0.5 : 0);
        }
  
        // ======================
        // 5. UI Management
        // ======================
        updateUI(data) {
          document.getElementById('username').textContent = data.username;
          document.getElementById('balance').textContent = data.balance.toFixed(2);
          document.getElementById('power').textContent = this.calculatePower(data).toFixed(1);
  
          const mineButton = document.getElementById('mineButton');
          mineButton.textContent = data.miningActive ? "Mining Active" : "Start Mining";
        }
  
        showError(message) {
          Telegram.WebApp.showAlert(message);
        }
  
        handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            clearInterval(this.miningInterval);
            this.miningInterval = null;
          } else {
            userRef.get().then(doc => {
              if (doc.exists && doc.data().miningActive && !this.miningInterval) {
                this.startMiningEngine();
              }
            });
          }
        }
  
        // ======================
        // 6. Countdown to new day
        // ======================
        startCountdown() {
          setInterval(() => {
            const now = new Date();
            const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
            const timeLeft = nextDay - now;
  
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
            document.getElementById('countdown').textContent = 
              `Daily reset in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }, 1000);
        }
  
        // ======================
        // 7. Cleanup
        // ======================
        destroy() {
          clearInterval(this.miningInterval);
          if (unsubscribeUser) unsubscribeUser();
          document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
      }
  
      // Initialize application
      let app;
      document.addEventListener('DOMContentLoaded', () => app = new MiningApp());
      window.addEventListener('beforeunload', () => app.destroy());
  
      // ======================
      // 8. Global Mined Tokens Tracker
      // ======================
      db.collection('users').onSnapshot(snapshot => {
        let totalMined = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.balance && typeof data.balance === 'number') {
            totalMined += data.balance;
          }
        });
  
        // Update UI with total mined
        document.getElementById('mined').textContent = totalMined.toFixed(2);
        
      }, error => {
        console.error("Global tracker error:", error);
        Telegram.WebApp.showAlert("Failed to load mining data");
      });
  
          // ======================
      // 9. Daily Mining Reset
      // ======================
      const resetMiningAtMidnight = () => {
        const now = new Date();
        const millisTillMidnightUTC = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
        ) - now;
  
        setTimeout(async () => {
          try {
            const doc = await userRef.get();
            const data = doc.data();
            if (data?.miningActive) {
              await userRef.update({ miningActive: false });
              console.log("Mining reset at midnight UTC.");
            }
          } catch (err) {
            console.error("Error resetting mining:", err);
          }
          resetMiningAtMidnight(); // Schedule again for the next day
        }, millisTillMidnightUTC);
      };
  
      // Add this inside DOMContentLoaded to ensure it runs
      document.addEventListener('DOMContentLoaded', () => {
        app = new MiningApp();
        resetMiningAtMidnight(); // Start the reset timer
      });