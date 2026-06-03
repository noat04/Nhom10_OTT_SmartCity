// models/FileUpload.js
const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // MỞ KHÓA 2 TRƯỜNG NÀY NGAY NHÉ!
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },

  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video', 'doc', 'file'], required: true },
  size: { type: Number, default: 0 } // Đặt default 0 cho an toàn nếu Frontend quên gửi size
}, {
  timestamps: true 
});

module.exports = mongoose.model('FileUpload', fileUploadSchema);