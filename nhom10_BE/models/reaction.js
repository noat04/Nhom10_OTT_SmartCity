const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    messageId: { type: String, required: true, index: true }, // ID của tin nhắn trong MongoDB
    userId: { type: String, required: true }, // UUID của User trong MySQL
    type: { type: String, enum: ['like', 'love', 'haha', 'sad', 'wow', 'angry'], required: true }
}, { 
    timestamps: { createdAt: true, updatedAt: false } 
});

module.exports = mongoose.model('Reaction', reactionSchema);