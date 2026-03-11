const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../../models'); // Tương tác với Relational DB

/**
 * Logic Đăng ký tài khoản Công dân
 * @param {Object} userData - Dữ liệu từ Controller
 */
const registerCitizen = async (userData) => {
    const { phone_number, password, full_name, location_id } = userData;

    // 1. Kiểm tra sự tồn tại của người dùng
    const existingUser = await db.User.findOne({ where: { phone_number } });
    if (existingUser) {
        throw new Error('Số điện thoại này đã được đăng ký hệ thống!');
    }

    // 2. Mã hóa mật khẩu bằng Bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Lưu User vào Database với quyền CITIZEN
    const newUser = await db.User.create({
        phone_number,
        password: hashedPassword,
        full_name,
        location_id,
        role: 'CITIZEN' // Mặc định là công dân
    });

    return newUser;
};

/**
 * Logic Đăng nhập & Phát hành Token
 * @param {String} phone_number
 * @param {String} password
 */
const login = async (phone_number, password) => {
    // 1. Tìm người dùng trong Database
    const user = await db.User.findOne({ where: { phone_number } });
    if (!user) {
        throw new Error('Thông tin đăng nhập không chính xác!');
    }

    // 2. So sánh mật khẩu đã mã hóa
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Thông tin đăng nhập không chính xác!');
    }

    // 3. Tạo JWT chứa thông tin định danh và phân quyền
    const payload = {
        id: user.id,
        role: user.role,
        department_id: user.department_id,
        location_id: user.location_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Trả về dữ liệu sạch (không kèm password)
    const { password: _, ...userInfo } = user.toJSON();
    return { user: userInfo, token };
};

module.exports = {
    registerCitizen,
    login
};