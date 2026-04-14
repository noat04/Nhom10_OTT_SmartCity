const User = require('../../../models/user');
const { uploadFile, deleteFileByUrl } = require('../../../config/s3');

class UserService {

    async getProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw new Error("Không tìm thấy user");
        return { success: true, user };
    }

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

    // ================= AVATAR =================
    async updateAvatar(userId, file) {
        const user = await User.findById(userId);
        if (!user) throw new Error("User không tồn tại");

        console.log("OLD AVATAR:", user.avatar);

        // 🔥 XÓA ẢNH CŨ
        if (user.avatar) {
            await deleteFileByUrl(user.avatar);
        }

        // 🔥 UPLOAD MỚI
        const avatarUrl = await uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype
        );

        console.log("NEW AVATAR:", avatarUrl);

        user.avatar = avatarUrl;
        await user.save();

        return { success: true, user };
    }

    // ================= COVER =================
    async updateCover(userId, file) {
        const user = await User.findById(userId);
        if (!user) throw new Error("User không tồn tại");

        if (user.coverImage) {
            await deleteFileByUrl(user.coverImage);
        }

        const coverUrl = await uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype
        );

        user.coverImage = coverUrl;
        await user.save();

        return { success: true, user };
    }
}

module.exports = new UserService();