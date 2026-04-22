const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

router.post('/register/send-otp', authController.registerSendOTP);
router.post('/register/verify', authController.registerVerifyOTP);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);

// 🔥 RESET PASSWORD
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;