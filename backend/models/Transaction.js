const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['transfer', 'conversion'], default: 'transfer' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientEmail: { type: String },           // transfers only
    amount: { type: Number, required: true },   // amount debited
    currency: { type: String, required: true }, // currency debited
    toAmount: { type: Number },                 // conversions only
    toCurrency: { type: String },
    rate: { type: Number },
    feePercent: { type: Number },
    status: { type: String, default: 'Settled' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);