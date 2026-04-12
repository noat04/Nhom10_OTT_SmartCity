const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

// Cấu hình Multer lưu file vào thư mục public/uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Đổi tên file để không bị trùng (Thêm timestamp)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// API: POST /api/upload
router.post('/', verifyToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Không tìm thấy file" });
        }

        // Tạo URL đường dẫn tĩnh để Frontend có thể lấy ảnh/file về hiển thị
        // (Lưu ý phải bật tính năng phục vụ file tĩnh trong app.js)
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        res.status(200).json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Lỗi upload:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi upload file" });
    }
});

module.exports = router;