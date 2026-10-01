const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'EUR', 'KES'], required: true },
    status: { type: String, enum: ['Pending', 'Settled', 'Failed'], default: 'Settled' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
