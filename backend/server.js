const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');

const app = express();

// --- CORRECTION: Bulletproof CORS Configurations ---
app.use(cors({
    origin: "*", // Allows any frontend local port (5500, 3000, etc.) to connect
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Establish Primary Database Connection to MongoDB Atlas Cloud
connectDB();

// Register Main API Route Core Controllers
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));

// Basic Base Route Check for Network Pings
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "active", message: "RedPay Trade Ledger Engine Running" });
});

// Port Assignment Runtime Mapping
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[RedPay Engine] Server running in secure state on port ${PORT}`);
});
