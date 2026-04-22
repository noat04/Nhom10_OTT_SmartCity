const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../shared/middlewares/auth.middleware');
const uploadController = require('./upload.controller'); // Gọi controller mới tạo

// SỬA ĐỔI: Không dùng Multer nữa. 
// Chỉ cần một API đơn giản để cấp phát Presigned URL cho Frontend
router.post('/presigned-url', verifyToken, uploadController.getPresignedUrl);

module.exports = router;