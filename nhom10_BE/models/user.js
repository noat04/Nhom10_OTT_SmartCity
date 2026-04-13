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
    select: false // Cực kỳ quan trọng trong JWT Flow: Mặc định ẩn password khi query để không bị lộ
  },
  phone: { 
    type: String,
    default: ""
  },
  fullName: { 
    type: String,
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

  // --- THIẾT LẬP CÁC QUAN HỆ (ASSOCIATIONS) TRONG MONGODB ---

  // 1. Bạn bè & Lời mời kết bạn (Lưu thành mảng ObjectId)
  // friends: [{ 
  //   type: mongoose.Schema.Types.ObjectId, 
  //   ref: 'User' 
  // }],
  // friendRequests: [{ 
  //   type: mongoose.Schema.Types.ObjectId, 
  //   ref: 'User' 
  // }],

  // // 2. Hội thoại (Thay cho bảng trung gian ConversationMember)
  // conversations: [{ 
  //   type: mongoose.Schema.Types.ObjectId, 
  //   ref: 'Conversation' 
  // }]

  /* LƯU Ý VỀ THIẾT KẾ NOSQL:
    Với các dữ liệu phát sinh nhiều như Calls (Cuộc gọi), Notifications (Thông báo), 
    FileUploads (File đã tải lên), bạn KHÔNG NÊN lưu thành mảng ở đây vì sẽ làm phình to 
    User Document. 
    
    Cách xử lý đúng: Ở các Model Notification, Call, FileUpload... bạn sẽ tạo một 
    trường `userId` trỏ ngược lại về User Model (giống hệt khóa ngoại).
    Khi cần lấy thông báo của User, bạn chỉ cần gọi: 
    Notification.find({ userId: req.user.id })
  */

}, {
  timestamps: true // Tự động quản lý createdAt và updatedAt (thay thế cho việc Sequelize tự làm)
});

const User = mongoose.model('User', userSchema);
module.exports = User;