const { User, Sequelize } = require('../../../models');
const { Op } = Sequelize;

class UserController {
    async searchUsers(req, res) {
        try {
            const keyword = req.query.search;
            const currentUserId = req.user.id; // Lấy từ auth.middleware

            // Điều kiện tìm kiếm cơ bản (Loại trừ bản thân)
            const condition = {
                id: { [Op.ne]: currentUserId }
            };

            // Nếu có nhập từ khóa (search)
            if (keyword) {
                condition[Op.or] = [
                    { username: { [Op.like]: `%${keyword}%` } },
                    { email: { [Op.like]: `%${keyword}%` } },
                    { fullName: { [Op.like]: `%${keyword}%` } }
                ];
            }

            const users = await User.findAll({
                where: condition,
                attributes: { exclude: ['password'] }, // Bảo mật: Không trả về password
                limit: 20 // Giới hạn số lượng kết quả
            });

            res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error("Lỗi search user:", error);
            res.status(500).json({ success: false, message: "Lỗi tìm kiếm người dùng" });
        }
    }
    async checkOnlineStatus(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findByPk(userId);
            res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error("Lỗi check online status:", error);
            res.status(500).json({ success: false, message: "Lỗi check online status" });
        }
    }
}

module.exports = new UserController();