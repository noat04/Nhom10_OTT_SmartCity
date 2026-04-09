const chatService = require('../chat/chat.service');

class ChatController {
    // API: Tạo hoặc lấy ID phòng chat 1-1
    async initOneToOneChat(req, res) {
        try {
            const { partnerId } = req.body;
            const myId = req.user.id;

            if (!partnerId) {
                return res.status(400).json({ success: false, message: "Thiếu partnerId" });
            }

            // [BẢO MẬT] Kiểm tra xem 2 người đã kết bạn chưa
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
                return res.status(403).json({ success: false, message: "Bạn phải kết bạn trước khi nhắn tin" });
            }

            // Gọi service để lấy hoặc tạo ID phòng chat 1-1
            const conversationId = await chatService.getOrCreateOneToOneConversation(myId, partnerId);
            
            res.status(200).json({ success: true, data: { conversationId } });
        } catch (error) {
            console.error("Lỗi tạo chat:", error);
            res.status(500).json({ success: false, message: "Lỗi Server" });
        }
    }

    // API: Lấy lịch sử tin nhắn
    async getHistory(req, res) {
        try {
            const { conversationId } = req.params;
            const messages = await chatService.getConversationHistory(conversationId);
            
            res.status(200).json({ messages });
        } catch (error) {
            res.status(500).json({ message: "Lỗi khi tải lịch sử tin nhắn" });
        }
    }

    // API: Gửi tin nhắn qua HTTP POST
    async sendMessageAPI(req, res) {
        try {
            const { conversationId, content, type } = req.body;
            const senderId = req.user.id;

            if (!conversationId || !content) {
                return res.status(400).json({ success: false, message: "Thiếu ID phòng chat hoặc nội dung" });
            }

            const messageData = { conversationId, senderId, content, type };
            
            // 1. Lưu vào MongoDB
            const savedMessage = await chatService.saveMessage(messageData);

            // 2. Kích hoạt Socket.io để phát tin nhắn cho người nhận ngay lập tức
            const socketUtil = require('../../shared/utils/socket');
            const io = socketUtil.getIO();
            io.to(conversationId).emit('receive_message', savedMessage);

            res.status(201).json({ success: true, data: savedMessage });
        } catch (error) {
            console.error("Lỗi gửi tin nhắn API:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }
}

module.exports = new ChatController();