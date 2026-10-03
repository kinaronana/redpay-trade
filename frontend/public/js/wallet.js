const WALLET_API_URL = "/api/wallet";
const CURRENCIES = ["USD", "EUR", "KES", "CNY", "TZS", "UGX", "AED"];

document.addEventListener("DOMContentLoaded", () => {
    const transferForm = document.getElementById("transfer-form");
    const convertForm = document.getElementById("convert-form");
    const offlineTag = document.getElementById("offline-tag");
    const ledgerBody = document.getElementById("ledger-body");
    const token = localStorage.getItem("redpay_token");

    window.addEventListener("online", syncNetworkState);
    window.addEventListener("offline", syncNetworkState);

    async function syncNetworkState() {
        if (!navigator.onLine) {
            if (offlineTag) offlineTag.style.display = "block";
            loadOfflineCacheBalances();
            loadOfflineLedger();
        } else {
            if (offlineTag) offlineTag.style.display = "none";
            if (token) {
                fetchLiveBalances();
                fetchTransactions();
            }
        }
    }

    function refreshAll() {
        fetchLiveBalances();
        fetchTransactions();
    }

    // ---------- Balances ----------
    async function fetchLiveBalances() {
        try {
            const response = await fetch(`${WALLET_API_URL}/balances`, {
                method: "GET",
                headers: { "Authorization": token }
            });

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = "auth.html";
                return;
            }

            const balances = await response.json();

            if (response.ok) {
                CURRENCIES.forEach((c) => {
                    const el = document.getElementById(`bal-${c.toLowerCase()}`);
                    const value = parseFloat(balances[c] || 0);
                    if (el) el.textContent = value.toFixed(2);
                    localStorage.setItem(`cache_${c.toLowerCase()}`, value);
                });
            }
        } catch (err) {
            console.error("Balance retrieval failed, using cached balances", err);
            loadOfflineCacheBalances();
        }
    }

    function loadOfflineCacheBalances() {
        CURRENCIES.forEach((c) => {
            const el = document.getElementById(`bal-${c.toLowerCase()}`);
            if (el) {
                el.textContent = parseFloat(localStorage.getItem(`cache_${c.toLowerCase()}`) || 0).toFixed(2);
            }
        });
    }

    // ---------- Transaction history ----------
    const money = (value) =>
        Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function makeCell(text, style) {
        const td = document.createElement("td");
        td.textContent = text;
        if (style) td.style.cssText = style;
        return td;
    }

    function renderLedger(items) {
        if (!ledgerBody) return;
        ledgerBody.innerHTML = "";

        if (!items || items.length === 0) {
            const row = document.createElement("tr");
            row.style.cssText = "border-bottom: 1px solid #232326; color: #A0A0A5;";
            const cell = makeCell("No transactions recorded yet", "padding: 15px 0;");
            cell.colSpan = 5;
            row.appendChild(cell);
            ledgerBody.appendChild(row);
            return;
        }

        items.forEach((t) => {
            const row = document.createElement("tr");
            row.style.cssText = "border-bottom: 1px solid #232326;";

            const labels = { sent: "Sent", received: "Received", converted: "Converted" };
            let amountText;
            let amountColor = "#FFFFFF";

            if (t.kind === "converted") {
                amountText = `${money(t.amount)} ${t.currency} → ${money(t.toAmount)} ${t.toCurrency}`;
            } else if (t.kind === "received") {
                amountText = `+${money(t.amount)} ${t.currency}`;
                amountColor = "#3DDC84";
            } else {
                amountText = `-${money(t.amount)} ${t.currency}`;
                amountColor = "#E61E26";
            }

            const when = t.createdAt ? new Date(t.createdAt).toLocaleString() : "—";

            row.appendChild(makeCell(labels[t.kind] || "Transfer", "padding: 12px 0;"));
            row.appendChild(makeCell(t.detail || "—", "color: #A0A0A5;"));
            row.appendChild(makeCell(amountText, `color: ${amountColor}; font-weight: 600;`));
            row.appendChild(makeCell(when, "color: #A0A0A5; font-size: 0.85rem;"));
            row.appendChild(makeCell(t.status || "—"));
            ledgerBody.appendChild(row);
        });
    }

    async function fetchTransactions() {
        if (!ledgerBody) return;
        try {
            const response = await fetch(`${WALLET_API_URL}/transactions`, {
                method: "GET",
                headers: { "Authorization": token }
            });

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = "auth.html";
                return;
            }

            const items = await response.json();
            if (!response.ok) throw new Error(items.message || "Could not load history");

            renderLedger(items);
            localStorage.setItem("cache_ledger", JSON.stringify(items));
        } catch (err) {
            console.error("Transaction history failed, using cached history", err);
            loadOfflineLedger();
        }
    }

    function loadOfflineLedger() {
        try {
            renderLedger(JSON.parse(localStorage.getItem("cache_ledger") || "[]"));
        } catch (err) {
            renderLedger([]);
        }
    }

    // ---------- Send money to another user ----------
    if (transferForm) {
        transferForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!navigator.onLine) {
                alert("Transaction blocked: you are offline. Transactions cannot be queued.");
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

                alert("Trade executed successfully and written to the ledger!");
                transferForm.reset();
                refreshAll();
            } catch (err) {
                alert(`Transaction rejected: ${err.message}`);
            }
        });
    }

    // ---------- Convert between your own wallets ----------
    if (convertForm) {
        const amountEl = document.getElementById("convert-amount");
        const fromEl = document.getElementById("convert-from");
        const toEl = document.getElementById("convert-to");
        const resultEl = document.getElementById("convert-result");
        const noteEl = document.getElementById("convert-rate-note");
        let quote = null;

        function updatePreview() {
            if (!quote) return;
            const amount = parseFloat(amountEl.value);
            const from = quote.rates[fromEl.value];
            const to = quote.rates[toEl.value];

            if (fromEl.value === toEl.value) {
                resultEl.value = "";
                noteEl.textContent = "Choose two different currencies.";
                return;
            }
            if (!Number.isFinite(amount) || amount <= 0 || !from || !to) {
                resultEl.value = "";
                return;
            }

            const rate = to / from;
            const received = Math.floor(amount * rate * (1 - quote.feePercent / 100) * 100) / 100;
            resultEl.value = received.toFixed(2);
            noteEl.textContent =
                `1 ${fromEl.value} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toEl.value}` +
                (quote.feePercent ? ` (fee ${quote.feePercent}%)` : "") +
                (quote.source === "fallback" ? " — live rates unavailable, conversion disabled" : "");
        }

        async function loadQuote() {
            try {
                const res = await fetch("/api/rates");
                if (!res.ok) throw new Error(`Status ${res.status}`);
                quote = await res.json();
                updatePreview();
            } catch (err) {
                noteEl.textContent = "Rates unavailable right now.";
            }
        }

        [amountEl, fromEl, toEl].forEach((el) => {
            el.addEventListener("input", updatePreview);
            el.addEventListener("change", updatePreview);
        });

        convertForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!navigator.onLine) {
                alert("Conversion blocked: you are offline.");
                return;
            }

            try {
                const response = await fetch(`${WALLET_API_URL}/convert`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token
                    },
                    body: JSON.stringify({
                        amount: amountEl.value,
                        fromCurrency: fromEl.value,
                        toCurrency: toEl.value
                    })
                });

                const outcome = await response.json();
                if (!response.ok) throw new Error(outcome.message || "Conversion failed");

                alert(outcome.message);
                refreshAll();
            } catch (err) {
                alert(`Conversion rejected: ${err.message}`);
            }
        });

        loadQuote();
        setInterval(loadQuote, 10 * 60 * 1000);
    }

    syncNetworkState();
});