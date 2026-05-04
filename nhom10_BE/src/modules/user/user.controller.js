const User = require('../../../models/user');
const userService = require('./user.service');

class UserController {

    async searchUsers(req, res) {
        try {
            const keyword = req.query.search;
            const currentUserId = req.user.id;

            let condition = { _id: { $ne: currentUserId } };

            if (keyword) {
                condition.$or = [
                    { username: { $regex: keyword, $options: 'i' } },
                    { email: { $regex: keyword, $options: 'i' } },
                    { fullName: { $regex: keyword, $options: 'i' } }
                ];
            }

            const users = await User.find(condition)
                .select('-password')
                .limit(20);

            return res.json({ success: true, data: users });

        } catch (error) {
            console.error("SEARCH ERROR:", error);
            return res.status(500).json({ success: false, message: "Lỗi tìm kiếm" });
        }
    }

    async checkOnlineStatus(req, res) {
        try {
            const { getOnlineUsers } = require('../../shared/utils/socket');

            const onlineUsers = getOnlineUsers();

            const isOnline = onlineUsers.has(req.user.id);

            return res.json({
                success: true,
                data: {
                    userId: req.user.id,
                    online: isOnline
                }
            });

        } catch (error) {
            return res.status(500).json({ success: false });
        }
    }

    async getProfile(req, res) {
        try {
            const result = await userService.getProfile(req.user.id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const result = await userService.updateProfile(req.user.id, req.body);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ success: false, message: err.message });
        }
    }

    // 🔥 AVATAR
    async updateAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Chưa chọn file"
                });
            }

            const result = await userService.updateAvatar(req.user.id, req.file);

            return res.json(result);

        } catch (err) {
            console.error("AVATAR ERROR:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    // 🔥 COVER
    async updateCover(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Chưa chọn file"
                });
            }

            const result = await userService.updateCover(req.user.id, req.file);

            return res.json(result);

        } catch (err) {
            console.error("COVER ERROR:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new UserController();