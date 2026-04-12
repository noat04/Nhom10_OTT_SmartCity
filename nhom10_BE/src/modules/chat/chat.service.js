const { Conversation, ConversationMember, User, Sequelize } = require('../../../models');
const Message = require('../../../models/message');

const { Op } = Sequelize;

class ChatService {

    async getOrCreateOneToOneConversation(user1Id, user2Id) {

        const user1Conversations = await ConversationMember.findAll({
            where: { userId: user1Id },
            attributes: ['conversationId']
        });

        const conversationIds = user1Conversations.map(c => c.conversationId);

        const sharedConversation = await ConversationMember.findOne({
            where: {
                conversationId: { [Op.in]: conversationIds },
                userId: user2Id
            },
            include: [{
                model: Conversation,
                where: { type: 'private' },
                as: 'conversation'
            }]
        });

        if (sharedConversation) {
            return sharedConversation.conversationId;
        }

        const newConversation = await Conversation.create({
            type: 'private',
            createdBy: user1Id
        });

        await ConversationMember.bulkCreate([
            { conversationId: newConversation.id, userId: user1Id },
            { conversationId: newConversation.id, userId: user2Id }
        ]);

        return newConversation.id;
    }

    async saveMessage(data) {
        const newMessage = new Message({
            ...data,
            type: data.type || 'text',
            status: 'sent'
        });

        await newMessage.save();
        return newMessage;
    }

    // async getConversationHistory(conversationId, limit = 50, skip = 0) {
    //     const messages = await Message.find({ conversationId })
    //         .sort({ createdAt: -1 })
    //         .skip(skip)
    //         .limit(limit);

    //     return messages.reverse();
    // }
    // Lấy lịch sử tin nhắn có phân trang
    async getConversationHistory(conversationId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        // Sắp xếp -1 (Mới nhất lên trước) để phân trang chính xác từ dưới lên
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);
        
        // Sau khi lấy được 1 cụm 20 tin nhắn, ta đảo ngược mảng lại 
        // để Frontend hiển thị đúng chiều thời gian (từ trên xuống dưới)
        return {
            messages: messages.reverse(),
            currentPage: page,
            hasMore: messages.length === limit // Nếu trả về đúng 20 tin, nghĩa là có thể còn trang sau
        };
    }

    async getUserConversations(currentUserId) {
        const user = await User.findByPk(currentUserId, {
            include: [{
                model: Conversation,
                as: 'conversations',
                include: [{
                    model: User,
                    as: 'members',
                    attributes: ['id', 'username', 'fullName', 'avatar', 'status'],
                    through: { attributes: [] }
                }]
            }],
            order: [[{ model: Conversation, as: 'conversations' }, 'updatedAt', 'DESC']]
        });

        if (!user || !user.conversations) return [];

        return user.conversations.map(conv => {
            const c = conv.get({ plain: true });

            if (c.type === 'private') {
                const partner = c.members.find(m => m.id !== currentUserId);
                if (partner) {
                    c.name = partner.fullName || partner.username;
                    c.avatar = partner.avatar;
                    c.isOnline = partner.status === 'online';
                }
            }

            return c;
        });
    }
}

module.exports = new ChatService();