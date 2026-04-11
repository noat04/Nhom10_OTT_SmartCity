// src/modules/chat/chat.controller.js
const Message = require('../../../models/message');
const chatService = require('./chat.service');
const socketIO = require('../../shared/utils/socket');

const getChatHistory = async (req, res) => {
    try {
        const { conversationId } = req.params;

        // Tìm tất cả tin nhắn của conversation này, sắp xếp từ cũ đến mới
        const messages = await Message.find({ conversation_id: conversationId })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Không thể lấy lịch sử chat!"
        });
    }
};

const inviteMember = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { newUserId } = req.body;
        const requesterId = req.user.id; // Lấy từ token

        const result = await chatService.addMemberToChat(conversationId, newUserId, requesterId);

        // --- REAL-TIME: Thông báo cho nhóm chat ---
        const io = socketIO.getIO();
        io.to(`room_${conversationId}`).emit('member-joined', {
            message: `Một thành viên mới đã được mời vào nhóm`,
            newUserId: newUserId
        });

        return res.status(200).json({
            success: true,
            message: "Đã thêm đồng nghiệp vào hỗ trợ!",
            data: result
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}
