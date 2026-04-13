// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Người nhận thông báo
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // 💡 Rất quan trọng: Đánh index vì bạn sẽ luôn query thông báo dựa trên userId
  },
  
  type: { 
    type: String, 
    enum: ['message', 'call', 'friend'], 
    required: true 
  },
  
  content: { 
    type: String, 
    required: true 
  },
  
  isRead: { 
    type: Boolean, 
    default: false 
  },

  // --- 💡 MẸO TỐI ƯU CHO APP CHAT (Tùy chọn) ---
  // Bạn nên có thêm 2 trường này để khi User click vào thông báo trên UI, 
  // app có thể điều hướng (navigate) họ tới đúng màn hình chat hoặc profile người gửi.
  /*
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Ai là người gửi tin nhắn/lời mời kết bạn này?
  },
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId // ID của tin nhắn, cuộc gọi, hoặc nhóm chat tương ứng
  }
  */

}, {
  // Trong Sequelize bạn dùng updatedAt: false, ở Mongoose bạn có thể thiết lập như sau:
  timestamps: { createdAt: true, updatedAt: false } 
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;