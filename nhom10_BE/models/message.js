const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        type: String,
        default: ""
    },

    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file', 'call', 'system'],
        default: 'text'
    },

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

    callInfo: {
        duration: { type: Number, default: 0 },
        status: { type: String, enum: ['ended', 'missed', 'rejected'] },
        callType: { type: String, enum: ['video', 'audio'] }
    },

    fileUrl: String,
    fileName: String,
    fileSize: Number,

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
                ref: 'User'
            },
            type: {
                type: String,
                enum: ['like', 'love', 'haha', 'sad', 'wow', 'angry']
            }
        }
    ],

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

    isUnsent: {
        type: Boolean,
        default: false
    },

    unsentAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);