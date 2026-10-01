const API_URL = "http://localhost:5000/api/auth";

document.addEventListener("DOMContentLoaded", () => {
    const userDisplay = document.getElementById("user-display");
    const logoutBtn = document.getElementById("logout-btn");
    
    const authForm = document.getElementById("auth-form");
    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");
    const nameGroup = document.getElementById("name-group");
    const authSubmitBtn = document.getElementById("auth-submit-btn");
    const authToggle = document.getElementById("auth-toggle");
    const toggleText = document.getElementById("toggle-text");

    let isSignUpMode = true;

    // Route guard validation checks
    const activeToken = localStorage.getItem("redpay_token");
    const activeUser = localStorage.getItem("redpay_user");

    if (window.location.pathname.includes("dashboard.html") && !activeToken) {
        console.warn("[Auth Guard] No token found in browser memory. Evicting user to auth page.");
        window.location.href = "auth.html";
        return;
    }

    if (userDisplay && activeUser) {
        userDisplay.textContent = activeUser;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    if (authToggle) {
        authToggle.addEventListener("click", (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            if (isSignUpMode) {
                authTitle.textContent = "Create Account";
                nameGroup.style.display = "grid";
                authSubmitBtn.textContent = "Sign Up";
            } else {
                authTitle.textContent = "Welcome Back";
                nameGroup.style.display = "none";
                authSubmitBtn.textContent = "Log In";
            }
        });
    }

    // Process Active Submissions
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("auth-email").value;
            const password = document.getElementById("auth-password").value;
            const endpoint = isSignUpMode ? "register" : "login";
            
            let payload = { email, password };
            if (isSignUpMode) {
                payload.name = document.getElementById("auth-name").value;
            }

            console.log(`[API Request] Attempting POST to: ${API_URL}/${endpoint} with payload:`, payload);

            try {
                const response = await fetch(`${API_URL}/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log("[API Response] Received payload data from backend:", data);

                if (!response.ok) {
                    throw new Error(data.message || `Server responded with status: ${response.status}`);
                }

                // Strictly store real server payloads instead of fake fallback strings
                localStorage.setItem("redpay_token", `Bearer ${data.token}`);
                localStorage.setItem("redpay_user", data.user.name);

                alert(`Success! Account assigned to database cluster. Redirecting...`);
                window.location.href = "dashboard.html";

            } catch (err) {
                console.error("[Network Error] Security intercept or server crash:", err.message);
                alert(`Database Write Blocked: ${err.message}`);
            }
        });
    }
});
