const User = require('../../../models/user');
const { uploadFile, deleteFileByUrl } = require('../../../config/s3');
const { getIO } = require('../../shared/utils/socket');

class UserService {

  async getProfile(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new Error("Không tìm thấy user");

    return { success: true, user };
  }

  // ================= UPDATE PROFILE =================
  async updateProfile(userId, data) {
    const updateData = {};

    // FULL NAME
    if (data.fullName !== undefined) {
      if (!data.fullName.trim()) {
        throw new Error("Tên không được để trống");
      }

      if (!/^[a-zA-ZÀ-ỹ\s]{2,50}$/.test(data.fullName)) {
        throw new Error("Tên không hợp lệ (2-50 ký tự)");
      }

      updateData.fullName = data.fullName.trim();
    }

    // PHONE
    if (data.phone !== undefined) {
      if (data.phone && !/^(0|\+84)[0-9]{9}$/.test(data.phone)) {
        throw new Error("Số điện thoại không hợp lệ");
      }

      updateData.phone = data.phone;
    }

    // BIO
    if (data.bio !== undefined) {
      if (data.bio.length > 150) {
        throw new Error("Bio tối đa 150 ký tự");
      }

      updateData.bio = data.bio.trim();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) throw new Error("User không tồn tại");

    // 🔥 REALTIME SYNC
    const io = getIO();
    io.to(user._id.toString()).emit("user_updated", { user });

    return { success: true, user };
  }

  // ================= AVATAR =================
  async updateAvatar(userId, file) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User không tồn tại");

    if (!file) {
      throw new Error("Vui lòng chọn ảnh");
    }

    // validate type
    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Chỉ chấp nhận file ảnh");
    }

    // validate size
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Ảnh tối đa 2MB");
    }

    // delete old
    if (user.avatar) {
      await deleteFileByUrl(user.avatar);
    }

    // upload new
    const avatarUrl = await uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    user.avatar = avatarUrl;
    await user.save();

    // 🔥 REALTIME SYNC
    const io = getIO();
    io.to(user._id.toString()).emit("user_updated", { user });

    return { success: true, user };
  }

  // ================= COVER =================
  async updateCover(userId, file) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User không tồn tại");

    if (!file) {
      throw new Error("Vui lòng chọn ảnh");
    }

    if (!file.mimetype.startsWith("image/")) {
      throw new Error("Chỉ chấp nhận ảnh");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ảnh cover tối đa 5MB");
    }

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

    // 🔥 REALTIME SYNC
    const io = getIO();
    io.to(user._id.toString()).emit("user_updated", { user });

    return { success: true, user };
  }
}

module.exports = new UserService();