const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { verifyToken, authorize } = require('../../shared/middlewares/auth.middleware');

// Chỉ công dân (CITIZEN) mới được gửi báo cáo
router.post('/', verifyToken, authorize('CITIZEN'), reportController.postReport);

module.exports = router;