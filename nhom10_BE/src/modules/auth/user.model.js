const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    phone: String,
    fullName: String,
    avatar: String,
    coverImage: String,
    bio: String,

    status: { type: String, default: 'offline' },
    lastSeen: Date,

    // OTP
    otp: String,
    otpExpires: Date,
    isVerified: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);