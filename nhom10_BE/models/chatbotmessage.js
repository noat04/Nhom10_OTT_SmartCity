const mongoose = require('mongoose');

const chatbotMessageSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // UUID của User trong MySQL
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { 
    timestamps: { createdAt: true, updatedAt: false } 
});

module.exports = mongoose.model('ChatbotMessage', chatbotMessageSchema);