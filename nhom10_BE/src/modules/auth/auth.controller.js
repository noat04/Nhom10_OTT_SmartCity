const authService = require('./auth.service');

/**
 * Điều phối đăng ký tài khoản
 */
const register = async (req, res) => {
    try {
        // Tiếp nhận dữ liệu từ body của request
        const userData = req.body;

        // Gọi tầng Service để thực hiện nghiệp vụ lưu trữ [cite: 31]
        const newUser = await authService.registerCitizen(userData);

        // Trả về kết quả thành công (Status 201: Created)
        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản công dân thành công!",
            data: {
                id: newUser.id,
                full_name: newUser.full_name,
                phone_number: newUser.phone_number
            }
        });
    } catch (error) {
        // Trả về lỗi nếu có (ví dụ: số điện thoại đã tồn tại)
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Điều phối đăng nhập
 */
const login = async (req, res) => {
    try {
        const { phone_number, password } = req.body;

        // Kiểm tra sơ bộ dữ liệu đầu vào
        if (!phone_number || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ số điện thoại và mật khẩu!"
            });
        }

        // Gọi Service xử lý xác thực và tạo Token [cite: 4, 31]
        const result = await authService.login(phone_number, password);

        // Trả về Token và thônf g tin User (Status 200: OK)
        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công!",
            data: result
        });
    } catch (error) {
        // Lỗi đăng nhập thường trả về 401 (Unauthorized)
        return res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    register,
    login
};