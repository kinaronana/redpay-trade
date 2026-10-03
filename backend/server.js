const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db.js');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/rates', require('./routes/rateRoutes'));

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'active',
        message: 'RedPay Trade Ledger Engine Running',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve the frontend from the same server
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RedPay Engine] Server running on port ${PORT}`);
});