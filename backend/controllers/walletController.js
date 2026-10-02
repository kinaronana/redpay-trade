const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const ALLOWED_CURRENCIES = ['USD', 'EUR', 'KES', 'CNY', 'TZS', 'UGX', 'AED'];

const httpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

exports.getBalances = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.wallets);
    } catch (err) {
        console.error('[getBalances]', err.message);
        res.status(500).json({ message: 'Could not load balances' });
    }
};

exports.executeTransfer = async (req, res) => {
    const { recipientEmail, currency } = req.body;
    const amount = Math.round(Number(req.body.amount) * 100) / 100;

    if (typeof recipientEmail !== 'string' || !recipientEmail.trim()) {
        return res.status(400).json({ message: 'Recipient email is required' });
    }
    if (!ALLOWED_CURRENCIES.includes(currency)) {
        return res.status(400).json({ message: 'Unsupported currency' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const session = await mongoose.startSession();
    try {
        let transaction;
        await session.withTransaction(async () => {
            const recipient = await User.findOne({
                email: recipientEmail.trim().toLowerCase()
            }).session(session);

            if (!recipient) throw httpError(404, 'Recipient user profile not found');
            if (recipient._id.equals(req.user.id)) {
                throw httpError(400, 'You cannot send money to yourself');
            }

            // Debit only if the balance is sufficient (single atomic operation)
            const debit = await User.updateOne(
                { _id: req.user.id, [`wallets.${currency}`]: { $gte: amount } },
                { $inc: { [`wallets.${currency}`]: -amount } },
                { session }
            );
            if (debit.modifiedCount !== 1) {
                throw httpError(400, 'Insufficient currency balance');
            }

            await User.updateOne(
                { _id: recipient._id },
                { $inc: { [`wallets.${currency}`]: amount } },
                { session }
            );

            [transaction] = await Transaction.create([{
                sender: req.user.id,
                recipientEmail: recipient.email,
                amount,
                currency,
                status: 'Settled'
            }], { session });
        });

        res.status(200).json({ message: 'Transfer settled completely', transaction });
    } catch (err) {
        console.error('[executeTransfer]', err.message);
        res.status(err.status || 500).json({
            message: err.status ? err.message : 'Transfer failed. Please try again.'
        });
    } finally {
        session.endSession();
    }
};