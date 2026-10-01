const mongoose = require('mongoose');

const connectDB = async () => {
    const targetURI = process.env.MONGO_URI;
    try {
        // Connect cleanly without throwing dynamic arguments
        const conn = await mongoose.connect(targetURI);
        console.log(`MongoDB Connected Safely: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database Connection Failed: ${error.message}`);
        process.exit(1); 
    }
};

module.exports = connectDB;
