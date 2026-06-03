const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ======================================
// AUTH MIDDLEWARE
// ======================================
router.use(verifyToken);

// ======================================
// PRIVATE CHAT
// ======================================
router.post('/init-1-1', chatController.initOneToOneChat);
router.get('/conversations', chatController.getConversations);
router.get('/private/:partnerId/info', chatController.getPrivateUserInfo);

// ======================================
// MESSAGE APIs
// ======================================
router.post('/message', chatController.sendMessageAPI);

router.put('/message/edit', chatController.editMessage);
router.put('/message/unsend', chatController.unsendMessage);

router.delete('/message/delete', chatController.deleteMessage);
router.delete('/message/delete-for-me', chatController.deleteMessageForMe);

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

router.post('/group/dissolve', chatController.dissolveGroup);

router.put('/group/update-info', chatController.updateGroupInfo);

router.get('/group/:conversationId/members', chatController.getGroupMembers);

router.get('/group/:conversationId/info', chatController.getGroupInfo);

router.post('/group/promote-admin', chatController.promoteAdmin);

router.get('/group/:conversationId/invite', chatController.getGroupInvite);
router.post('/group/join/:token', chatController.joinGroupByInvite);

// ======================================
// HISTORY (KEEP LAST TO AVOID CONFLICT)
// ======================================
router.get('/:conversationId/history', chatController.getHistory);
module.exports = router;
