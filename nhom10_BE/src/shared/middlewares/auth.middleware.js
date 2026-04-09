const jwt = require('jsonwebtoken');
const { User } = require('../../../models'); // Đường dẫn trỏ đến file models/index.js (thay đổi số lượng ../ cho đúng với thư mục máy bạn)

/**
 * Middleware xác thực Token
 */
const verifyToken = async (req, res, next) => {
    try {
        // 1. Lấy token từ header "Authorization" (Định dạng: Bearer <token>)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // 2. Nếu không có token, trả về lỗi 401
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Bạn cần đăng nhập để thực hiện hành động này!"
            });
        }

        // 3. Xác thực token bằng mã bí mật JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026');

        // 4. [QUAN TRỌNG] Truy vấn CSDL để lấy thông tin mới nhất của User
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Tài khoản không tồn tại hoặc đã bị khóa!"
            });
        }

        // 5. Lưu toàn bộ object user vào req để các Controller phía sau sử dụng
        // Lúc này req.user đã có sẵn req.user.role, req.user.email... lấy trực tiếp từ DB
        req.user = user;

        // 6. Cho phép đi tiếp vào Controller
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Phiên đăng nhập hết hạn hoặc thẻ không hợp lệ!"
        });
    }
};

/**
 * Middleware phân quyền
 * Cách dùng: router.post('/delete', verifyToken, authorize('ADMIN', 'OFFICIAL'), controller.delete);
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Kiểm tra role của user (được lấy từ DB ở bước verifyToken) có nằm trong danh sách cho phép không
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền (Role) truy cập vào chức năng này!"
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorize
};