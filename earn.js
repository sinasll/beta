document.addEventListener('DOMContentLoaded', () => {
    const claimButton = document.getElementById('claimButton');
    const taskReward = document.querySelector('.task-reward');
    const countdownElement = document.getElementById('countdown');

    claimButton.addEventListener('click', claimDailyBonus);

    async function claimDailyBonus() {
        try {
            claimButton.disabled = true;
            claimButton.textContent = 'Processing...';

            const response = await fetch('https://6806265805321db0a9e4.fra.appwrite.run/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: getCurrentUserId() 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                taskReward.textContent = `+${data.new_mining_power_bonus.toFixed(1)}x`;
                claimButton.textContent = 'Claimed';
                startCountdown(data.next_available_in || 24 * 60 * 60 * 1000);
            } else {
                if (data.timeRemaining) {
                    startCountdown(data.timeRemaining);
                    alert(`Daily bonus not available yet. Try again in ${formatTime(data.timeRemaining)}.`);
                } else {
                    alert(data.error || data.message);
                }
                claimButton.disabled = false;
                claimButton.textContent = 'Claim Daily Bonus';
            }
        } catch (error) {
            console.error('Error claiming daily bonus:', error);
            alert('Error claiming daily bonus. Please try again later.');
            claimButton.disabled = false;
            claimButton.textContent = 'Claim Daily Bonus';
        }
    }

    function getCurrentUserId() {
        // In a real app, you would get this from your auth system
        // For example, from localStorage or a cookie
        return localStorage.getItem('userId') || 'demo-user-id';
    }

    function startCountdown(duration) {
        let timeRemaining = duration;
        updateCountdownDisplay(timeRemaining);
        
        const countdownInterval = setInterval(() => {
            timeRemaining -= 1000;
            
            if (timeRemaining <= 0) {
                clearInterval(countdownInterval);
                claimButton.disabled = false;
                claimButton.textContent = 'Claim Daily Bonus';
                countdownElement.textContent = 'Ready to claim!';
                localStorage.removeItem('dailyBonusCountdown');
            } else {
                updateCountdownDisplay(timeRemaining);
            }
        }, 1000);
    }

    function updateCountdownDisplay(ms) {
        countdownElement.textContent = formatTime(ms);
        // Save to localStorage to persist across page refreshes
        localStorage.setItem('dailyBonusCountdown', 
            (Date.now() + ms).toString());
    }

    function formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Check for existing countdown in localStorage
    const storedCountdown = localStorage.getItem('dailyBonusCountdown');
    if (storedCountdown) {
        const remainingTime = parseInt(storedCountdown) - Date.now();
        if (remainingTime > 0) {
            startCountdown(remainingTime);
            claimButton.disabled = true;
            claimButton.textContent = 'Already Claimed';
        } else {
            localStorage.removeItem('dailyBonusCountdown');
        }
    }
});