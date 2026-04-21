const Conversation = require('../../../models/conversation');
const Message = require('../../../models/message');
const User = require('../../../models/user');
const FileUpload = require('../../../models/fileupload');

class ChatService {

    // ==============================
    // 1. GET OR CREATE 1-1 CHAT
    // ==============================
    async getOrCreateOneToOneConversation(user1Id, user2Id) {
        const sharedConversation = await Conversation.findOne({
            type: 'private',
            'members.user': { $all: [user1Id, user2Id] },
            members: { $size: 2 }
        });

        if (sharedConversation) return sharedConversation._id;

        const newConversation = await Conversation.create({
            type: 'private',
            createdBy: user1Id,
            members: [
                { user: user1Id },
                { user: user2Id }
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
    async getConversationHistory(conversationId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversationId })
            .populate('senderId', 'fullName avatar')
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'senderId',
                    select: 'fullName avatar'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return {
            messages: messages.reverse(),
            currentPage: page,
            hasMore: messages.length === limit
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
            // nếu cùng loại → remove
            if (existing.type === type) {
                message.reactions = message.reactions.filter(
                    r => r.userId.toString() !== userId.toString()
                );
            } else {
                // đổi reaction
                existing.type = type;
            }
        } else {
            message.reactions.push({ userId, type });
        }

        await message.save();

        return message;
    }
}

module.exports = new ChatService();