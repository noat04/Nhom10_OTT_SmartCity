// auth.controller.js

const OTP = require('./otp.model');
const User = require('./user.model.js');

const { generateOTP } = require('../../shared/utils/otp');
const { sendOTP } = require('../../shared/utils/mailer');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ==========================================
// REGISTER - SEND OTP
// ==========================================
const registerSendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const otp = generateOTP();

        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp);

        res.json({
            success: true,
            message: "OTP đã được gửi về email"
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// REGISTER - VERIFY OTP
// ==========================================
const registerVerifyOTP = async (req, res) => {
    try {
        const { email, otp, password, username, fullName } = req.body;

        const record = await OTP.findOne({ email, otp });

        if (!record) {
            return res.status(400).json({ message: "OTP không đúng" });
        }

        if (record.expiresAt < new Date()) {
            return res.status(400).json({ message: "OTP đã hết hạn" });
        }

        // check user tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            email,
            password: hashedPassword,
            username,
            fullName,
            isVerified: true
        });

        await OTP.deleteMany({ email });

        res.json({
            success: true,
            message: "Đăng ký thành công",
            user
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// LOGIN - SEND OTP
// ==========================================
const loginSendOTP = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Sai mật khẩu" });
        }

        const otp = generateOTP();

        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp);

        res.json({
            success: true,
            message: "OTP đã gửi"
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// LOGIN - VERIFY OTP
// ==========================================
const loginVerifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const record = await OTP.findOne({ email, otp });

        if (!record) {
            return res.status(400).json({ message: "OTP sai" });
        }

        if (record.expiresAt < new Date()) {
            return res.status(400).json({ message: "OTP hết hạn" });
        }

        const user = await User.findOne({ email });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026',
            { expiresIn: '1d' }
        );

        await OTP.deleteMany({ email });

        res.json({
            success: true,
            token
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// GET CURRENT USER
// ==========================================
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        res.json({
            success: true,
            user
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    registerSendOTP,
    registerVerifyOTP,
    loginSendOTP,
    loginVerifyOTP,
    getMe
};