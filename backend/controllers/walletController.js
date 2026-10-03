const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getRates, CURRENCIES } = require('../services/rates');

const ALLOWED_CURRENCIES = CURRENCIES;

const httpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

exports.getBalances = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const wallets = user.toObject().wallets || {};
        const balances = {};
        ALLOWED_CURRENCIES.forEach((c) => { balances[c] = wallets[c] || 0; });
        res.json(balances);
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
                type: 'transfer',
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

exports.convertCurrency = async (req, res) => {
    const { fromCurrency, toCurrency } = req.body;
    const amount = Math.round(Number(req.body.amount) * 100) / 100;

    if (!ALLOWED_CURRENCIES.includes(fromCurrency) || !ALLOWED_CURRENCIES.includes(toCurrency)) {
        return res.status(400).json({ message: 'Unsupported currency' });
    }
    if (fromCurrency === toCurrency) {
        return res.status(400).json({ message: 'Choose two different currencies' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const { rates, source } = await getRates();
    if (source !== 'live') {
        return res.status(503).json({
            message: 'Live exchange rates are temporarily unavailable. Please try again shortly.'
        });
    }

    const feePercent = Number(process.env.CONVERSION_FEE_PERCENT) || 0;
    const rate = rates[toCurrency] / rates[fromCurrency];
    const received = Math.floor(amount * rate * (1 - feePercent / 100) * 100) / 100;

    if (received <= 0) {
        return res.status(400).json({ message: 'Amount is too small to convert' });
    }

    const session = await mongoose.startSession();
    try {
        let transaction;
        await session.withTransaction(async () => {
            const debit = await User.updateOne(
                { _id: req.user.id, [`wallets.${fromCurrency}`]: { $gte: amount } },
                { $inc: { [`wallets.${fromCurrency}`]: -amount } },
                { session }
            );
            if (debit.modifiedCount !== 1) {
                throw httpError(400, 'Insufficient currency balance');
            }

            await User.updateOne(
                { _id: req.user.id },
                { $inc: { [`wallets.${toCurrency}`]: received } },
                { session }
            );

            [transaction] = await Transaction.create([{
                type: 'conversion',
                sender: req.user.id,
                amount,
                currency: fromCurrency,
                toAmount: received,
                toCurrency,
                rate,
                feePercent,
                status: 'Settled'
            }], { session });
        });

        res.status(200).json({
            message: `Converted ${amount.toFixed(2)} ${fromCurrency} to ${received.toFixed(2)} ${toCurrency}`,
            transaction
        });
    } catch (err) {
        console.error('[convertCurrency]', err.message);
        res.status(err.status || 500).json({
            message: err.status ? err.message : 'Conversion failed. Please try again.'
        });
    } finally {
        session.endSession();
    }
};
exports.getTransactions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('email');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const docs = await Transaction.find({
            $or: [{ sender: user._id }, { recipientEmail: user.email }]
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('sender', 'name email')
            .lean();

        const history = docs.map((t) => {
            const isSender = t.sender && String(t.sender._id) === String(user._id);

            if (t.type === 'conversion') {
                return {
                    id: t._id,
                    kind: 'converted',
                    detail: `${t.currency} → ${t.toCurrency}`,
                    amount: t.amount,
                    currency: t.currency,
                    toAmount: t.toAmount,
                    toCurrency: t.toCurrency,
                    status: t.status,
                    createdAt: t.createdAt
                };
            }

            return {
                id: t._id,
                kind: isSender ? 'sent' : 'received',
                detail: isSender
                    ? `To ${t.recipientEmail}`
                    : `From ${t.sender ? t.sender.email : 'unknown'}`,
                amount: t.amount,
                currency: t.currency,
                status: t.status,
                createdAt: t.createdAt
            };
        });

        res.json(history);
    } catch (err) {
        console.error('[getTransactions]', err.message);
        res.status(500).json({ message: 'Could not load transaction history' });
    }
};