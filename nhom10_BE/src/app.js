var express = require('express');
var logger = require('morgan');
// var cors = require('cors'); // (Bạn cần chạy: npm install cors)
// Các route cần bảo mật (Protected)
const { verifyToken } = require('../src/shared/middlewares/auth.middleware');
const cors = require('cors');
const http = require('http'); // 1. BẮT BUỘC PHẢI IMPORT CÁI NÀY
// 1. IMPORT CÁC MODULE API CỦA BẠN (Theo cấu trúc Modular)
// Giả sử bạn đã tạo các file route trong thư mục src/modules/
const authRoutes = require('../src/modules/auth/auth.route');
// const connectMongoDB = require('../src/shared/configs/mongodb');
const chatRoutes = require('../src/modules/chat/chat.route');
const userRoutes = require('../src/modules/user/user.route');
const friendRoutes = require('../src/modules/friend/friend.route');
const uploadRoutes = require('../src/modules/upload/upload.route');


var app = express();
// Cấu hình cho phép Frontend gọi API
app.use(cors({
  origin: 'http://localhost:5173', // Địa chỉ Frontend Vite của bạn
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Cho phép gửi header chứa Token
  credentials: true // Bắt buộc bật dòng này nếu API có dùng Token/Cookie
}));
// ==========================================
// 2. MIDDLEWARES (Xử lý request đầu vào)
// ==========================================
// app.use(cors()); // Cho phép Mobile App và Web khác domain gọi API
app.use(logger('dev'));
app.use(express.json()); // Phân tích body chứa JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// GHI CHÚ: Đã XÓA phần view engine (pug) và thư mục static (public)
// vì đây là API thuần, không render giao diện HTML.

// ==========================================
// 3. ĐỊNH TUYẾN (ROUTING)
// ==========================================

// Route kiểm tra server
app.get('/', verifyToken,(req, res) => {
  res.json({
    success: true,
    message: "Chào mừng đến với API Hệ thống OTT Smart City Nhóm 10"
  });
});

// Gắn các API module vào tiền tố /api
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/upload', uploadRoutes); 
// ==========================================
// 4. XỬ LÝ LỖI (ERROR HANDLING CHO API)
// ==========================================

// Bắt lỗi 404 (Khi client gọi sai đường dẫn API)
app.use(function(req, res, next) {
  res.status(404).json({
    success: false,
    message: "Không tìm thấy API (404 Not Found)"
  });
});

// Bắt lỗi Global (Lỗi server 500 hoặc các lỗi khác)
app.use(function(err, req, res, next) {
  console.error(err.stack); // In lỗi ra terminal để dễ debug

  const status = err.status || 500;

  // Thay vì dùng res.render('error'), ta trả về JSON
  res.status(status).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ (Internal Server Error)",
    // Chỉ gửi chi tiết lỗi khi đang ở môi trường dev để bảo mật
    error: req.app.get('env') === 'development' ? err : {}
  });
});

// Gọi kết nối
// connectMongoDB();
module.exports = app;