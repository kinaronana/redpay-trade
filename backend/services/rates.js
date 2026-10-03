const CURRENCIES = ['USD', 'EUR', 'KES', 'CNY', 'TZS', 'UGX', 'AED'];

// Approximate rates, used only for display if the live provider is unreachable
const FALLBACK = { USD: 1, EUR: 0.92, KES: 129, CNY: 7.2, TZS: 2600, UGX: 3700, AED: 3.6725 };

const TTL_MS = 60 * 60 * 1000; // refresh live rates hourly
let cache = { rates: null, fetchedAt: 0, source: 'fallback' };

async function refreshRates() {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`Rate provider responded ${response.status}`);

    const data = await response.json();
    if (data.result !== 'success' || !data.rates) throw new Error('Unexpected rate payload');

    const rates = {};
    for (const code of CURRENCIES) {
        if (typeof data.rates[code] !== 'number') throw new Error(`Missing rate for ${code}`);
        rates[code] = data.rates[code];
    }
    cache = { rates, fetchedAt: Date.now(), source: 'live' };
}

async function getRates() {
    if (!cache.rates || Date.now() - cache.fetchedAt > TTL_MS) {
        try {
            await refreshRates();
        } catch (err) {
            console.error('[rates] refresh failed:', err.message);
            if (!cache.rates) {
                // Show fallback numbers, but retry the live provider in about a minute
                cache = { rates: FALLBACK, fetchedAt: Date.now() - TTL_MS + 60000, source: 'fallback' };
            }
        }
    }
    return {
        rates: cache.rates,
        source: cache.source,
        updatedAt: new Date(cache.fetchedAt).toISOString()
    };
}

module.exports = { getRates, CURRENCIES };