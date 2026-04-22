const mongoose = require('mongoose');

const connectMongoDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;

        await mongoose.connect(mongoURI);

        console.log('🍃 MongoDB connected!');
    } catch (err) {
        console.error('❌ MongoDB error:', err.message);
        process.exit(1);
    }
};

module.exports = connectMongoDB;