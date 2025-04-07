/**********************
         * 1. Initialize Firebase
         **********************/
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
let userRef;
let unsubscribeUser;

/**********************
* 2. Mining App Variables
**********************/
let userId = null;
const baseRate = 0.003472 / 6; // Adjusted for 10-second intervals
let miningInterval;
let countdownInterval;

/**********************
* 3. User Initialization
**********************/
async function initUser() {
  const urlParams = new URLSearchParams(window.location.search);
  const tgUser = urlParams.get('tg_user') || '{"username":"telegram_user","id":123}';
  
  try {
      const userData = JSON.parse(tgUser);
      userId = `tg_${userData.id}`;
      userRef = db.collection('users').doc(userId);

      // Check or create user document
      const doc = await userRef.get();
      if (!doc.exists) {
          await userRef.set({
              telegramUsername: userData.username,
              balance: 0,
              miningPower: 1,
              uniqueCode: '',
              submissionsReceived: 0,
              hasSubmitted: false,
              miningActive: false,
              joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
      }

      // Set up real-time listener
      unsubscribeUser = userRef.onSnapshot(async (doc) => {
          const data = doc.data();
          updateUI(data);
          
          if (data.miningActive) {
              startCountdown(data.codeExpiration?.toDate());
              if (!miningInterval) startMiningInterval();
          } else {
              stopMining();
          }
      });

  } catch (e) {
      console.error("Error initializing user:", e);
  }
}

/**********************
* 4. Mining Functions
**********************/
function calculatePower(data) {
  return 1 + (data.submissionsReceived * 0.1) + (data.hasSubmitted ? 0.5 : 0);
}

async function startMining() {
  const code = await generateUniqueCode();
  await userRef.update({
      miningActive: true,
      uniqueCode: code,
      codeExpiration: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function generateUniqueCode() {
  let code;
  do {
      code = Math.random().toString().slice(2, 12);
      const snapshot = await db.collection('users')
          .where('uniqueCode', '==', code)
          .limit(1)
          .get();
      if (snapshot.empty) return code;
  } while (true);
}

function startMiningInterval() {
  miningInterval = setInterval(async () => {
      const doc = await userRef.get();
      const data = doc.data();
      const earnings = baseRate * calculatePower(data);
      
      await userRef.update({
          balance: firebase.firestore.FieldValue.increment(earnings),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
  }, 10000);
}

function stopMining() {
  clearInterval(miningInterval);
  miningInterval = null;
}

/**********************
* 5. Code Submission
**********************/
async function submitCode() {
  const inputCode = document.getElementById('inputCode').value.trim();
  if (!inputCode) return;

  try {
      // Check if code exists
      const snapshot = await db.collection('users')
          .where('uniqueCode', '==', inputCode)
          .limit(1)
          .get();

      if (snapshot.empty) {
          alert('Invalid code!');
          return;
      }

      const codeOwner = snapshot.docs[0];
      if (codeOwner.id === userId) {
          alert("You can't use your own code!");
          return;
      }

      // Check daily submissions
      const today = new Date().toISOString().split('T')[0];
      const submissionRef = db.collection('submissions').doc(`${userId}_${today}_${inputCode}`);
      
      await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(submissionRef);
          if (doc.exists) {
              alert('Already submitted this code today!');
              return;
          }

          transaction.set(submissionRef, {
              submittedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          transaction.update(userRef, {
              hasSubmitted: true,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });

          transaction.update(codeOwner.ref, {
              submissionsReceived: firebase.firestore.FieldValue.increment(1),
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });

          alert('Code submitted successfully!');
      });
  } catch (error) {
      console.error('Submission error:', error);
  }
}

/**********************
* 6. UI Functions
**********************/
function updateUI(data) {
  document.getElementById('username').textContent = data?.telegramUsername || 'User';
  document.getElementById('balance').textContent = data?.balance?.toFixed(2) || '0.00';
  document.getElementById('power').textContent = calculatePower(data || {}).toFixed(1);
  document.getElementById('code').textContent = data?.uniqueCode || '';
  document.getElementById('submissions').textContent = data?.submissionsReceived || 0;
  document.getElementById('mineButton').disabled = !!data?.miningActive;
  document.getElementById('mineButton').textContent = data?.miningActive ? 'Mining...' : 'Start Mining';
  updateProgress(data?.balance || 0);
}

function updateProgress(balance) {
  const progress = (balance / 125000000) * 100;
  document.getElementById('progress').style.width = `${progress}%`;
  document.getElementById('mined').textContent = balance.toFixed(2);
}

function startCountdown(expiration) {
  clearInterval(countdownInterval);
  if (!expiration) return;

  countdownInterval = setInterval(() => {
      const now = new Date();
      const diff = expiration - now;
      
      if (diff <= 0) {
          clearInterval(countdownInterval);
          userRef.update({ miningActive: false });
          return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      document.getElementById('countdown').textContent = 
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

/**********************
* 7. Initialization
**********************/
document.addEventListener('DOMContentLoaded', initUser);
window.addEventListener('beforeunload', () => {
  if (unsubscribeUser) unsubscribeUser();
});