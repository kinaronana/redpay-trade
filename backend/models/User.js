const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Encrypted hash string
    wallets: {
        USD: { type: Number, default: 1000.00 }, // Demo starter balances
        EUR: { type: Number, default: 500.00 },
        KES: { type: Number, default: 0.00 },
        CNY: { type: Number, default: 0.00 },
        TZS: { type: Number, default: 0.00 },
        UGX: { type: Number, default: 0.00 },
        AED: { type: Number, default: 0.00 }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);