const { Conversation, ConversationMember, User, Sequelize } = require('../../../models'); // Sequelize (MySQL)
const Message = require('../../../models/message'); // Mongoose (MongoDB)

class ChatService {
    // 1. Tìm hoặc tạo mới một cuộc trò chuyện 1-1 giữa 2 user
    async getOrCreateOneToOneConversation(user1Id, user2Id) {
        // Tìm các cuộc trò chuyện private mà user1 tham gia
        const user1Conversations = await ConversationMember.findAll({
            where: { userId: user1Id },
            attributes: ['conversationId']
        });
        const conversationIds = user1Conversations.map(c => c.conversationId);

        // Kiểm tra xem user2 có nằm trong số các conversation đó không
        const sharedConversation = await ConversationMember.findOne({
            where: {
                conversationId: conversationIds,
                userId: user2Id
            },
            include: [{
                model: Conversation,
                where: { type: 'private' },
                as: 'conversation' // Phải khớp với alias trong model associate
            }]
        });

        // Nếu đã từng chat, trả về conversation đó
        if (sharedConversation) {
            return sharedConversation.conversationId;
        }

        // Nếu chưa, tạo cuộc trò chuyện mới
        const newConversation = await Conversation.create({
            type: 'private',
            createdBy: user1Id
        });

        // Thêm cả 2 user vào phòng chat
        await ConversationMember.bulkCreate([
            { conversationId: newConversation.id, userId: user1Id, role: 'member' },
            { conversationId: newConversation.id, userId: user2Id, role: 'member' }
        ]);

        return newConversation.id;
    }

    // 2. Lưu tin nhắn vào MongoDB
    async saveMessage(data) {
        const { conversationId, senderId, content, type } = data;
        
        const newMessage = new Message({
            conversationId,
            senderId,
            content,
            type: type || 'text',
            status: 'sent'
        });

        await newMessage.save();
        return newMessage;
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

module.exports = new ChatService();