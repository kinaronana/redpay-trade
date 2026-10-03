const express = require('express');
const router = express.Router();
const { getRates } = require('../services/rates');

router.get('/', async (req, res) => {
    const data = await getRates();
    res.json({
        base: 'USD',
        ...data,
        feePercent: Number(process.env.CONVERSION_FEE_PERCENT) || 0
    });
});

module.exports = router;