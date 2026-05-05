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
        default: ""
    },

    // 👉 Gộp type: Hỗ trợ 'call' (của bạn) và 'system' (của đồng nghiệp)
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file', 'call', 'system'],
        default: 'text'
    },

    // Tin nhắn hệ thống (từ nhánh đồng nghiệp)
    systemType: {
        type: String,
        enum: [
            'create_group',
            'add_member',
            'remove_member',
            'leave_group',
            'rename_group',
            'change_avatar',
            'promote_admin'
        ],
        default: null
    },

    // 👉 Lưu chi tiết cuộc gọi (từ nhánh của bạn)
    callInfo: {
        duration: { type: Number, default: 0 }, // Thời lượng tính bằng giây
        status: { type: String, enum: ['ended', 'missed', 'rejected'] },
        callType: { type: String, enum: ['video', 'audio'] }
    },

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

    deliveredTo: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            deliveredAt: Date
        }
    ],

    seenBy: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            seenAt: Date
        }
    ],

    reactions: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true // Giữ nguyên required: true cho an toàn dữ liệu
            },
            type: {
                type: String,
                enum: ['like', 'love', 'haha', 'sad', 'wow', 'angry'],
                required: true
            }
        }
    ],

    // Mảng nhắc tên người dùng (từ nhánh đồng nghiệp)
    mentions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],

    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },

    isEdited: {
        type: Boolean,
        default: false
    },

    editedAt: {
        type: Date,
        default: null
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    // Thu hồi tin nhắn (từ nhánh đồng nghiệp)
    isUnsent: {
        type: Boolean,
        default: false
    },

    unsentAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true // Tự động tạo createdAt, updatedAt
});

module.exports = mongoose.model('Message', messageSchema);