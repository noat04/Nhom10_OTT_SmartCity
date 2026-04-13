const authService = require('./auth.service');
const { User } = require('../../../models');

class AuthController {
    async register(req, res) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công!',
                data: user
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
            }

            const data = await authService.login(email, password);
            res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công!',
                data
            });
        } catch (error) {
            res.status(401).json({ success: false, message: error.message });
        }
    }

    // Lấy thông tin cá nhân của người đang đăng nhập
    async getMe(req, res) {
        try {
            // req.user.id được lấy từ Auth Middleware
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password'] } // Không trả về mật khẩu
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
            }

            res.status(200).json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    }

    async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyOTP(email, otp);

            res.json({ success: true, ...result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async resendOTP(req, res) {
        try {
            const { email } = req.body;
            const result = await authService.resendOTP(email);

            res.json({ success: true, ...result });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new AuthController();