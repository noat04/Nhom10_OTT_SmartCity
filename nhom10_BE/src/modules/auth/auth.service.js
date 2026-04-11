const { User } = require('../../../models'); // Đường dẫn trỏ ra thư mục models gốc
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    // Đăng ký tài khoản mới
    async register(data) {
        const { username, email, password, fullName } = data;

        // Kiểm tra email hoặc username đã tồn tại chưa
        const existingUser = await User.findOne({ 
            where: { email } 
        });
        if (existingUser) {
            throw new Error('Email này đã được sử dụng!');
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo User mới
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            fullName,
            status: 'offline'
        });

        return {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username
        };
    }

    // Đăng nhập
    async login(email, password) {
        // Tìm user theo email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Email không tồn tại!');
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Mật khẩu không chính xác!');
        }

        // Tạo JWT Token
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