const chatService = require('../chat/chat.service');
const { Friend, Sequelize } = require('../../../models');
const { Op } = Sequelize;

class ChatController {

    async initOneToOneChat(req, res) {
        try {
            const { partnerId } = req.body;
            const myId = req.user.id;

            if (!partnerId) {
                return res.status(400).json({ success: false, message: "Thiếu partnerId" });
            }

            const isFriend = await Friend.findOne({
                where: {
                    status: 'accepted',
                    [Op.or]: [
                        { userId: myId, friendId: partnerId },
                        { userId: partnerId, friendId: myId }
                    ]
                }
            });

            if (!isFriend) {
                return res.status(403).json({ success: false, message: "Phải kết bạn trước" });
            }

            const conversationId = await chatService.getOrCreateOneToOneConversation(myId, partnerId);
            
            res.status(200).json({ success: true, data: { conversationId } });

        } catch (error) {
            console.error("Lỗi tạo chat:", error);
            res.status(500).json({ success: false, message: "Lỗi Server" });
        }
    }

    async getHistory(req, res) {
        try {
            const { conversationId } = req.params;
            const messages = await chatService.getConversationHistory(conversationId);
            
            res.status(200).json({ success: true, data: messages });

        } catch (error) {
            res.status(500).json({ success: false, message: "Lỗi load lịch sử" });
        }
    }

    async getConversations(req, res) {
        try {
            const currentUserId = req.user.id;
            const conversations = await chatService.getUserConversations(currentUserId);

            res.status(200).json({ success: true, data: conversations });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }

    async sendMessageAPI(req, res) {
        try {
            const { conversationId, content, type } = req.body;
            const senderId = req.user.id;

            if (!conversationId || !content) {
                return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
            }

            const messageData = { conversationId, senderId, content, type };

            // 1. Save DB
            const savedMessage = await chatService.saveMessage(messageData);

            // 2. Emit realtime (QUAN TRỌNG)
            const socketUtil = require('../../shared/utils/socket');
            const io = socketUtil.getIO();

            io.to(conversationId).emit('newMessage', savedMessage);

            res.status(201).json({ success: true, data: savedMessage });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }
}

module.exports = new ChatController();