const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { verifyToken, authorize} = require('../../shared/middlewares/auth.middleware');

// Đường dẫn: GET /api/chat/:conversationId
// Ví dụ: /api/chat/15
router.get('/:conversationId', verifyToken, chatController.getChatHistory);
// Thêm vào file route hiện tại
router.post('/:conversationId/invite', verifyToken, authorize('OFFICIAL', 'ADMIN'), chatController.inviteMember);

module.exports = router;