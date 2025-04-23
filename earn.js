document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Appwrite client
    const client = new window.Appwrite.Client()
      .setEndpoint('https://fra.cloud.appwrite.io/v1')
      .setProject('6800cf6c0038c2026f07');
  
    // Get current user ID
    const userId = localStorage.getItem('userId');
    if (!userId) {
      window.location.href = 'index.html';
      return;
    }
  
    // DOM elements
    const submissionsButton = document.getElementById('submissionsRewardButton');
    const submissionsTask = document.getElementById('submissionsTask');
  
    // Check task status
    async function checkTasks() {
      try {
        const response = await fetch('68062657001a181032e7', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
  
        const data = await response.json();
  
        if (data.success) {
          const submissions = data.totalSubmissions || 0;
          
          if (data.completedTasks.submissions) {
            submissionsTask.classList.add('completed');
            if (data.completedTasks.submissionsClaimed) {
              submissionsButton.textContent = 'Claimed';
              submissionsButton.disabled = true;
            } else {
              submissionsButton.textContent = 'Claim Reward';
              submissionsButton.disabled = false;
            }
          }
          
          // Always show progress
          submissionsTask.querySelector('.task-desc').textContent = 
            `${submissions}/100 uses of your code`;
        } else {
          console.error('Error checking tasks:', data.error);
        }
      } catch (err) {
        console.error('Failed to check tasks:', err);
      }
    }
  
    // Claim reward handler
    submissionsButton.addEventListener('click', async () => {
      submissionsButton.disabled = true;
      submissionsButton.textContent = 'Processing...';
      
      try {
        const response = await fetch('68062657001a181032e7', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
  
        const data = await response.json();
  
        if (data.success) {
          if (data.rewardGiven) {
            alert(`Successfully claimed 5 $BLACK! New balance: ${data.newBalance.toFixed(2)}`);
            submissionsButton.textContent = 'Claimed';
          } else {
            alert('No rewards to claim or already claimed');
            submissionsButton.textContent = data.completedTasks.submissionsClaimed ? 'Claimed' : 'Claim Reward';
            submissionsButton.disabled = data.completedTasks.submissionsClaimed;
          }
          await checkTasks();
        } else {
          alert('Failed to claim reward: ' + (data.error || 'Unknown error'));
          submissionsButton.textContent = 'Claim Reward';
          submissionsButton.disabled = false;
        }
      } catch (err) {
        console.error('Failed to claim reward:', err);
        alert('Failed to claim reward. Please try again.');
        submissionsButton.textContent = 'Claim Reward';
        submissionsButton.disabled = false;
      }
    });
  
    // Initial check
    await checkTasks();
    
    // Optional: Refresh every 30 seconds
    setInterval(checkTasks, 30000);
  }); // <-- THIS should be the closing brace for DOMContentLoaded