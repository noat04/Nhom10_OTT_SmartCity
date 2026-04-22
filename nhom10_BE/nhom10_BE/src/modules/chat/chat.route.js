const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');

// SỬA DÒNG NÀY: Dùng destructuring { verifyToken } để lấy đúng hàm middleware
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

// Áp dụng middleware bắt buộc đăng nhập cho toàn bộ Chat API
router.use(verifyToken);

// Endpoint lấy conversation ID để chat 1-1
router.post('/init-1-1', chatController.initOneToOneChat);

// Endpoint lấy lịch sử tin nhắn của một phòng
router.get('/:conversationId/history', chatController.getHistory);

// Endpoint gửi tin nhắn
router.post('/message', chatController.sendMessageAPI);

// Endpoint lấy danh sách tất cả các phòng chat của user
router.get('/conversations', chatController.getConversations);

//Endpoint sửa, xóa tin nhắn
router.put("/message/edit", chatController.editMessage);
router.delete("/message/delete", chatController.deleteMessage);

//Reaction
router.post('/message/react', chatController.reactMessage);

//Tìm kiếm tin nhắn
router.get('/message/search', chatController.searchMessages);

//Ghim tin nhắn
router.post('/message/pin', chatController.pinMessage);
router.get('/message/pinned/:conversationId', chatController.getPinnedMessages);


module.exports = router;