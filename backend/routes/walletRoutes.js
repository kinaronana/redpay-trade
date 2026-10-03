const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const {
    getBalances,
    executeTransfer,
    convertCurrency,
    getTransactions
} = require('../controllers/walletController');

// Login check: reads "Bearer <token>" and sets req.user.id
const requireAuth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;

    if (!token) return res.status(401).json({ message: 'Not authorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
};

router.get('/balances', requireAuth, getBalances);
router.get('/transactions', requireAuth, getTransactions);
router.post('/transfer', requireAuth, executeTransfer);
router.post('/convert', requireAuth, convertCurrency);

module.exports = router;