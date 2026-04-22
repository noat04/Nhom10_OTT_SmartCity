const express = require('express');
const router = express.Router();

const userController = require('./user.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');
const upload = require('../../shared/middlewares/upload.middleware');

// ===== ROUTES =====

// search
router.get('/search', verifyToken, userController.searchUsers);

// status
router.get('/me/status', verifyToken, userController.checkOnlineStatus);

// profile
router.get('/profile', verifyToken, userController.getProfile);
router.get('/me', verifyToken, userController.getProfile);

// update text
router.put('/update', verifyToken, userController.updateProfile);

router.post('/avatar', verifyToken, upload.single('avatar'), userController.updateAvatar);
router.post('/cover', verifyToken, upload.single('cover'), userController.updateCover);

router.put('/avatar', verifyToken, upload.single('avatar'), userController.updateAvatar);
router.put('/cover', verifyToken, upload.single('cover'), userController.updateCover);

module.exports = router;