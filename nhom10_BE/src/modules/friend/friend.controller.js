const Friend = require('../../../models/friend');
const User = require('../../../models/user'); // Import trực tiếp Model

class FriendController {
    // 1. Gửi yêu cầu kết bạn
    async sendFriendRequest(req, res) {
        try {
            const { receiverId } = req.body;
            const senderId = req.user.id;

            // 💡 QUAN TRỌNG: Thêm .toString() để so sánh chuẩn xác ObjectId
            if (senderId.toString() === receiverId.toString()) {
                return res.status(400).json({ success: false, message: "Không thể tự kết bạn với chính mình" });
            }

            // Kiểm tra xem đã từng gửi yêu cầu hoặc đã là bạn bè chưa
            // Chuyển đổi [Op.or] của SQL sang $or của MongoDB
            const existingFriendship = await Friend.findOne({
                $or: [
                    { userId: senderId, friendId: receiverId },
                    { userId: receiverId, friendId: senderId }
                ]
            });

            if (existingFriendship) {
                return res.status(400).json({ success: false, message: "Yêu cầu đã tồn tại hoặc đã là bạn bè" });
            }

            // Tạo request mới
            const newRequest = await Friend.create({
                userId: senderId,
                friendId: receiverId,
                status: 'pending'
            });

            res.status(201).json({ success: true, message: "Đã gửi lời mời kết bạn", data: newRequest });
        } catch (error) {
            console.error("Lỗi gửi kết bạn:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }

    // 2. Chấp nhận kết bạn
    async acceptFriendRequest(req, res) {
        try {
            const { requestId } = req.params;
            const currentUserId = req.user.id;

            // Đổi findByPk thành findById
            const request = await Friend.findById(requestId);

            if (!request) {
                return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu" });
            }

            // Đảm bảo chỉ người nhận mới được quyền chấp nhận
            // 💡 QUAN TRỌNG: Tiếp tục dùng .toString() ở đây
            if (request.friendId.toString() !== currentUserId.toString()) {
                return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện hành động này" });
            }

            // Cập nhật trạng thái
            request.status = 'accepted';
            await request.save(); // Mongoose vẫn hỗ trợ hàm .save() hệt như Sequelize nên bạn giữ nguyên đoạn này được

            res.status(200).json({ success: true, message: "Đã trở thành bạn bè" });
        } catch (error) {
            console.error("Lỗi chấp nhận kết bạn:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }
}

module.exports = new FriendController();