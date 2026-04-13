// 1. Chỉ cần import trực tiếp Model User, xóa bỏ Sequelize và Op
const User = require('../../../models/user');

class UserController {
    async searchUsers(req, res) {
        try {
            const keyword = req.query.search;
            const currentUserId = req.user.id; // Lấy từ auth.middleware

            // 2. Chuyển đổi điều kiện cơ bản sang cú pháp MongoDB: $ne (Not Equal)
            let condition = {
                _id: { $ne: currentUserId } 
            };

            // 3. Nếu có nhập từ khóa (search)
            if (keyword) {
                // Chuyển đổi Op.or thành $or, và Op.like thành $regex (với options 'i' để không phân biệt hoa thường)
                condition.$or = [
                    { username: { $regex: keyword, $options: 'i' } },
                    { email: { $regex: keyword, $options: 'i' } },
                    { fullName: { $regex: keyword, $options: 'i' } }
                ];
            }

            // 4. Thực hiện truy vấn với Mongoose
            const users = await User.find(condition)
                .select('-password') // Bảo mật: Trừ trường password (dấu - phía trước)
                .limit(20);          // Giới hạn số lượng kết quả

            res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error("Lỗi search user:", error);
            res.status(500).json({ success: false, message: "Lỗi tìm kiếm người dùng" });
        }
    }

    async checkOnlineStatus(req, res) {
        try {
            const userId = req.user.id;
            
            // 5. Chuyển findByPk thành findById
            // Mình gắn thêm select('-password') để tránh rò rỉ password ra API
            const user = await User.findById(userId).select('-password');
            
            if (!user) {
                 return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
            }

            res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error("Lỗi check online status:", error);
            res.status(500).json({ success: false, message: "Lỗi check online status" });
        }
    }
}

module.exports = new UserController();