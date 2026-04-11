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

    // Lấy danh sách tất cả phòng chat của một user
    async getUserConversations(currentUserId) {
        // Sử dụng Sequelize Include để tự động Join các bảng
        const userWithConversations = await User.findByPk(currentUserId, {
            include: [{
                model: Conversation,
                as: 'conversations', // Alias đã khai báo trong model User
                include: [{
                    model: User,
                    as: 'members', // Alias đã khai báo trong model Conversation
                    attributes: ['id', 'username', 'fullName', 'avatar', 'status', 'lastSeen'],
                    through: { attributes: [] } // Ẩn các cột thừa của bảng trung gian
                }]
            }],
            order: [[{ model: Conversation, as: 'conversations' }, 'updatedAt', 'DESC']] // Sắp xếp phòng chat mới nhất lên đầu
        });

        if (!userWithConversations || !userWithConversations.conversations) {
            return [];
        }

        // Định dạng lại dữ liệu trả về cho Frontend dễ xử lý
        const formattedConversations = userWithConversations.conversations.map(conv => {
            const plainConv = conv.get({ plain: true });

            // Phân loại và gán tên/ảnh hiển thị tùy theo loại phòng
            if (plainConv.type === 'private') {
                // Với chat 1-1, lấy thông tin người đối diện làm tên/ảnh phòng chat
                const partner = plainConv.members.find(m => m.id !== currentUserId);
                if (partner) {
                    plainConv.name = partner.fullName || partner.username;
                    plainConv.avatar = partner.avatar;
                    plainConv.isOnline = partner.status === 'online';
                }
            } else if (plainConv.type === 'group') {
                // Với nhóm, dùng tên/ảnh gốc của nhóm (Nếu null thì để mặc định)
                plainConv.name = plainConv.name || 'Nhóm chưa đặt tên';
                // plainConv.avatar = plainConv.avatar || 'link-anh-mac-dinh-cho-nhom';
            }

            return plainConv;
        });

        return formattedConversations;
    }
}

module.exports = { addMemberToChat };