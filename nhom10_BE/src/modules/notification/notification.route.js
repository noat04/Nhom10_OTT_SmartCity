const express = require("express");
const router = express.Router();
const notificationController = require("./notification.controller");
const { verifyToken } = require("../../shared/middlewares/auth.middleware");

router.use(verifyToken);

router.get("/", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.put("/read-all", notificationController.markAllAsRead);
router.put("/read/:notificationId", notificationController.markAsRead);
router.delete("/:notificationId", notificationController.deleteNotification);

module.exports = router;