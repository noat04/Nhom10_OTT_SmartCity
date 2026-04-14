const User = require('../../../models/user');
const OTP = require('./otp.model');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { generateOTP } = require('../../shared/utils/otp');
const { sendOTP } = require('../../shared/utils/mailer');
const {
    isValidEmail,
    checkDomain,
    isDisposable
} = require('../../shared/utils/emailValidator');

const socketUtil = require('../../shared/utils/socket');
// ❌ XÓA dòng: const io = socketUtil.getIO();

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

    // ================= REGISTER =================
    async sendOTPRegister(email) {
        if (!email) throw new Error("Thiếu email");

        await this.validateEmail(email);

        const existEmail = await User.findOne({ email });
        if (existEmail) {
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
        if (existEmail) throw new Error("Email đã tồn tại");

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
    async sendOTPLogin(email, password) {
        const user = await User.findOne({ email }).select('+password');

        if (!user) throw new Error("Email không tồn tại");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error("Sai mật khẩu");

        const otp = generateOTP();

        await OTP.deleteMany({ email });

        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp);

        return { success: true };
    }

    async verifyLogin(email, otp) {
        const record = await OTP.findOne({ email, otp });

        if (!record) throw new Error("OTP sai");
        if (record.expiresAt < new Date()) throw new Error("OTP hết hạn");

        const user = await User.findOne({ email });

        // ✅ CHỈ LẤY IO KHI CẦN
        const io = socketUtil.getIO();

        // 🔥 Đá thiết bị cũ
        io.to(user._id.toString()).emit("force_logout");

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        user.currentToken = token;
        user.status = "online";
        await user.save();

        await OTP.deleteMany({ email });

        return { success: true, token };
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
        await this.validateEmail(email);

        const user = await User.findOne({ email });
        if (!user) throw new Error("Email không tồn tại");

        const otp = generateOTP();

        await OTP.deleteMany({ email });

        await OTP.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        await sendOTP(email, otp, "OTP đặt lại mật khẩu");

        return { success: true };
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