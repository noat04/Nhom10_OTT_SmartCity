// models/Friend.js
const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  // Người gửi lời mời kết bạn (sender)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Người nhận lời mời kết bạn (receiver)
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true // Tự động có createdAt (ngày gửi lời mời) và updatedAt (ngày chấp nhận/chặn)
});

// Đảm bảo rằng User A chỉ có thể gửi 1 lời mời cho User B (Không tạo ra nhiều bản ghi trùng lặp)
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);
module.exports = Friend;