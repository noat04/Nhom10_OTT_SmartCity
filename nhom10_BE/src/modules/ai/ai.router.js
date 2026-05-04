const express = require('express');
const router = express.Router();
const aiController = require('../ai/ai.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware'); // Middleware JWT của bạn

// Phải có verifyToken để lấy được req.user._id
router.post('/assistant', verifyToken, aiController.askAssistant);
router.post('/summarize', verifyToken, aiController.summarizeChat);

// 3 API mới bổ sung cho 4 trường hợp
router.get('/sessions', verifyToken, aiController.getAiSessions);
router.get('/messages/:sessionId', verifyToken, aiController.getAiMessagesBySession);
router.delete('/sessions/:sessionId', verifyToken, aiController.deleteAiSession);

module.exports = router;