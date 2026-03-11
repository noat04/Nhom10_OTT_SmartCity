const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực Token
 */
const verifyToken = (req, res, next) => {
    // 1. Lấy token từ header "Authorization" (Định dạng: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 2. Nếu không có token, trả về lỗi 401 (Unauthorized)
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Bạn cần đăng nhập để thực hiện hành động này!"
        });
    }

    try {
        // 3. Xác thực token bằng mã bí mật JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Lưu thông tin người dùng vào đối tượng req để các hàm sau sử dụng
        req.user = decoded;

        // 5. Cho phép đi tiếp vào Controller
        next();
    } catch (error) {
        // Nếu token hết hạn hoặc không hợp lệ, trả về lỗi 403 (Forbidden)
        return res.status(403).json({
            success: false,
            message: "Phiên đăng nhập hết hạn hoặc thẻ không hợp lệ!"
        });
    }
};

/**
 * Middleware phân quyền (Ví dụ: Chỉ ADMIN mới được vào)
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Kiểm tra xem role của user có nằm trong danh sách được phép không
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền truy cập vào chức năng này!"
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorize
};