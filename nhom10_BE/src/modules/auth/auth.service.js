const { User } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 👉 import hàm gửi mail (bạn phải tạo file mailer.js trước)
const { sendOTP } = require('../../shared/utils/mailer');

class AuthService {

    // 🔥 TẠO OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // ================= REGISTER =================
    async register(data) {
        const { username, email, password, fullName } = data;

        // 1. Check email tồn tại
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('Email này đã được sử dụng!');
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Tạo OTP
        const otp = this.generateOTP();

        // 4. Tạo user (chưa verify)
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            fullName,
            status: 'offline',
            otp,
            otpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
            isVerified: false
        });

        // 5. Gửi OTP (nếu chưa làm mail thì console.log)
        try {
            await sendOTP(email, otp);
        } catch (err) {
            console.log("OTP (dev):", otp); // fallback dev
        }

        return {
            message: "Đăng ký thành công! Vui lòng nhập OTP để xác thực",
            email: newUser.email
        };
    }

    // ================= VERIFY OTP =================
    async verifyOTP(email, otp) {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw new Error("User không tồn tại");
        }

        if (user.isVerified) {
            throw new Error("Tài khoản đã xác thực rồi");
        }

        if (user.otp !== otp) {
            throw new Error("OTP không đúng");
        }

        if (new Date() > user.otpExpires) {
            throw new Error("OTP đã hết hạn");
        }

        // cập nhật
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;

        await user.save();

        return {
            message: "Xác thực OTP thành công!"
        };
    }

    // ================= RESEND OTP =================
    async resendOTP(email) {
        const user = await User.findOne({ where: { email } });

        if (!user) throw new Error("User không tồn tại");

        if (user.isVerified) {
            throw new Error("Tài khoản đã xác thực");
        }

        const otp = this.generateOTP();

        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        await user.save();

        try {
            await sendOTP(email, otp);
        } catch (err) {
            console.log("OTP (dev):", otp);
        }

        return {
            message: "OTP mới đã được gửi"
        };
    }

    // ================= LOGIN =================
    async login(email, password) {

        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw new Error('Email không tồn tại!');
        }

        // 🔒 CHẶN CHƯA VERIFY
        if (!user.isVerified) {
            throw new Error("Tài khoản chưa xác thực OTP!");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new Error('Mật khẩu không chính xác!');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'Secret_Key_Mac_Dinh',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                avatar: user.avatar
            }
        };
    }
}

module.exports = new AuthService();