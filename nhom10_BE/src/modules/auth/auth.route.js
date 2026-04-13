const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

// Các API không cần đăng nhập
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

// Các API bắt buộc phải có Token hợp lệ
router.get('/me', verifyToken, authController.getMe);

module.exports = router;