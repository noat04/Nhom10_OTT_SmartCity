const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản cho Người dân
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập và nhận JWT Token
 * @access  Public
 */
router.post('/login', authController.login);

module.exports = router;