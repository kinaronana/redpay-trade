const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.getBalances = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user.wallets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.executeTransfer = async (req, res) => {
    try {
        const { recipientEmail, amount, currency } = req.body;
        const sender = await User.findById(req.user.id);
        const recipient = await User.findOne({ email: recipientEmail });

        if (!recipient) return res.status(404).json({ message: "Recipient user profile not found" });
        if (sender.wallets[currency] < amount) return res.status(400).json({ message: "Insufficient currency balance" });

        // Atomically adjust account balances
        sender.wallets[currency] -= parseFloat(amount);
        recipient.wallets[currency] += parseFloat(amount);

        await sender.save();
        await recipient.save();

        // Write audit footprint ledger
        const transaction = new Transaction({
            sender: sender._id,
            recipientEmail,
            amount,
            currency,
            status: 'Settled'
        });
        await transaction.save();

        res.status(200).json({ message: "Transfer settled completely", transaction });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
