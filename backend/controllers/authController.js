const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log(`[Diagnostic] Registration request received for email: ${email}`);

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User profile already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email, password: hashedPassword });
        
        // This is the line attempting to save to MongoDB Atlas
        await user.save();
        console.log(`[Diagnostic] User successfully saved to MongoDB Atlas!`);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { name: user.name, email: user.email } });
    } catch (err) {
        // CRITICAL FIX: This line will finally print the real error to your CMD terminal
        console.error("❌ CRITICAL BACKEND ERROR IN REGISTER:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials recorded" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials recorded" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ token, user: { name: user.name, email: user.email } });
    } catch (err) {
        console.error("❌ CRITICAL BACKEND ERROR IN LOGIN:", err);
        res.status(500).json({ error: err.message });
    }
};
