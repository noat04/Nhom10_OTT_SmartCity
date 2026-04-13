const express = require('express');
const router = express.Router();

// Import controller
const authController = require('./auth.controller');

// Middleware xác thực
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

// ==========================================
// PUBLIC ROUTES (KHÔNG CẦN LOGIN)
// ==========================================

// Đăng ký
router.post('/register/send-otp', authController.registerSendOTP);
router.post('/register/verify', authController.registerVerifyOTP);

// Đăng nhập
router.post('/login/send-otp', authController.loginSendOTP);
router.post('/login/verify', authController.loginVerifyOTP);

// ==========================================
// PROTECTED ROUTES (CẦN TOKEN)
// ==========================================

// Lấy thông tin user hiện tại
router.get('/me', verifyToken, authController.getMe);

// ==========================================

module.exports = router;