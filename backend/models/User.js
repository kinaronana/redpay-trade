const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Encrypted hash string
    wallets: {
        USD: { type: Number, default: 1000.00 }, // Demo starter balances
        EUR: { type: Number, default: 500.00 },  // Demo starter balances
        KES: { type: Number, default: 100000.00 }, // Demo starter balances
        CNY: { type: Number, default: 1000.00 }, // Demo starter balances
        TZS: { type: Number, default: 1000000.00 }, // Demo starter balances
        UGX: { type: Number, default: 100000.00 }, // Demo starter balances
        AED: { type: Number, default: 1000.00 } // Demo starter balancescd backend
    },
    createdAt: { type: Date, default: Date.now }
});
console.log('[User model] wallet currencies:', Object.keys(UserSchema.paths).filter(p => p.startsWith('wallets.')));
module.exports = mongoose.model('User', UserSchema);