const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: "Access Denied. Token payload missing." });

    try {
        const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = verified;
        next(); // Proceed to the controller logic safely
    } catch (err) {
        res.status(400).json({ message: "Invalid Signature Token" });
    }
};
