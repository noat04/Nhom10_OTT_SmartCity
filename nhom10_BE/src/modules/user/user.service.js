const User = require('../../../models/user');

class UserService {

    // ================= GET PROFILE =================
    // 👉 Lấy thông tin user (ẩn password)
    async getProfile(userId) {
        const user = await User.findById(userId).select('-password');

        if (!user) throw new Error("Không tìm thấy user");

        return { success: true, user };
    }

    // ================= UPDATE PROFILE =================
    // 👉 Chỉ update text (KHÔNG update email/password)
    async updateProfile(userId, data) {
        const updateData = {};

        if (data.fullName !== undefined) updateData.fullName = data.fullName;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.bio !== undefined) updateData.bio = data.bio;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        return { success: true, user };
    }

    // ================= UPDATE AVATAR =================
    // 👉 Lưu link avatar từ S3 vào DB
    async updateAvatar(userId, avatarUrl) {
        if (!avatarUrl) throw new Error("Avatar URL không hợp lệ");

        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        return { success: true, user };
    }

    // ================= UPDATE COVER =================
    // 👉 Lưu link cover từ S3 vào DB
    async updateCover(userId, coverUrl) {
        if (!coverUrl) throw new Error("Cover URL không hợp lệ");

        const user = await User.findByIdAndUpdate(
            userId,
            { coverImage: coverUrl },
            { new: true }
        ).select('-password');

        return { success: true, user };
    }
}

module.exports = new UserService();