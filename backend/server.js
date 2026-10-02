const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db.js');

const app = express();

// --- CORS: allow only your deployed frontend (plus local dev) ---
const allowedOrigins = [
    'https://redpay-trade-2.onrender.com',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, health checks) and listed origins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Establish Primary Database Connection to MongoDB Atlas Cloud
connectDB();

// Register Main API Route Core Controllers
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));

// Health check: shows whether the database is connected
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'active',
        message: 'RedPay Trade Ledger Engine Running',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Error handler: returns JSON instead of hanging the request
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Port Assignment Runtime Mapping
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RedPay Engine] Server running in secure state on port ${PORT}`);
});