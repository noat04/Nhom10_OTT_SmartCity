const express = require('express');
const router = express.Router();
const friendController = require('./friend.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

router.use(verifyToken);

router.post('/request', friendController.sendFriendRequest);
router.put('/accept/:requestId', friendController.acceptFriendRequest);
router.get('/list', friendController.getFriends);
router.get('/requests', friendController.getFriendRequests);

module.exports = router;