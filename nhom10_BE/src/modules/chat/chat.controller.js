const chatService = require('../chat/chat.service');
// 1. XÓA Import Sequelize và Op. Thay bằng import model Friend trực tiếp
const Friend = require('../../../models/friend');

class ChatController {

    async initOneToOneChat(req, res) {
        try {
            const { partnerId } = req.body;
            const myId = req.user.id; // Mongoose mặc định vẫn hỗ trợ req.user.id (trỏ tới _id)

            if (!partnerId) {
                return res.status(400).json({ success: false, message: "Thiếu partnerId" });
            }

            // 2. CHUYỂN ĐỔI TỪ Sequelize sang cú pháp Mongoose ($or)
            const isFriend = await Friend.findOne({
                status: 'accepted',
                $or: [
                    { userId: myId, friendId: partnerId },
                    { userId: partnerId, friendId: myId }
                ]
            });

            if (!isFriend) {
                return res.status(403).json({ success: false, message: "Phải kết bạn trước khi tạo cuộc trò chuyện" });
            }

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
            
            // Lấy page và limit từ query param (VD: /api/chat/123/history?page=1&limit=20)
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await chatService.getConversationHistory(conversationId, page, limit);
            
            res.status(200).json({ 
                success: true, 
                data: result 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi khi tải lịch sử tin nhắn" });
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

    // async sendMessageAPI(req, res) {
    //     try {
    //         const { conversationId, content, type } = req.body;
    //         const senderId = req.user.id;

    //         if (!conversationId || !content) {
    //             return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
    //         }

    //         const messageData = { conversationId, senderId, content, type };

    //         // 1. Save DB
    //         const savedMessage = await chatService.saveMessage(messageData);

    //         // 2. Emit realtime (QUAN TRỌNG)
    //         const socketUtil = require('../../shared/utils/socket');
    //         const io = socketUtil.getIO();

    //         // 💡 LƯU Ý MONGODB: Ép kiểu conversationId về String để Socket.io hiểu đúng tên Room
    //         io.to(conversationId.toString()).emit('newMessage', savedMessage);

    //         res.status(201).json({ success: true, data: savedMessage });

    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ success: false, message: "Lỗi server" });
    //     }
    // }
    async sendMessageAPI(req, res) {
        try {
            // 👉 SỬA DÒNG NÀY: Bổ sung thêm fileUrl, fileName, fileSize
            const { conversationId, content, type, fileUrl, fileName, fileSize } = req.body;
            const senderId = req.user.id;

            if (!conversationId) {
                return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
            }

            // 👉 SỬA DÒNG NÀY: Gói ghém đầy đủ đồ đạc mang đi lưu
            const messageData = { 
                conversationId, 
                senderId, 
                content, 
                type,
                fileUrl,     // Đưa link S3 vào đây
                fileName,    // Đưa tên file vào
                fileSize     // Đưa dung lượng vào
            };

            // 1. Save DB
            const savedMessage = await chatService.saveMessage(messageData);

            // 2. Emit realtime
            const socketUtil = require('../../shared/utils/socket');
            const io = socketUtil.getIO();

            io.to(conversationId.toString()).emit('newMessage', savedMessage);

            res.status(201).json({ success: true, data: savedMessage });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }
    
}

module.exports = new ChatController();