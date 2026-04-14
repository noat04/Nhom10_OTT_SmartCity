// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Không cần định nghĩa id, MongoDB sẽ tự sinh trường _id (ObjectId)
  
  username: { 
    type: String, 
    required: [true, 'Vui lòng nhập username'], 
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Vui lòng nhập email'], 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: [true, 'Vui lòng nhập mật khẩu'],
    select: false 
  },
  phone: { 
    type: String,
    default: ""
  },
  fullName: { 
    type: String,
    required: [true, 'Vui lòng nhập họ tên'],
    default: ""
  },
  avatar: { 
    type: String,
    default: "" 
  },
  coverImage: { 
    type: String,
    default: ""
  },
  bio: { 
    type: String,
    default: ""
  },
  status: { 
    type: String, 
    enum: ['online', 'offline'], // (Tùy chọn) Ràng buộc các trạng thái
    default: 'offline' 
  },
  lastSeen: { 
    type: Date,
    default: Date.now
  },
  
  // --- THÊM DÀNH CHO JWT AUTHENTICATION FLOW ---
  refreshToken: {
    type: String,
    default: ""
  },

}, {
  timestamps: true // Tự động quản lý createdAt và updatedAt (thay thế cho việc Sequelize tự làm)
});

const User = mongoose.model('User', userSchema);
module.exports = User;
