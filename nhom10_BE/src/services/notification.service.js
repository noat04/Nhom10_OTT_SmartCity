const Notification = require("../../models/notification");
const { getIO } = require("../shared/utils/socket");

class NotificationService {
  async createNotification({
    userId,
    senderId = null,
    type,
    content,
    data = {},
  }) {
    console.log("🔥 createNotification called:", {
      userId,
      senderId,
      type,
      content,
      data,
    });

    const notification = await Notification.create({
      userId,
      senderId,
      type,
      content,
      data,
    });

    console.log("✅ Notification created:", notification._id);

    const populatedNotification = await Notification.findById(notification._id)
      .populate("senderId", "username fullName email avatar");

    try {
      const io = getIO();

      io.to(userId.toString()).emit("new_notification", {
        success: true,
        data: populatedNotification,
      });

      console.log("✅ Socket emit to:", userId.toString());
    } catch (error) {
      console.error("❌ Socket emit lỗi:", error.message);
    }

    return populatedNotification;
  }

  async getNotifications(userId) {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "username fullName email avatar");
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      userId,
      isRead: false,
    });
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    ).populate("senderId", "username fullName email avatar");
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return true;
  }

  async deleteNotification(notificationId, userId) {
    return await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });
  }
}

module.exports = new NotificationService();