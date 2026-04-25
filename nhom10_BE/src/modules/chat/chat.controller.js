const chatService = require("../chat/chat.service");
// 1. XÓA Import Sequelize và Op. Thay bằng import model Friend trực tiếp
const Friend = require("../../../models/friend");

class ChatController {
  async initOneToOneChat(req, res) {
    try {
      const { partnerId } = req.body;
      const myId = req.user.id; // Mongoose mặc định vẫn hỗ trợ req.user.id (trỏ tới _id)

      if (!partnerId) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu partnerId" });
      }

      // 2. CHUYỂN ĐỔI TỪ Sequelize sang cú pháp Mongoose ($or)
      const isFriend = await Friend.findOne({
        status: "accepted",
        $or: [
          { userId: myId, friendId: partnerId },
          { userId: partnerId, friendId: myId },
        ],
      });

      if (!isFriend) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Phải kết bạn trước khi tạo cuộc trò chuyện",
          });
      }

      const conversationId = await chatService.getOrCreateOneToOneConversation(
        myId,
        partnerId,
      );

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
      const { cursor, limit } = req.query;

      const result = await chatService.getConversationHistory(
        conversationId,
        cursor || null,
        parseInt(limit) || 20,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi khi tải lịch sử tin nhắn" });
    }
  }

  async getConversations(req, res) {
    try {
      const currentUserId = req.user.id;
      const conversations =
        await chatService.getUserConversations(currentUserId);

      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  async sendMessageAPI(req, res) {
    try {
      // 👉 SỬA DÒNG NÀY: Bổ sung thêm fileUrl, fileName, fileSize
      const {
        conversationId,
        content,
        type,
        fileUrl,
        fileName,
        fileSize,
        replyTo,
      } = req.body;
      const senderId = req.user.id;

      if (!conversationId) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu dữ liệu" });
      }

      // 👉 SỬA DÒNG NÀY: Gói ghém đầy đủ đồ đạc mang đi lưu
      const messageData = {
        conversationId,
        senderId,
        content,
        type,
        fileUrl, // Đưa link S3 vào đây
        fileName, // Đưa tên file vào
        fileSize, // Đưa dung lượng vào
        replyTo,
      };

      // 1. Save DB
      const savedMessage = await chatService.saveMessage(messageData);

      // 2. Emit realtime
      const socketUtil = require("../../shared/utils/socket");
      const io = socketUtil.getIO();

      io.to(conversationId.toString()).emit("newMessage", savedMessage);
      const memberIds =
        await chatService.getConversationMemberIds(conversationId);

      memberIds.forEach((memberId) => {
        io.to(memberId).emit("newMessage_global", savedMessage);
      });

      res.status(201).json({ success: true, data: savedMessage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  }

  //Sửa tin nhắn
  async editMessage(req, res) {
    try {
      const { messageId, content } = req.body;
      const userId = req.user.id;

      const msg = await chatService.editMessage(messageId, userId, content);

      // realtime
      const io = require("../../shared/utils/socket").getIO();
      io.to(msg.conversationId.toString()).emit("message_edited", msg);

      res.json({ success: true, data: msg });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  //Xóa tin nhắn
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.body;
      const userId = req.user.id;

      const msg = await chatService.deleteMessage(messageId, userId);

      const io = require("../../shared/utils/socket").getIO();
      io.to(msg.conversationId.toString()).emit("message_deleted", msg);

      res.json({ success: true, data: msg });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  //Reaction
  async reactMessage(req, res) {
    try {
      const { messageId, type } = req.body;
      const userId = req.user.id;

      const updated = await chatService.toggleReaction(messageId, userId, type);

      const io = require("../../shared/utils/socket").getIO();
      io.to(updated.conversationId.toString()).emit(
        "message_reaction",
        updated,
      );

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //Tìm kiếm tin nhắn
  async searchMessages(req, res) {
    try {
      const { conversationId, keyword } = req.query;

      if (!conversationId || !keyword) {
        return res.status(400).json({
          success: false,
          message: "Thiếu dữ liệu",
        });
      }

      const messages = await chatService.searchMessages(
        conversationId,
        keyword,
      );

      res.json({ success: true, data: messages });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //Ghim tin nhắn
  async pinMessage(req, res) {
    try {
      const { conversationId, messageId } = req.body;
      const userId = req.user.id;

      const updated = await chatService.pinMessage(
        conversationId,
        messageId,
        userId,
      );

      const io = require("../../shared/utils/socket").getIO();
      io.to(conversationId.toString()).emit("message_pinned", updated);

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getPinnedMessages(req, res) {
    const { conversationId } = req.params;

    const data = await chatService.getPinnedMessages(conversationId);

    res.json({
      success: true,
      data: data.pinnedMessages,
    });
  }
}

module.exports = new ChatController();
