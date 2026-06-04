require('dotenv').config();
const express = require('express');
const logger = require('morgan');
const cors = require('cors');

// Middleware auth
const { verifyToken } = require('./middlewares/auth.middleware');

// Routes
const authRoutes = require('./routes/auth.route');
const chatRoutes = require('./routes/chat.route');
const notificationRoutes = require('./routes/notification.route');
const userRoutes = require('./routes/user.route');
const friendRoutes = require('./routes/friend.route');
const uploadRoutes = require('./routes/upload.route');
const aiRoutes = require('./routes/ai.route');
const adminRoutes = require('./routes/admin.route');
// MongoDB connection
// const connectMongoDB = require('./config/mongodb');

const app = express();
app.use(cors({
  origin: true, // cho phép tất cả origin (Expo, mobile, web)
  credentials: true
}));

app.options("*", cors());
// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug ENV (test OTP mail)
console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);

// ==========================================
// 2. TEST SERVER
// ==========================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "🚀 API SmartCity đang hoạt động!"
  });
});

// ==========================================
// 3. ROUTES
// ==========================================

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/chat', verifyToken, chatRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/friend', verifyToken, friendRoutes);
app.use('/api/upload', verifyToken, uploadRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);
app.use('/api/ai', verifyToken, aiRoutes);
app.use('/api/admin', adminRoutes);
// Test auth
app.get('/api/test-auth', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "Bạn đã đăng nhập!",
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// ==========================================
// 4. ERROR HANDLING
// ==========================================

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "❌ API không tồn tại (404)"
  });
});

// Global error
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Lỗi server",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
