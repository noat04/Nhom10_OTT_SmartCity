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

    // 3. Thêm thành viên mới
    return await db.ConversationUser.create({
        conversation_id: conversationId,
        user_id: newUserId,
        role: 'MEMBER' // Mặc định người được mời là Member
    });
};

module.exports = { addMemberToChat };