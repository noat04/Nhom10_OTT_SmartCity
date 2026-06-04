const User = require('../models/user');
const OTP = require('../models/otp.model');
const LoginLog = require('../models/loginLog');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { generateOTP } = require('../utils/otp');
const { sendOTP, sendWarningEmail } = require('../utils/mailer');
const {
    isValidEmail,
    checkDomain,
    isDisposable
} = require('../utils/emailValidator');

const socketUtil = require('../utils/socket');

class AuthService {

    // ================= VALIDATE EMAIL =================
    async validateEmail(email) {
        if (!isValidEmail(email)) {
            throw new Error("Email không hợp lệ");
        }

        if (isDisposable(email)) {
            throw new Error("Không chấp nhận email tạm");
        }

        const isDomainValid = await checkDomain(email);
        if (!isDomainValid) {
            throw new Error("Domain email không tồn tại");
        }
    }

    async sendOTPRegister(email) {
        if (!email) throw new Error("Thiếu email");

        await this.validateEmail(email);

        const existEmail = await User.findOne({ email });

        // 🔥 FIX: nếu user tồn tại nhưng đang bị lock → reset
        if (existEmail && !existEmail.isDeleted) {
            existEmail.otpAttempts = 0;
            existEmail.otpBlockedUntil = null;
            await existEmail.save();

            throw new Error("Email đã được sử dụng");
        }

        const otp = generateOTP();

        await OTP.deleteMany({ email });

        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp);

        return { success: true, message: "OTP đã gửi" };
    }

    async verifyRegister(data) {
        const { email, otp, password, username, fullName, phone } = data;

        const record = await OTP.findOne({ email, otp });

        if (!record) throw new Error("OTP không đúng");
        if (record.expiresAt < new Date()) throw new Error("OTP hết hạn");

        const existEmail = await User.findOne({ email });
        if (existEmail && !existEmail.isDeleted) throw new Error("Email đã tồn tại");
        if (existEmail?.isDeleted) await User.findByIdAndDelete(existEmail._id);

        const existUsername = await User.findOne({ username });
        if (existUsername && !existUsername.isDeleted) throw new Error("Username đã tồn tại");
        if (existUsername?.isDeleted) await User.findByIdAndDelete(existUsername._id);

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            email,
            password: hashedPassword,
            username,
            fullName,
            phone: phone || "",
            status: "offline"
        });

        await OTP.deleteMany({ email });

        return { success: true, user };
    }

    // ================= LOGIN =================
    async login(email, password, meta = {}) {
        if (!email || !password) {
            throw new Error("Thiếu email hoặc password");
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) throw new Error("Email không tồn tại");
        if (user.isDeleted) throw new Error("Tai khoan da bi xoa");

        if (user.isLocked) throw new Error(user.lockReason || "Tai khoan dang bi khoa");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error("Sai mật khẩu");

        // 🔥 Đá thiết bị cũ (optional)
        const io = socketUtil.getIO();
        io.to(user._id.toString()).emit("force_logout");

        // 🔥 Tạo token
        const tokenId = `${user._id}-${Date.now()}`;
        const token = jwt.sign(
            { id: user._id, tokenId },
            process.env.JWT_SECRET || "SmartCity_Nhom10_Secret_Key_2026",
            { expiresIn: '1d' }
        );

        user.currentToken = token;
        user.status = "online";
        await user.save();

        await LoginLog.create({
            userId: user._id,
            email: user.email,
            ip: meta.ip || "",
            userAgent: meta.userAgent || "",
            status: "success",
            tokenId
        });

        return {
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                bio: user.bio,
                avatar: user.avatar,
                role: user.role,
                isAdmin: user.role === 'admin'
            }
        };
    }

    // ================= LOGOUT =================
    async logout(userId) {
        const user = await User.findById(userId);

        user.currentToken = null;
        user.status = "offline";
        user.lastSeen = new Date();

        await user.save();

        return { success: true };
    }

    // ================= FORGOT PASSWORD =================
    async sendOTPReset(email) {
        if (!email) throw new Error("Thiếu email");

        await this.validateEmail(email);

        const user = await User.findOne({ email });
        if (!user) throw new Error("Email không tồn tại");

        // 🔥 CHECK LOCK (nhưng vẫn cho reset)
        if (user.otpBlockedUntil && user.otpBlockedUntil > Date.now()) {
            console.log("⚠️ User đang bị lock nhưng vẫn cho reset password");
        }

        // 🔥 RESET LOCK
        user.otpAttempts = 0;
        user.otpBlockedUntil = null;
        await user.save();

        // 🔥 CHỐNG SPAM (cooldown 60s)
        const lastOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (lastOTP && Date.now() - new Date(lastOTP.createdAt).getTime() < 60000) {
            throw new Error("Vui lòng chờ 60 giây trước khi gửi lại OTP");
        }

        const otp = generateOTP();

        // 🔥 XÓA OTP CŨ
        await OTP.deleteMany({ email });

        // 🔥 TẠO OTP MỚI
        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp, "OTP đặt lại mật khẩu");

        return {
            success: true,
            message: "OTP reset mật khẩu đã được gửi"
        };
    }

    async verifyOTPReset(email, otp) {
        const record = await OTP.findOne({ email, otp });

        if (!record) throw new Error("OTP không đúng");
        if (record.expiresAt < new Date()) throw new Error("OTP hết hạn");

        return { success: true };
    }

    async resetPassword(email, otp, newPassword) {
        const record = await OTP.findOne({ email, otp });

        if (!record) throw new Error("OTP không đúng");

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne({ email }, { password: hashedPassword });

        await OTP.deleteMany({ email });

        return { success: true };
    }
}

module.exports = new AuthService();
