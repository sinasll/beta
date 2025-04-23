// Utility: copy text to clipboard without alerts
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => button.textContent = original, 2000);
  } catch {
    const original = button.textContent;
    button.textContent = 'Copy failed';
    setTimeout(() => button.textContent = original, 2000);
  }
}

// Utility: paste clipboard text into input without opening keyboard
async function pasteFromClipboard(input, button) {
  try {
    const text = await navigator.clipboard.readText();
    input.value = text;
    const original = button.textContent;
    button.textContent = 'Pasted!';
    setTimeout(() => button.textContent = original, 2000);
  } catch {
    // silent fail
  }
}

// Setup all button and input event listeners without alerts
export function setupButtonEventListeners({
  userData,
  dailyCodeEl,
  codeInput,
  copyBtn,
  pasteBtn,
  submitBtn,
  sendBtn,
  shareBtn,
  updateUI,
  initializeUser,
  functions,
  FUNCTION_ID
}) {
  // Copy mining code
  copyBtn.addEventListener('click', () => {
    const text = userData.dailyCode || dailyCodeEl.textContent;
    if (text) copyToClipboard(text, copyBtn);
  });

  // Paste into input immediately
  if (pasteBtn) {
    pasteBtn.addEventListener('click', () => {
      pasteFromClipboard(codeInput, pasteBtn);
      updateUI();
    });
  }

  // Submit referral code
  submitBtn.addEventListener('click', async () => {
    const submittedCode = codeInput.value.trim();
    if (!submittedCode) return;

    try {
      const payload = {
        ...initializeUser(),
        action: 'submit_code',
        code: submittedCode
      };

      const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
      const data = JSON.parse(exec.responseBody || '{}');

      if (data.success) {
        userData.balance = data.balance;
        userData.miningPower = data.mining_power;
        userData.submittedCodes.push(submittedCode);
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
        if (data.owner_submissions !== undefined) {
          userData.codeSubmissionsToday = data.owner_submissions;
        }
        updateUI();
        const original = submitBtn.textContent;
        submitBtn.textContent = 'Submitted';
        setTimeout(() => submitBtn.textContent = original, 2000);
        codeInput.value = '';
      } else {
        const original = submitBtn.textContent;
        submitBtn.textContent = 'Failed';
        setTimeout(() => submitBtn.textContent = original, 2000);
      }
    } catch {
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Error';
      setTimeout(() => submitBtn.textContent = original, 2000);
    }
  });

  // Send mining code via Telegram or button feedback
  sendBtn.addEventListener('click', () => {
    const code = userData.dailyCode || dailyCodeEl.textContent;
    if (!code) return;

    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const message = `Use my $BLACK code for today: ${code}`;
      tg.sendData(message);
      tg.close();
    } else {
      // Fallback: copy code to clipboard
      copyToClipboard(code, sendBtn);
    }
  });

  // Share referral link
  shareBtn.addEventListener('click', async () => {
    const link = `${window.location.origin}${window.location.pathname}?ref=${userData.dailyCode}`;
    let didShare = false;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join $BLACK Mining',
          text: 'Use my referral code to get bonus mining power!',
          url: link
        });
        didShare = true;
      } catch {
        // fail silently
      }
    }

    if (!didShare) {
      copyToClipboard(link, shareBtn);
    }
  });

  // Update submit button state on input
  codeInput.addEventListener('input', updateUI);
}
