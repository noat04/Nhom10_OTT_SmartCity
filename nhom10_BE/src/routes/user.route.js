const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

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
router.put('/password', verifyToken, userController.updatePassword);

router.post('/avatar', verifyToken, upload.single('avatar'), userController.updateAvatar);
router.post('/cover', verifyToken, upload.single('cover'), userController.updateCover);

router.put('/avatar', verifyToken, upload.single('avatar'), userController.updateAvatar);
router.put('/cover', verifyToken, upload.single('cover'), userController.updateCover);

router.delete('/me', verifyToken, userController.deleteMe);

module.exports = router;
