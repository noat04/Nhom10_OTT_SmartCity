const mongoose = require("mongoose");
const NotificationService = require("../../services/notification.service");

class NotificationController {
  async getMyNotifications(req, res) {
    try {
      const userId = req.user.id || req.user._id;

      const notifications = await NotificationService.getNotifications(userId);

      return res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách thông báo:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id || req.user._id;

      const unreadCount = await NotificationService.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      console.error("Lỗi lấy số thông báo chưa đọc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
          success: false,
          message: "notificationId không hợp lệ",
        });
      }

      const notification = await NotificationService.markAsRead(
        notificationId,
        userId
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Đã đánh dấu đã đọc",
        data: notification,
      });
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id || req.user._id;

      await NotificationService.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        message: "Đã đánh dấu tất cả là đã đọc",
      });
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }

  async deleteNotification(req, res) {
    try {
      const userId = req.user.id || req.user._id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
          success: false,
          message: "notificationId không hợp lệ",
        });
      }

      const deleted = await NotificationService.deleteNotification(
        notificationId,
        userId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Đã xóa thông báo",
      });
    } catch (error) {
      console.error("Lỗi xóa thông báo:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  }
}

module.exports = new NotificationController();