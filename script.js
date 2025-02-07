const API_URL = "http://localhost:3000/api/auth";

async function signup() {
    const username = document.getElementById("signup-username").value;
    const phone = document.getElementById("signup-phone").value;

    const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone }),
    });

    const data = await res.json();

    if (res.status === 200) {
        localStorage.setItem("user", JSON.stringify(data.user)); // Save user info
        window.location.href = "dashboard.html"; // Redirect to dashboard
    } else {
        alert(data.message);
    }
}

async function login() {
    const username = document.getElementById("login-username").value;
    const phone = document.getElementById("login-phone").value;

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone }),
    });

    const data = await res.json();

    if (res.status === 200) {
        localStorage.setItem("user", JSON.stringify(data.user)); // Save user info
        window.location.href = "dashboard.html"; // Redirect to dashboard
    } else {
        alert(data.message);
    }
}
