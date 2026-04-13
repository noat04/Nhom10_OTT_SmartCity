// models/Call.js
const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  // Người gọi
  callerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Đánh index để truy vấn lịch sử cuộc gọi nhanh hơn
  },
  
  // Người nhận
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },

  // 💡 MẸO TỐI ƯU CHO APP CHAT: Bạn nên bổ sung thêm trường conversationId.
  // Lý do: Các app chat thường hiển thị bong bóng "Cuộc gọi thoại - 5 phút" 
  // ngay bên trong khung chat (timeline). Có ID này sẽ giúp bạn dễ dàng kéo lịch sử.
  /*
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation' 
  },
  */

  type: { 
    type: String, 
    enum: ['video', 'audio'], 
    required: true 
  },
  
  status: { 
    type: String, 
    // Mình gợi ý thêm trạng thái 'missed' (gọi nhỡ) vì nó rất phổ biến trong thực tế
    enum: ['calling', 'accepted', 'rejected', 'ended', 'missed'], 
    default: 'calling' 
  },
  
  startTime: { 
    type: Date 
  },
  
  endTime: { 
    type: Date 
  }
}, {
  // Thay vì timestamps: false như ở Sequelize, bạn nên bật timestamps: true 
  // để tự động có createdAt (thời điểm bắt đầu đổ chuông/tạo record)
  timestamps: true 
});

const Call = mongoose.model('Call', callSchema);
module.exports = Call;