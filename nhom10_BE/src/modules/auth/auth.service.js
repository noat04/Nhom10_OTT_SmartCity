const User = require('../../../models/user'); // Nên viết hoa chữ U cho chuẩn tên file
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    // Đăng ký tài khoản mới
    async register(data) {
        const { username, email, password, fullName } = data;

        // 1. SỬA: Xóa chữ 'where'. Truyền thẳng { email } hoặc { username }
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] // Nên check trùng cả email lẫn username
        });
        
        if (existingUser) {
            throw new Error('Email hoặc Username này đã được sử dụng!');
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
            id: newUser._id, // Mongoose lưu ID ở trường _id
            email: newUser.email,
            username: newUser.username
        };
    }

    // Đăng nhập
    async login(email, password) {
        // 2. SỬA: Bỏ 'where' VÀ thêm .select('+password') để lấy mật khẩu ra đối chiếu
        const user = await User.findOne({ email }).select('+password');
        
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
            { id: user._id, email: user.email }, // Dùng user._id cho chuẩn MongoDB
            process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026', 
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Chuẩn bị data trả về (không trả về password)
        return {
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                avatar: user.avatar,
                status: user.status
            }
        };
    }
}

module.exports = new AuthService();