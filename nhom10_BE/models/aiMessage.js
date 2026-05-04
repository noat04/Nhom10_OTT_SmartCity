const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiSession', required: true },
    role: { type: String, enum: ['user', 'model'], required: true }, // Gemini quy định 'user' là người, 'model' là AI
    content: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('AiMessage', aiMessageSchema);