const chatService = require("../chat/chat.service");
// 1. XÓA Import Sequelize và Op. Thay bằng import model Friend trực tiếp
const Friend = require('../../../models/friend');
const getMemberUserId = (member) => {
    const hasUserField = member && typeof member === "object" && "user" in member;
    const user = hasUserField ? member.user : member;
    if (!user) return null;
    if (typeof user === "object") return user._id || user.id || null;
    return user;
};

const emitConversationUpdatedToMembers = (io, conversation, payload = conversation) => {
    if (!conversation?.members) return;

    conversation.members.forEach((member) => {
        const userId = getMemberUserId(member);
        if (!userId) return;
        io.to(userId.toString()).emit("conversation_updated", payload);
    });
};

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
            const { cursor, limit } = req.query;
            const userId = req.user.id || req.user._id;

            const result = await chatService.getConversationHistory(
                conversationId,
                userId,
                cursor || null,
                parseInt(limit) || 20
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Lỗi khi tải lịch sử tin nhắn" });
        }
        // >>>>>>> origin/dam
    }
    //   }

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
    async getPrivateUserInfo(req, res) {
        try {
            const currentUserId = req.user.id || req.user._id;
            const { partnerId } = req.params;
            const data = await chatService.getPrivateUserInfo(currentUserId, partnerId);

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Loi lay thong tin nguoi chat:", error);
            res.status(400).json({
                success: false,
                message: error.message || "Khong the lay thong tin nguoi dung",
            });
        }
    }

    async sendMessageAPI(req, res) {
        try {
            // 👉 SỬA DÒNG NÀY: Bổ sung thêm fileUrl, fileName, fileSize
            const { conversationId, content, type, fileUrl, fileName, fileSize, replyTo, mentions, systemType } = req.body;
            const senderId = req.user.id;

            if (!conversationId) {
                return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
            }

            // 👉 SỬA DÒNG NÀY: Gói ghém đầy đủ đồ đạc mang đi lưu
            if (fileSize && Number(fileSize) > 10 * 1024 * 1024) {
                return res.status(400).json({
                    success: false,
                    message: "Khong gui duoc file tren 10MB"
                });
            }

            const messageData = {
                conversationId,
                senderId,
                content,
                type,
                fileUrl,     // Đưa link S3 vào đây
                fileName,    // Đưa tên file vào
                fileSize,     // Đưa dung lượng vào
                replyTo,
                mentions: mentions || [],
                systemType: systemType || null
            };

            // 1. Save DB
            const savedMessage = await chatService.saveMessage(messageData);
            console.log("📤 API EMIT NEW MESSAGE", savedMessage._id);
            // 2. Emit realtime
            const socketUtil = require('../../shared/utils/socket');
            const io = socketUtil.getIO();

            const Conversation = require('../../../models/conversation');

            const conv = await Conversation.findById(conversationId);

            io.to(conversationId.toString()).emit('newMessage', savedMessage);
            if (conv?.members) {
                conv.members.forEach((member) => {
                    const memberUserId = getMemberUserId(member);
                    if (!memberUserId) return;
                    io.to(memberUserId.toString()).emit("newMessage_global", savedMessage);
                });
            }

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
            const io = require('../../shared/utils/socket').getIO();
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

            const io = require('../../shared/utils/socket').getIO();
            io.to(msg.conversationId.toString()).emit("message_deleted", msg);

            res.json({ success: true, data: msg });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async deleteMessageForMe(req, res) {
        try {
            const { messageId } = req.body;
            const userId = req.user.id || req.user._id;

            const data = await chatService.deleteMessageForMe(messageId, userId);

            const io = require('../../shared/utils/socket').getIO();
            io.to(userId.toString()).emit("message_deleted_for_me", data);
            io.to(userId.toString()).emit("conversation_updated");

            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    //Reaction
    async reactMessage(req, res) {
        try {
            const { messageId, type, reactionType } = req.body;
            const userId = req.user.id;

            const updated = await chatService.toggleReaction(messageId, userId, type || reactionType);

            const io = require('../../shared/utils/socket').getIO();
            io.to(updated.conversationId.toString()).emit("message_reaction", updated);
            io.to(updated.conversationId.toString()).emit("message_reacted", updated);

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
                    message: "Thiếu dữ liệu"
                });
            }

            const messages = await chatService.searchMessages(conversationId, keyword);

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
                userId
            );

            const io = require('../../shared/utils/socket').getIO();
            io.to(conversationId.toString()).emit("message_pinned", updated);

            res.json({ success: true, data: updated });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async getPinnedMessages(req, res) {
        try {
            const conversationId = req.params.conversationId || req.body.conversationId;

            // Gọi xuống service để lấy data
            const data = await chatService.getPinnedMessages(conversationId);

            // 👉 ĐÃ SỬA DÒNG DƯỚI ĐÂY: Thêm data?.pinnedMessages || []
            return res.status(200).json({
                success: true,
                data: data?.pinnedMessages || [] // Nếu data bị null thì trả về mảng rỗng, không bị lỗi nữa
            });

        } catch (error) {
            console.error("Lỗi getPinnedMessages:", error);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        }
    }

    async forwardMessage(req, res) {
        try {
            const { originalMessageId, targetConversationIds } = req.body;
            const userId = req.user.id;

            if (!targetConversationIds || targetConversationIds.length === 0) {
                return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất 1 người/nhóm để chuyển tiếp" });
            }

            // Gọi Service (Bên trong Service đã tự lo việc lưu DB + Bắn Socket Realtime)
            const forwardedMessages = await chatService.forwardMessage(userId, originalMessageId, targetConversationIds);

            res.json({
                success: true,
                message: "Chuyển tiếp thành công",
                data: forwardedMessages
            });

        } catch (err) {
            console.log("Lỗi Forward Message:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
    //=============Chat Group=================
    async createGroup(req, res) {
        try {
            const { name, memberIds, avatar } = req.body;
            const adminId = req.user.id;

            if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Phải chọn ít nhất 1 thành viên"
                });
            }

            const group = await chatService.createGroupConversation(
                adminId,
                name,
                memberIds,
                avatar
            );

            const io = require('../../shared/utils/socket').getIO();

            io.to(group._id.toString()).emit("group_created", group);
            emitConversationUpdatedToMembers(io, group, group);

            res.json({
                success: true,
                data: group
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async addMembers(req, res) {
        try {
            const { conversationId, memberIds } = req.body;
            const adminId = req.user.id;

            const updated = await chatService.addMembersToGroup(
                conversationId,
                adminId,
                memberIds
            );

            const io = require('../../shared/utils/socket').getIO();

            io.to(conversationId.toString()).emit("group_members_added", updated);
            emitConversationUpdatedToMembers(io, updated, updated);

            res.json({
                success: true,
                data: updated
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async removeMember(req, res) {
        try {
            const { conversationId, memberId } = req.body;
            const adminId = req.user.id;

            const updated = await chatService.removeMemberFromGroup(
                conversationId,
                adminId,
                memberId
            );

            const io = require('../../shared/utils/socket').getIO();

            const payload = {
                conversationId,
                removedMemberId: memberId,
                group: updated,
            };

            io.to(conversationId.toString()).emit("group_member_removed", payload);
            io.to(memberId.toString()).emit("group_member_removed", payload);
            io.to(memberId.toString()).emit("conversation_updated", payload);
            emitConversationUpdatedToMembers(io, updated, updated);

            res.json({
                success: true,
                data: updated
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    // async leaveGroup(req, res) {
    //     try {
    //         const { conversationId } = req.body;
    //         const userId = req.user.id;

    //         const updated = await chatService.leaveGroup(conversationId, userId);

    //         const io = require('../../shared/utils/socket').getIO();

    //         io.to(conversationId.toString()).emit("group_left", updated);
    //         updated.members.forEach(m => {
    //             io.to(m.user._id.toString()).emit("conversation_updated");
    //         });

    //         res.json({
    //             success: true,
    //             data: updated
    //         });

    //     } catch (err) {
    //         res.status(500).json({
    //             success: false,
    //             message: err.message
    //         });
    //     }
    // }
    async leaveGroup(req, res) {
        try {
            const { conversationId } = req.body;
            const userId = req.user.id;

            const updated = await chatService.leaveGroup(conversationId, userId);
            const io = require('../../shared/utils/socket').getIO();

            if (updated) {
                // Nhóm vẫn còn người -> Báo cho những người ở lại
                io.to(conversationId.toString()).emit("group_left", updated);
                emitConversationUpdatedToMembers(io, updated, updated);

                // Báo cho chính người vừa rời đi biết để App của họ xóa nhóm đó khỏi màn hình
                io.to(userId.toString()).emit("conversation_updated");

                res.json({
                    success: true,
                    data: updated
                });
            } else {
                // Nhóm bị giải tán do người cuối cùng rời đi (updated = null)
                io.to(userId.toString()).emit("conversation_updated");
                res.json({
                    success: true,
                    message: "Nhóm đã được giải tán vì không còn thành viên nào."
                });
            }

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async dissolveGroup(req, res) {
        try {
            const { conversationId } = req.body;
            const adminId = req.user.id;

            const updated = await chatService.dissolveGroup(conversationId, adminId);
            const io = require('../../shared/utils/socket').getIO();
            const payload = {
                conversationId,
                group: updated,
                message: "Nhom da giai tan",
            };

            io.to(conversationId.toString()).emit("group_dissolved", payload);
            updated?.members?.forEach((member) => {
                const userId = getMemberUserId(member);
                if (!userId) return;
                io.to(userId.toString()).emit("group_dissolved", payload);
            });
            emitConversationUpdatedToMembers(io, updated, updated);

            res.json({
                success: true,
                data: updated,
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }

    async updateGroupInfo(req, res) {
        try {
            const { conversationId, name, avatar } = req.body;
            const adminId = req.user.id;

            const updated = await chatService.updateGroupInfo(
                conversationId,
                adminId,
                name,
                avatar
            );

            const io = require('../../shared/utils/socket').getIO();

            io.to(conversationId.toString()).emit("group_info_updated", updated);
            emitConversationUpdatedToMembers(io, updated, updated);

            res.json({
                success: true,
                data: updated
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async getGroupMembers(req, res) {
        try {
            const { conversationId } = req.params;

            const members = await chatService.getGroupMembers(conversationId);

            res.json({
                success: true,
                data: members
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async unsendMessage(req, res) {
        try {
            const { messageId } = req.body;
            const userId = req.user.id;

            const msg = await chatService.unsendMessage(messageId, userId);

            const io = require('../../shared/utils/socket').getIO();

            io.to(msg.conversationId.toString()).emit("message_unsent", msg);

            res.json({
                success: true,
                data: msg
            });

        } catch (err) {
            res.status(400).json({
                success: false,
                message: err.message
            });
        }
    }

    async getGroupInfo(req, res) {
        try {
            const { conversationId } = req.params;

            const group = await chatService.getGroupInfo(conversationId);

            res.json({
                success: true,
                data: group
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async promoteAdmin(req, res) {
        try {
            const { conversationId, targetUserId } = req.body;
            const currentAdminId = req.user.id;

            const updated = await chatService.promoteAdmin(
                conversationId,
                currentAdminId,
                targetUserId
            );

            const io = require('../../shared/utils/socket').getIO();

            io.to(conversationId.toString()).emit("group_admin_changed", updated);
            emitConversationUpdatedToMembers(io, updated, updated);

            res.json({
                success: true,
                data: updated
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    async getGroupInvite(req, res) {
        try {
            const { conversationId } = req.params;
            const adminId = req.user.id;

            const invite = await chatService.getGroupInvite(conversationId, adminId);
            res.json({ success: true, data: invite });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async joinGroupByInvite(req, res) {
        try {
            const { token } = req.params;
            const userId = req.user.id;

            const group = await chatService.joinGroupByInvite(token, userId);

            const io = require('../../shared/utils/socket').getIO();
            io.to(group._id.toString()).emit("group_members_added", group);
            emitConversationUpdatedToMembers(io, group, group);

            res.json({ success: true, data: group });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new ChatController();
