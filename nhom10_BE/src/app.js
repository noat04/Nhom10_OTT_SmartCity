var express = require('express');
var logger = require('morgan');
// var cors = require('cors'); // (Bạn cần chạy: npm install cors)
// Các route cần bảo mật (Protected)
const { verifyToken } = require('../src/shared/middlewares/auth.middleware');

// 1. IMPORT CÁC MODULE API CỦA BẠN (Theo cấu trúc Modular)
// Giả sử bạn đã tạo các file route trong thư mục src/modules/
const authRoutes = require('../src/modules/auth/auth.route');
const reportRoutes = require('../src/modules/report/report.route');
const connectMongoDB = require('../src/shared/configs/mongodb');
const chatRoutes = require('../src/modules/chat/chat.route');

var app = express();

// ==========================================
// 2. MIDDLEWARES (Xử lý request đầu vào)
// ==========================================
// app.use(cors()); // Cho phép Mobile App và Web khác domain gọi API
app.use(logger('dev'));
app.use(express.json()); // Phân tích body chứa JSON
app.use(express.urlencoded({ extended: false }));

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
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);

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
connectMongoDB();
module.exports = app;