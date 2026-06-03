const mongoose = require('mongoose');

const aiSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Cuộc trò chuyện mới' }, // Tự động tạo dựa trên câu hỏi đầu tiên
    assistantType: { type: String, default: 'public_service' }, // Phân loại bot (Dịch vụ công, Tóm tắt...)
}, { timestamps: true });

module.exports = mongoose.model('AiSession', aiSessionSchema);