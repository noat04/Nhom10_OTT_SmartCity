const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    name: {
        type: String,
        default: ""
    },
    avatar: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    inviteToken: {
        type: String,
        default: ""
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    settings: {
        onlyAdminCanEdit: { type: Boolean, default: true },
        onlyAdminCanSend: { type: Boolean, default: false }
    },
    members: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['admin', 'member'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    pinnedMessages: [
        {
            message: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Message'
            },
            pinnedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            pinnedAt: Date
        }
    ],
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);
