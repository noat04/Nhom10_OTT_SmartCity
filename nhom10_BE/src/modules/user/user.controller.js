const User = require('../../../models/user');
const userService = require('./user.service');

const s3 = require('../../../config/s3');
const { PutObjectCommand } = require("@aws-sdk/client-s3");

class UserController {

    // ================= SEARCH USERS =================
    async searchUsers(req, res) {
        try {
            const keyword = req.query.search;
            const currentUserId = req.user.id;

            let condition = {
                _id: { $ne: currentUserId }
            };

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
            return res.status(500).json({
                success: false,
                message: "Lỗi tìm kiếm người dùng"
            });
        }
    }

    // ================= CHECK ONLINE =================
    async checkOnlineStatus(req, res) {
        try {
            const user = await User.findById(req.user.id).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy user"
                });
            }

            return res.json({ success: true, data: user });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Lỗi check online"
            });
        }
    }

    // ================= GET PROFILE =================
    async getProfile(req, res) {
        try {
            const result = await userService.getProfile(req.user.id);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
    }

    // ================= UPDATE PROFILE =================
    async updateProfile(req, res) {
        try {
            const result = await userService.updateProfile(req.user.id, req.body);
            return res.json(result);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
    }

    // ================= UPDATE AVATAR =================
    async updateAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Chưa chọn file"
                });
            }

            const file = req.file;

            const key = `avatars/${Date.now()}-${file.originalname}`;

            // 👉 upload lên S3
            await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype
            }));

            // 👉 tạo link
            const avatarUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

            const result = await userService.updateAvatar(req.user.id, avatarUrl);

            return res.json(result);

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    // ================= UPDATE COVER =================
    async updateCover(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Chưa chọn file"
                });
            }

            const file = req.file;

            const key = `covers/${Date.now()}-${file.originalname}`;

            await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype
            }));

            const coverUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

            const result = await userService.updateCover(req.user.id, coverUrl);

            return res.json(result);

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
}

module.exports = new UserController();