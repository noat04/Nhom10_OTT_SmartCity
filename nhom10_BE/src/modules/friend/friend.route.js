const express = require('express');
const router = express.Router();
const friendController = require('./friend.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

router.use(verifyToken);

router.post('/request', friendController.sendFriendRequest);
router.put('/accept/:requestId', friendController.acceptFriendRequest);

module.exports = router;