const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    // ID của cuộc hội thoại từ MySQL
    conversation_id: {
        type: Number,
        required: true,
        index: true // Đánh index để tìm kiếm lịch sử chat nhanh hơn
    },
    // ID người gửi từ MySQL
    sender_id: {
        type: Number,
        required: true
    },
    sender_name: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Loại tin nhắn: văn bản, hình ảnh, hoặc file đính kèm
    type: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);