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
}

module.exports = new UserController();