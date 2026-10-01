const express = require('express');
const router = express.Router();
const { getBalances, executeTransfer } = require('../controllers/walletController');
const protect = require('./authMiddleware');

router.get('/balances', protect, getBalances);
router.post('/transfer', protect, executeTransfer);

module.exports = router;
