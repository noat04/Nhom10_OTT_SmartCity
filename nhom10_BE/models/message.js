const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // 1. Chuyển từ String sang ObjectId và thêm 'ref'
    conversationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Conversation', // Tham chiếu đến Model Conversation
        required: true, 
        index: true // Bạn giữ index ở đây là RẤT CHUẨN, vì ta sẽ query tin nhắn theo nhóm chat liên tục
    },
    
    // 2. Chuyển từ String sang ObjectId và thêm 'ref'
    senderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Tham chiếu đến Model User
        required: true 
    },
    
    content: { 
        type: String,
        default: "" // Nên có default để tránh lỗi undefined khi user chỉ gửi ảnh/file mà không kèm text
    },
    
    type: { 
        type: String, 
        enum: ['text', 'image', 'video', 'file'], 
        default: 'text' 
    },
    
    // Bên trong file schema Message của Mongoose (Backend)
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
    
    thumbnail: { 
        type: String,
        default: "" 
    },
    
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'seen'], 
        default: 'sent' 
    },
    reactions: [
        {
            userId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User', 
                required: true 
            },
            type: { 
                type: String, 
                enum: ['like', 'love', 'haha', 'sad', 'wow', 'angry'], 
                required: true 
            }
        }
    ],
    
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true // Tự động tạo createdAt, updatedAt
});

module.exports = mongoose.model('Message', messageSchema);