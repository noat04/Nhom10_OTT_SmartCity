const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  // Cuộc gọi này thuộc về đoạn chat nào
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Ai là người khởi xướng cuộc gọi
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Danh sách những người tham gia (Hỗ trợ cả gọi 1-1 và gọi nhóm)
  participants: [
    {
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        index: true // 👉 Thêm index để tối ưu tốc độ tìm kiếm lịch sử
      },
      status: {
        type: String,
        enum: ['invited', 'ringing', 'joined', 'left', 'missed', 'rejected'], // Bổ sung ringing và rejected
        default: 'invited'
      },
      joinTime: Date, // Tuỳ chọn: Thời điểm user này thực sự bấm bắt máy
      leaveTime: Date // Tuỳ chọn: Thời điểm user này thoát
    }
  ],

  //Loại cuộc gọi: video hay audio
  type: {
    type: String,
    enum: ['video', 'audio'],
    required: true
  },

  // Trạng thái tổng thể của toàn bộ cuộc gọi
  status: {
    type: String,
    enum: [
      'calling',    // Đang khởi tạo kết nối
      'ringing',    // Chuông đang reo ở phía người nhận
      'accepted',   // Đã có người bắt máy
      'connecting', // WebRTC đang thương lượng (ICE/SDP)
      'ongoing',    // Đang nói chuyện
      'ended',      // Kết thúc bình thường
      'rejected',   // Người nhận bấm từ chối
      'missed',     // Gọi nhưng không ai nghe máy
      'failed'      // Lỗi hệ thống/mạng (Tùy chọn thêm)
    ],
    default: 'calling'
  },

  startTime: Date, // Thời điểm cuộc gọi bắt đầu được tính giờ (khi chuyển sang ongoing)
  endTime: Date,   // Thời điểm cuộc gọi tắt

  duration: {
    type: Number, // Tính bằng giây
    default: 0    // 👉 Thêm default 0 để tránh undefined
  },

  // 👉 TÙY CHỌN: Lý do kết thúc (Giúp hiển thị thông báo chi tiết trên UI)
  endedReason: {
    type: String,
    enum: ['hung_up', 'timeout', 'network_error', 'declined'],
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);