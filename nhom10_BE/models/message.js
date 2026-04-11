const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true, index: true }, // Lưu UUID dạng String
    senderId: { type: String, required: true }, // Lưu UUID dạng String
    content: { type: String },
    type: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
    fileUrl: { type: String },
    thumbnail: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    isDeleted: { type: Boolean, default: false }
}, { 
    timestamps: true // Tự động có createdAt, updatedAt
});

module.exports = mongoose.model('Message', messageSchema);