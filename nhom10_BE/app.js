require('dotenv').config();
const express = require('express');
const logger = require('morgan');
const cors = require('cors');

// Middleware auth
const { verifyToken } = require('./src/shared/middlewares/auth.middleware');

// Routes modules
const authRoutes = require('./src/modules/auth/auth.route');
const chatRoutes = require('./src/modules/chat/chat.route');
const userRoutes = require('./src/modules/user/user.route');
const friendRoutes = require('./src/modules/friend/friend.route');

// MongoDB connection
const connectMongoDB = require('./src/shared/configs/mongodb');

const app = express();

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors({
  origin: 'http://localhost:5173', // React Vite
  credentials: true
}));

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
app.use('/api/friends', verifyToken, friendRoutes);

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

// ==========================================
// 5. START SERVER (QUAN TRỌNG)
// ==========================================
const PORT = process.env.PORT || 3000;

// 👉 Chỉ start server khi DB connect OK
connectMongoDB()
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB error:", err);
  });

module.exports = app;