const db = require('../../../models');

const addMemberToChat = async (conversationId, newUserId, requesterId) => {
    // 1. Kiểm tra người thực hiện (requesterId) có quyền trong phòng chat này không
    const requester = await db.ConversationUser.findOne({
        where: { conversation_id: conversationId, user_id: requesterId }
    });

    if (!requester || requester.role !== 'ADMIN') {
        throw new Error("Bạn không có quyền mời thêm thành viên vào nhóm này!");
    }

    // 2. Kiểm tra xem user mới đã có trong nhóm chưa
    const isExisted = await db.ConversationUser.findOne({
        where: { conversation_id: conversationId, user_id: newUserId }
    });

    if (isExisted) {
        throw new Error("Người này đã tham gia cuộc hội thoại rồi.");
    }

    // 3. Lấy lịch sử tin nhắn của một cuộc hội thoại
    async getConversationHistory(conversationId, limit = 50, skip = 0) {
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: -1 }) // Lấy mới nhất
            .skip(skip)
            .limit(limit);
        
        return messages.reverse(); // Đảo lại mảng để hiển thị từ trên xuống dưới
    }
}

module.exports = { addMemberToChat };