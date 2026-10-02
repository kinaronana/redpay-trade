const WALLET_API_URL = "/api/wallet";

document.addEventListener("DOMContentLoaded", () => {
    const transferForm = document.getElementById("transfer-form");
    const offlineTag = document.getElementById("offline-tag");
    const token = localStorage.getItem("redpay_token");

    // Check connectivity status pipelines
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);

    async function syncNetworkState() {
        if (!navigator.onLine) {
            if (offlineTag) offlineTag.style.display = "block";
            loadOfflineCacheBalances();
        } else {
            if (offlineTag) offlineTag.style.display = "none";
            if (token) fetchLiveBalances();
        }
    }

    // Fetch balances securely via backend pipeline APIs
    async function fetchLiveBalances() {
        try {
            const response = await fetch(`${WALLET_API_URL}/balances`, {
                method: "GET",
                headers: { "Authorization": token }
            });
            const balances = await response.json();
            
            if (response.ok) {
                // Update UI balances dynamically
                document.getElementById("bal-usd").textContent = parseFloat(balances.USD).toFixed(2);
                document.getElementById("bal-eur").textContent = parseFloat(balances.EUR).toFixed(2);
                document.getElementById("bal-kes").textContent = parseFloat(balances.KES).toFixed(2);

                // Update local storage backup state for seamless offline fallback
                localStorage.setItem("cache_usd", balances.USD);
                localStorage.setItem("cache_eur", balances.EUR);
                localStorage.setItem("cache_kes", balances.KES);
            }
        } catch (err) {
            console.error("Balance retrieval failed, pulling fallback cache logs", err);
            loadOfflineCacheBalances();
        }
    }

    function loadOfflineCacheBalances() {
        document.getElementById("bal-usd").textContent = parseFloat(localStorage.getItem("cache_usd") || 0).toFixed(2);
        document.getElementById("bal-eur").textContent = parseFloat(localStorage.getItem("cache_eur") || 0).toFixed(2);
        document.getElementById("bal-kes").textContent = parseFloat(localStorage.getItem("cache_kes") || 0).toFixed(2);
    }

    // Handle cross-border payment checkout form processing
    if (transferForm) {
        transferForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            if (!navigator.onLine) {
                alert("Transaction Blocked: Device is completely offline. Transactions cannot queue without security authentication checks.");
                return;
            }

            const recipientEmail = document.getElementById("recipient-account").value;
            const amount = document.getElementById("trade-amount").value;
            const currency = document.getElementById("trade-currency").value;

            try {
                const response = await fetch(`${WALLET_API_URL}/transfer`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": token
                    },
                    body: JSON.stringify({ recipientEmail, amount, currency })
                });

                const outcome = await response.json();
                if (!response.ok) throw new Error(outcome.message || "Settlement failed");

                alert("Trade executed successfully and written to secure ledger!");
                fetchLiveBalances(); // Refresh balances automatically
            } catch (err) {
                alert(`Transaction Rejected: ${err.message}`);
            }
        });
    }

    syncNetworkState();
});
