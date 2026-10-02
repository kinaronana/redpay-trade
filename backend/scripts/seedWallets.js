const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const DEFAULTS = { USD: 1000, EUR: 500, KES: 100000, CNY: 1000, TZS: 1000000, UGX: 100000, AED: 1000 };

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Using database:', mongoose.connection.name);

        for (const [currency, value] of Object.entries(DEFAULTS)) {
            const result = await User.updateMany(
                { [`wallets.${currency}`]: { $exists: false } },
                { $set: { [`wallets.${currency}`]: value } }
            );
            console.log(`${currency}: updated ${result.modifiedCount} users`);
        }
    } catch (err) {
        console.error('Seeding failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
})();