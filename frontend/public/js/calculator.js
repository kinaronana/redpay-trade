document.addEventListener("DOMContentLoaded", () => {
    const sendAmount = document.getElementById("send-amount");
    const sendCurrency = document.getElementById("send-currency");
    const receiveAmount = document.getElementById("receive-amount");
    const receiveCurrency = document.getElementById("receive-currency");
    const status = document.getElementById("rate-status");

    if (!sendAmount || !sendCurrency || !receiveAmount || !receiveCurrency) return;

    let rates = null;

    function setStatus(text) {
        if (status) status.textContent = text;
    }

    function recalculate() {
        if (!rates) return;
        const amount = parseFloat(sendAmount.value);
        const from = rates[sendCurrency.value];
        const to = rates[receiveCurrency.value];

        if (!Number.isFinite(amount) || amount < 0 || !from || !to) {
            receiveAmount.value = "";
            return;
        }
        receiveAmount.value = ((amount / from) * to).toFixed(2);

        const unit = (to / from);
        setStatus(`1 ${sendCurrency.value} = ${unit.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${receiveCurrency.value}`);
    }

    async function loadRates() {
        try {
            const response = await fetch("/api/rates");
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            rates = data.rates;
            recalculate();

            if (data.source === "fallback") {
                setStatus("Indicative rates (live rates temporarily unavailable)");
            }
        } catch (err) {
            console.error("Rate lookup failed:", err.message);
            setStatus("Rates unavailable right now. Please try again shortly.");
        }
    }

    sendAmount.addEventListener("input", recalculate);
    sendCurrency.addEventListener("change", recalculate);
    receiveCurrency.addEventListener("change", recalculate);

    loadRates();
    setInterval(loadRates, 10 * 60 * 1000); // refresh every 10 minutes
});