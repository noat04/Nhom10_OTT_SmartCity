const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

// ======================================
// AUTH MIDDLEWARE
// ======================================
router.use(verifyToken);

// ======================================
// PRIVATE CHAT
// ======================================
router.post('/init-1-1', chatController.initOneToOneChat);
router.get('/conversations', chatController.getConversations);

// ======================================
// MESSAGE APIs
// ======================================
router.post('/message', chatController.sendMessageAPI);

router.put('/message/edit', chatController.editMessage);
router.put('/message/unsend', chatController.unsendMessage);

router.delete('/message/delete', chatController.deleteMessage);

router.post('/message/react', chatController.reactMessage);

router.get('/message/search', chatController.searchMessages);

router.post('/message/pin', chatController.pinMessage);
router.get('/message/pinned/:conversationId', chatController.getPinnedMessages);
router.post('/message/forward', chatController.forwardMessage);

// ======================================
// GROUP CHAT APIs
// ======================================
router.post('/group/create', chatController.createGroup);

router.post('/group/add-members', chatController.addMembers);

router.post('/group/remove-member', chatController.removeMember);

router.post('/group/leave', chatController.leaveGroup);

router.put('/group/update-info', chatController.updateGroupInfo);

router.get('/group/:conversationId/members', chatController.getGroupMembers);

router.get('/group/:conversationId/info', chatController.getGroupInfo);

router.post('/group/promote-admin', chatController.promoteAdmin);

// ======================================
// HISTORY (KEEP LAST TO AVOID CONFLICT)
// ======================================
router.get('/:conversationId/history', chatController.getHistory);
module.exports = router;