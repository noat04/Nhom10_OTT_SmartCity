require('dotenv').config();
const express = require('express');
const logger = require('morgan');
const cors = require('cors');

// Middleware auth
const { verifyToken } = require('./shared/middlewares/auth.middleware');

// Routes modules
const authRoutes = require('./modules/auth/auth.route');
const chatRoutes = require('./modules/chat/chat.route');
const userRoutes = require('./modules/user/user.route');
const friendRoutes = require('./modules/friend/friend.route');
const uploadRoutes = require('./modules/upload/upload.route');
// MongoDB connection
//const connectMongoDB = require('./src/shared/configs/mongodb');

const app = express();

// ==========================================
// 1. MIDDLEWARES
// ==========================================
// const corsOptions = {
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);

//     const allowedOrigins = [
//       "http://localhost:5173",
//       "http://localhost:8081",
//       "http://192.168.40.27:8081",
//       "exp://192.168.40.27:8081",
//       "http://192.168.40.20:8081",
//       "exp://192.168.40.20:8081"
//     ];

//     if (
//       allowedOrigins.includes(origin) ||
//       origin.startsWith("http://192.168")
//     ) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// };
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
app.use('/api/friends', verifyToken, friendRoutes);
app.use('/api/upload', verifyToken, uploadRoutes);
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