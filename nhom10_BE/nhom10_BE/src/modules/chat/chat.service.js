const Conversation = require('../../../models/conversation');
const Message = require('../../../models/message');
const User = require('../../../models/user');
// Thêm dòng này lên đầu file chat.service.js nếu chưa có
const FileUpload = require('../../../models/fileupload');
const mongoose = require("mongoose");
class ChatService {

    // 1. LẤY HOẶC TẠO CUỘC HỘI THOẠI 1-1
    async getOrCreateOneToOneConversation(user1Id, user2Id) {
        // Tìm cuộc hội thoại private có chứa CẢ 2 user trong mảng members
        const sharedConversation = await Conversation.findOne({
            type: 'private',
            'members.user': { $all: [user1Id, user2Id] }, // $all: Yêu cầu phải có mặt cả 2 ID
            members: { $size: 2 } // $size: Đảm bảo chỉ có đúng 2 thành viên
        });

        if (sharedConversation) {
            return sharedConversation._id; // Trả về _id theo chuẩn MongoDB
        }

        // Nếu chưa có thì tạo mới (Gộp luôn việc insert User vào mảng trong 1 thao tác duy nhất)
        const newConversation = await Conversation.create({
            type: 'private',
            createdBy: user1Id,
            members: [
                { user: user1Id, role: 'member' },
                { user: user2Id, role: 'member' }
            ]
        });

        return newConversation._id;
    }


    // ==============================
    // 2. SAVE MESSAGE (FULL FEATURE)
    // ==============================
    async saveMessage(data) {
        const newMessage = await Message.create({
            ...data,
            status: 'sent',
            replyTo: data.replyTo || null // ✅ thêm reply
        });

        await Conversation.findByIdAndUpdate(data.conversationId, {
            latestMessage: newMessage._id
        });

        // FILE upload (giữ nguyên)
        if (data.fileUrl) {
            let fileExtType = 'file';
            if (data.type === 'image') fileExtType = 'image';
            else if (data.type === 'video') fileExtType = 'video';

            await FileUpload.create({
                uploaderId: data.senderId,
                messageId: newMessage._id,
                conversationId: data.conversationId,
                fileName: data.fileName || 'file',
                fileUrl: data.fileUrl,
                fileType: fileExtType,
                size: data.fileSize || 0
            });
        }

        // ✅ populate reply
        return await Message.findById(newMessage._id)
            .populate('senderId', 'fullName avatar')
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'senderId',
                    select: 'fullName avatar'
                }
            });
    }

    // ==============================
    // 3. GET HISTORY (FIX REPLY)
    // ==============================
    async getConversationHistory(conversationId, cursor = null, limit = 20) {
        let query = { conversationId };

        // 🔥 Nếu có cursor → lấy tin cũ hơn
        if (cursor) {
            const cursorMessage = await Message.findById(cursor);

            // 🔥 FIX: nếu cursor sai → throw luôn
            if (!cursorMessage) {
                throw new Error("Cursor không hợp lệ");
            }

            // 🔥 FIX: thêm _id để tránh trùng timestamp
            query.$or = [
                { createdAt: { $lt: cursorMessage.createdAt } },
                {
                    createdAt: cursorMessage.createdAt,
                    _id: { $lt: cursorMessage._id }
                }
            ];
        }

        const messages = await Message.find(query)
            .populate('senderId', 'fullName avatar')
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'senderId',
                    select: 'fullName avatar'
                }
            })
            .sort({ createdAt: -1 }) // mới → cũ
            .limit(limit);

        const hasMore = messages.length === limit;

        return {
            messages: messages.reverse(),
            nextCursor: hasMore ? messages[messages.length - 1]._id : null,
            hasMore
        };
    }

    // ==============================
    // 4. GET CONVERSATIONS
    // ==============================
    async getUserConversations(userId) {
        const conversations = await Conversation.find({
            'members.user': userId
        })
            .populate('members.user', 'fullName avatar status')
            .populate('latestMessage')
            .sort({ updatedAt: -1 })
            .lean();

        return conversations.map(c => {
            if (c.type === 'private') {
                const partner = c.members.find(
                    m => m.user._id.toString() !== userId.toString()
                )?.user;

                if (partner) {
                    c.name = partner.fullName;
                    c.avatar = partner.avatar;
                }
            }
            return c;
        });
    }


    // 5. THÊM HOẶC CẬP NHẬT REACTION VÀO MẢNG
    async addOrUpdateReaction(messageId, userId, type) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Tin nhắn không tồn tại!");

        // 1. Tìm xem user đã thả cảm xúc vào tin nhắn này chưa (Duyệt mảng trực tiếp)
        const existingReactionIndex = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString()
        );

        if (existingReactionIndex !== -1) {
            if (message.reactions[existingReactionIndex].type === type) {
                // Kịch bản A: Bấm lại cảm xúc cũ -> Hủy (Xóa khỏi mảng)
                message.reactions.splice(existingReactionIndex, 1);
            } else {
                // Kịch bản B: Đổi cảm xúc khác -> Cập nhật trực tiếp phần tử trong mảng
                message.reactions[existingReactionIndex].type = type;
            }
        } else {
            // Kịch bản C: Chưa từng thả -> Push bản ghi mới vào mảng
            message.reactions.push({ userId, type });
        }

        await message.save();

        // Trả về mảng reactions mới nhất để Socket.io phát đi cho client
        return message.reactions;
    }

    // ==============================
    // 5. SEEN
    // ==============================
    async markAsSeen(conversationId, userId) {
        await Message.updateMany(
            {
                conversationId,
                senderId: { $ne: userId },
                status: { $ne: 'seen' }
            },
            {
                status: 'seen',
                $push: {
                    seenBy: {
                        userId,
                        seenAt: new Date()
                    }
                }
            }
        );
    }

    //Sửa tin nhắn
    async editMessage(messageId, userId, content) {
        const message = await Message.findById(messageId);

        if (!message) throw new Error("Message not found");

        // chỉ cho sửa tin của mình
        if (message.senderId.toString() !== userId.toString()) {
            throw new Error("Không có quyền sửa");
        }

        message.content = content;
        message.isEdited = true;

        await message.save();

        return await message.populate('senderId', 'fullName avatar');
    }

    async deleteMessage(messageId, userId) {
        const message = await Message.findById(messageId);

        if (!message) throw new Error("Message not found");

        if (message.senderId.toString() !== userId.toString()) {
            throw new Error("Không có quyền xóa");
        }

        message.content = "Tin nhắn đã bị xóa";
        message.isDeleted = true;

        await message.save();

        return message;
    }

    async toggleReaction(messageId, userId, type) {
        const message = await Message.findById(messageId);

        if (!message) throw new Error("Message not found");

        const existing = message.reactions.find(
            r => r.userId.toString() === userId.toString()
        );

        if (existing) {
            if (existing.type === type) {
                message.reactions = message.reactions.filter(
                    r => r.userId.toString() !== userId.toString()
                );
            } else {
                existing.type = type;
            }
        } else {
            message.reactions.push({ userId, type });
        }

        await message.save();

        // ✅ QUAN TRỌNG: populate lại message
        return await Message.findById(messageId)
            .populate("senderId", "fullName avatar")
            .populate("reactions.userId", "fullName avatar");
    }

    //Tìm kiếm tin nhắn
    async searchMessages(conversationId, keyword) {
        return await Message.find({
            conversationId,
            content: { $regex: keyword, $options: 'i' }, // không phân biệt hoa thường
            isDeleted: false
        })
            .populate('senderId', 'fullName avatar')
            .sort({ createdAt: -1 })
            .limit(50);
    }

    //Ghim tin nhắn
    async pinMessage(conversationId, messageId, userId) {
        const msgId = new mongoose.Types.ObjectId(messageId);

        const exists = await Conversation.findOne({
            _id: conversationId,
            "pinnedMessages.message": msgId
        });

        // ================= UNPIN =================
        if (exists) {
            return await Conversation.findByIdAndUpdate(
                conversationId,
                {
                    $pull: { pinnedMessages: { message: msgId } }
                },
                { new: true }
            ).populate({
                path: "pinnedMessages.message",
                populate: {
                    path: "senderId",
                    select: "fullName avatar"
                }
            });
        }

        // ================= PIN =================
        return await Conversation.findByIdAndUpdate(
            conversationId,
            {
                $push: {
                    pinnedMessages: {
                        message: msgId,
                        pinnedBy: userId,
                        pinnedAt: new Date()
                    }
                }
            },
            { new: true }
        ).populate({
            path: "pinnedMessages.message",
            populate: {
                path: "senderId",
                select: "fullName avatar"
            }
        });
    }

    async getPinnedMessages(conversationId) {
        return await Conversation.findById(conversationId)
            .populate({
                path: "pinnedMessages.message",
                populate: {
                    path: "senderId",
                    select: "fullName avatar"
                }
            });
    }
}

module.exports = new ChatService();