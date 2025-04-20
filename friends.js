// Assuming you're using Appwrite SDK and Telegram Web App for integration

const inviteButton = document.getElementById('inviteButton');
const copyButton = document.getElementById('copyButton');
const referralLinkElement = document.getElementById('referralLink');

// Function to handle generating referral code
async function generateReferralCode() {
    try {
        const response = await fetch('YOUR_BACKEND_URL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-telegram-data': JSON.stringify(window.Telegram.WebApp.initDataUnsafe)
            },
            body: JSON.stringify({
                action: 'generate_referral'
            })
        });
        
        const data = await response.json();

        if (data.success) {
            const referralLink = data.link;
            referralLinkElement.textContent = referralLink;
            referralLinkElement.href = referralLink;
            referralLinkElement.style.display = 'block';

            // Enable Copy button
            copyButton.disabled = false;
        } else {
            alert('Error generating referral code: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the referral code.');
    }
}

// Function to copy the referral link
function copyReferralLink() {
    const referralLink = referralLinkElement.textContent;
    
    if (referralLink) {
        navigator.clipboard.writeText(referralLink).then(() => {
            alert('Referral link copied to clipboard!');
        }).catch((error) => {
            console.error('Error copying referral link:', error);
            alert('Failed to copy the referral link.');
        });
    } else {
        alert('Referral link is not available.');
    }
}

// Add event listeners to buttons
inviteButton.addEventListener('click', generateReferralCode);
copyButton.addEventListener('click', copyReferralLink);

// Hide referral link initially
referralLinkElement.style.display = 'none';
