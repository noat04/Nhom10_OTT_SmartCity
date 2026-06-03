const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

router.post('/assistant', aiController.askAssistant);
router.post('/summarize', aiController.summarizeChat);
router.get('/sessions', aiController.getAiSessions);
router.get('/messages/:sessionId', aiController.getAiMessagesBySession);
router.delete('/sessions/:sessionId', aiController.deleteAiSession);

module.exports = router;
