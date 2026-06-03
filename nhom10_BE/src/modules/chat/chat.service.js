const Conversation = require("../../../models/conversation");
const Message = require("../../../models/message");
const User = require("../../../models/user");
const FileUpload = require('../../../models/fileupload');
const Friend = require("../../../models/friend");

const mongoose = require("mongoose");
const crypto = require("crypto");

const DELETED_USER_NAME = "Tai khoan bi khoa";
const USER_SELECT = "fullName username email avatar status isLocked isDeleted deletedAt";

const normalizeUser = (user) => {
    if (!user) return user;
    return user;
};

const normalizeConversationUsers = (conversation) => {
    if (!conversation?.members) return conversation;
    conversation.members = conversation.members
        .filter(m => m.user != null)
        .map(m => ({
            ...m,
            user: typeof m.user === "object" ? normalizeUser(m.user) : m.user
        }));
    return conversation;
};

const getMemberUserId = (member) => {
    const hasUserField = member && typeof member === "object" && "user" in member;
    const user = hasUserField ? member.user : member;
    if (!user) return null;
    if (typeof user === "object") return user._id || user.id || null;
    return user;
};

const isMemberUser = (member, userId) => {
    const memberUserId = getMemberUserId(member);
    return Boolean(memberUserId && userId && memberUserId.toString() === userId.toString());
};

class ChatService {
    // 1. LẤY HOẶC TẠO CUỘC HỘI THOẠI 1-1
    async getOrCreateOneToOneConversation(user1Id, user2Id) {
        // Tìm cuộc hội thoại private có chứa CẢ 2 user trong mảng members
        const sharedConversation = await Conversation.findOne({
            type: "private",
            "members.user": { $all: [user1Id, user2Id] }, // $all: Yêu cầu phải có mặt cả 2 ID
            members: { $size: 2 }, // $size: Đảm bảo chỉ có đúng 2 thành viên
        });

        if (sharedConversation) {
            return sharedConversation._id; // Trả về _id theo chuẩn MongoDB
        }

        // Nếu chưa có thì tạo mới (Gộp luôn việc insert User vào mảng trong 1 thao tác duy nhất)
        const newConversation = await Conversation.create({
            type: "private",
            createdBy: user1Id,
            members: [
                { user: user1Id, role: "member" },
                { user: user2Id, role: "member" },
            ],
        });

        return newConversation._id;
    }
    // ==============================
    // 2. SAVE MESSAGE (FULL FEATURE)
    // ==============================
    async saveMessage(data) {
        const conversation = await Conversation.findById(data.conversationId)
            .populate("members.user", USER_SELECT);

        if (!conversation) throw new Error("Cuoc tro chuyen khong ton tai");

        if (conversation.type === "group" && conversation.isActive === false) {
            throw new Error("Nhom da giai tan, khong the gui tin nhan");
        }

        const senderMember = conversation.members.find(
            m => m.user?._id?.toString() === data.senderId.toString()
        );
        if (!senderMember || senderMember.user?.isDeleted || senderMember.user?.isLocked) {
            throw new Error("Tai khoan khong duoc phep gui tin nhan");
        }

        if (conversation.type === "private") {
            const partnerMember = conversation.members.find(
                m => m.user?._id?.toString() !== data.senderId.toString()
            );
            const partnerId = partnerMember?.user?._id;
            const friendship = partnerId
                ? await Friend.findOne({
                    status: "accepted",
                    $or: [
                        { userId: data.senderId, friendId: partnerId },
                        { userId: partnerId, friendId: data.senderId },
                    ],
                })
                : null;

            if (!friendship) {
                throw new Error("Chua ket ban, chi co the xem lai cuoc tro chuyen truoc do");
            }

            const blockedPartner = conversation.members.find(
                m => m.user?._id?.toString() !== data.senderId.toString() && (m.user?.isDeleted || m.user?.isLocked)
            );
            if (blockedPartner) {
                throw new Error("Khong the nhan tin voi tai khoan da xoa hoac bi khoa");
            }
        }

        const newMessage = await Message.create({
            ...data,
            status: 'sent',
            replyTo: data.replyTo || null,
            mentions: data.mentions || [],
            systemType: data.systemType || null,
            deliveredTo: [],
            seenBy: []
        });

        await Conversation.findByIdAndUpdate(data.conversationId, {
            latestMessage: newMessage._id,
            updatedAt: new Date()
        });

        // ================= FILE STORAGE =================
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

        return await Message.findById(newMessage._id)
            .populate('senderId', USER_SELECT)
            .populate('mentions', USER_SELECT)
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'senderId',
                    select: USER_SELECT
                }
            })
            .populate('reactions.userId', USER_SELECT)
            .populate('seenBy.userId', USER_SELECT)
            .populate('deliveredTo.userId', USER_SELECT);
    }

    // ==============================
    // 3. GET HISTORY (FIX REPLY)
    // ==============================
    async getConversationHistory(conversationId, userId, cursor = null, limit = 20) {
        let query = {
            conversationId,
            deletedFor: { $ne: userId }
        };

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
            .populate('seenBy.userId', 'fullName avatar')
            .populate('deliveredTo.userId', 'fullName avatar')
            .populate('reactions.userId', 'fullName avatar')
            .sort({ createdAt: -1 })
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
    // async getUserConversations(userId) {
    //     const conversations = await Conversation.find({
    //         'members.user': userId
    //     })
    //         .populate('members.user', USER_SELECT)
    //         .populate({
    //             path: 'latestMessage',
    //             populate: {
    //                 path: 'senderId',
    //                 select: 'fullName avatar'
    //             }
    //         })
    //         .sort({ updatedAt: -1 })
    //         .lean();

    //     return conversations.map(c => {

    //         // ================= PRIVATE CHAT =================
    //         if (c.type === 'private') {
    //             const partner = c.members.find(
    //                 m => m.user._id.toString() !== userId.toString()
    //             )?.user;

    //             if (partner) {
    //                 c.name = partner.fullName;
    //                 c.avatar = partner.avatar;
    //             }
    //         }

    //         // ================= GROUP CHAT =================
    //         if (c.type === 'group') {
    //             c.memberCount = c.members.length;
    //         }

    //         return c;
    //     });
    // }
    async getUserConversations(userId) {
        const conversations = await Conversation.find({
            'members.user': userId
        })
            .populate('members.user', USER_SELECT)
            .populate({
                path: 'latestMessage',
                populate: {
                    path: 'senderId',
                    select: USER_SELECT
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

        return Promise.all(conversations.map(async (c) => {
            const latestMessage = await Message.findOne({
                conversationId: c._id,
                deletedFor: { $ne: userId }
            })
                .sort({ createdAt: -1 })
                .populate("senderId", USER_SELECT)
                .lean();

            c.latestMessage = latestMessage || c.latestMessage || null;
            // 👉 1. BƯỚC QUAN TRỌNG: Lọc bỏ ngay những member bị null (do user đã bị xóa khỏi DB)
            const validMembers = c.members
                .filter(m => m.user != null)
                .map(m => ({
                    ...m,
                    user: normalizeUser(m.user)
                }));

            // Gán lại mảng members sạch (không chứa null) để frontend không bị lỗi hiển thị
            c.members = validMembers;

            // ================= PRIVATE CHAT =================
            if (c.type === 'private') {
                // 👉 2. Dùng Optional Chaining (?.) để tìm partner an toàn tuyệt đối
                const partner = validMembers.find(
                    m => m.user?._id?.toString() !== userId.toString()
                )?.user;

                if (partner) {
                    const friendship = await Friend.findOne({
                        $or: [
                            { userId, friendId: partner._id },
                            { userId: partner._id, friendId: userId },
                        ],
                    }).select("status").lean();

                    c.name = partner.fullName || partner.username || DELETED_USER_NAME;
                    c.avatar = partner.avatar;
                    c.partnerDeleted = Boolean(partner.isDeleted || partner.isLocked);
                    c.friendshipStatus = friendship?.status || "none";
                    c.canSendMessage = c.friendshipStatus === "accepted" && !c.partnerDeleted;
                } else {
                    // 👉 3. Fallback: Nếu partner đã bị xóa tài khoản hoàn toàn
                    c.name = "Người dùng đã xóa";
                    c.avatar = "https://i.pravatar.cc/150";
                    c.partnerDeleted = true;
                    c.friendshipStatus = "none";
                    c.canSendMessage = false;
                }
            }

            // ================= GROUP CHAT =================
            if (c.type === 'group') {
                // Đếm số lượng thành viên dựa trên danh sách hợp lệ
                c.memberCount = validMembers.length;
            }

            return c;
        }));
    }

    // ==============================
    // 5. SEEN
    // ==============================
    async markAsSeen(conversationId, userId) {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            console.log("⚠️ Bỏ qua markAsSeen do ID không phải là ObjectId hợp lệ");
            return { success: false, message: "Invalid ID" };
        }
        await Message.updateMany(
            {
                conversationId,
                senderId: { $ne: userId },
                "seenBy.userId": { $ne: userId }
            },
            {
                status: "seen",
                $push: {
                    seenBy: {
                        userId,
                        seenAt: new Date()
                    }
                }
            }
        );

        return await Message.find({
            conversationId,
            senderId: { $ne: userId }
        })
            .populate("senderId", "fullName avatar")
            .populate({
                path: "replyTo",
                populate: {
                    path: "senderId",
                    select: "fullName avatar"
                }
            })
            .populate("seenBy.userId", "fullName avatar")
            .populate("deliveredTo.userId", "fullName avatar")
            .populate("reactions.userId", "fullName avatar");
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

    async deleteMessageForMe(messageId, userId) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error("Message not found");

        const conversation = await Conversation.findOne({
            _id: message.conversationId,
            "members.user": userId
        }).select("_id");

        if (!conversation) {
            throw new Error("Khong co quyen thao tac tin nhan nay");
        }

        const alreadyDeleted = (message.deletedFor || []).some(
            id => id.toString() === userId.toString()
        );

        if (!alreadyDeleted) {
            message.deletedFor.push(userId);
            await message.save();
        }

        return {
            messageId: message._id,
            conversationId: message.conversationId,
        };
    }

    async toggleReaction(messageId, userId, type) {
        const message = await Message.findById(messageId);

        if (!message) throw new Error("Message not found");

        const existing = message.reactions.find(
            r => r.userId.toString() === userId.toString() && r.type === type
        );

        if (existing) {
            message.reactions = message.reactions.filter(
                r => !(r.userId.toString() === userId.toString() && r.type === type)
            );
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

    async forwardMessage(userId, originalMessageId, targetConversationIds) {
        // 1. Tìm tin nhắn gốc cần chuyển tiếp
        const originalMsg = await Message.findById(originalMessageId);
        if (!originalMsg) throw new Error("Tin nhắn gốc không tồn tại");

        const forwardedMessages = [];

        // 👉 Khởi tạo Socket ngay trong Service
        const io = require('../../shared/utils/socket').getIO();

        // 2. Lặp qua các cuộc trò chuyện đích để tạo tin nhắn mới
        for (const convId of targetConversationIds) {
            const newMsg = await Message.create({
                conversationId: convId,
                senderId: userId,
                content: originalMsg.content,
                type: originalMsg.type,
                fileUrl: originalMsg.fileUrl,
                fileName: originalMsg.fileName,
                status: 'sent'
            });

            // Cập nhật tin nhắn mới nhất cho cuộc trò chuyện đích
            // Lưu ý: Thêm { new: true } để lấy được mảng members ra dùng cho Socket
            const conv = await Conversation.findByIdAndUpdate(convId, {
                latestMessage: newMsg._id,
                updatedAt: new Date()
            }, { new: true });

            // Lấy data đầy đủ (Kèm tên, avatar người gửi)
            const populatedMsg = await Message.findById(newMsg._id)
                .populate("senderId", "fullName avatar");

            forwardedMessages.push(populatedMsg);

            // ==========================================
            // 🔥 BẮN SOCKET REALTIME NGAY TẠI ĐÂY 🔥
            // ==========================================
            const convIdStr = convId.toString();

            // A. Bắn cho những ai ĐANG MỞ TRỰC TIẾP khung chat đó
            io.to(convIdStr).emit("newMessage", populatedMsg);
            io.to(convIdStr).emit("receive_message", populatedMsg);

            // B. Bắn cho TẤT CẢ THÀNH VIÊN để nảy chấm đỏ ở màn hình ngoài
            if (conv && Array.isArray(conv.members)) {
                conv.members.forEach(m => {
                    const memberId = getMemberUserId(m);
                    if (!memberId) return;
                    const memberIdStr = memberId.toString();

                    // Gửi tín hiệu đến từng điện thoại của user
                    io.to(memberIdStr).emit("newMessage_global", populatedMsg);
                    io.to(memberIdStr).emit("conversation_updated", populatedMsg);
                });
            }
        }

        return forwardedMessages;
    }
    //==========Chat Group==========

    async createGroupConversation(adminId, name, memberIds = [], avatar = "") {
        const uniqueMembers = [...new Set([adminId.toString(), ...memberIds.map(id => id.toString())])];

        const members = uniqueMembers.map(id => ({
            user: id,
            role: id.toString() === adminId.toString() ? 'admin' : 'member'
        }));

        const newGroup = await Conversation.create({
            type: 'group',
            name: name || "Nhóm mới",
            avatar,
            createdBy: adminId,
            members
        });

        const systemMsg = await this.createSystemMessage(
            newGroup._id,
            adminId,
            "đã tạo nhóm",
            "create_group"
        );

        await Conversation.findByIdAndUpdate(newGroup._id, {
            latestMessage: systemMsg._id
        });

        return await Conversation.findById(newGroup._id)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async addMembersToGroup(conversationId, adminId, newMemberIds = []) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        const admin = conversation.members.find((m) => isMemberUser(m, adminId));

        if (!admin || admin.role !== 'admin') {
            throw new Error("Chỉ admin mới được thêm thành viên");
        }

        const allowedUsers = await User.find({
            _id: { $in: newMemberIds },
            isDeleted: { $ne: true },
            isLocked: { $ne: true }
        }).select("_id");
        const allowedIds = new Set(allowedUsers.map(u => u._id.toString()));
        const addedUsers = [];

        newMemberIds.forEach(id => {
            if (!allowedIds.has(id.toString())) return;

            const exists = conversation.members.some((m) => isMemberUser(m, id));

            if (!exists) {
                conversation.members.push({
                    user: id,
                    role: 'member'
                });
                addedUsers.push(id);
            }
        });

        await conversation.save();

        if (addedUsers.length > 0) {
            await this.createSystemMessage(
                conversationId,
                adminId,
                `đã thêm ${addedUsers.length} thành viên vào nhóm`,
                "add_member"
            );
        }

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async removeMemberFromGroup(conversationId, adminId, memberId) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        const admin = conversation.members.find((m) => isMemberUser(m, adminId));

        if (!admin || admin.role !== 'admin') {
            throw new Error("Chỉ admin mới được xóa thành viên");
        }

        conversation.members = conversation.members.filter((m) => !isMemberUser(m, memberId));

        await conversation.save();

        await this.createSystemMessage(
            conversationId,
            adminId,
            "đã xóa một thành viên khỏi nhóm",
            "remove_member"
        );

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    // async leaveGroup(conversationId, userId) {
    //     const conversation = await Conversation.findById(conversationId);

    //     if (!conversation) throw new Error("Nhóm không tồn tại");

    //     conversation.members = conversation.members.filter(
    //         m => m.user.toString() !== userId.toString()
    //     );

    //     await conversation.save();

    //     await this.createSystemMessage(
    //         conversationId,
    //         userId,
    //         "đã rời khỏi nhóm",
    //         "leave_group"
    //     );

    //     return await Conversation.findById(conversationId)
    //         .populate("members.user", USER_SELECT)
    //         .populate("latestMessage");
    // }
    async leaveGroup(conversationId, userId) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        // 1. Tìm người dùng chuẩn bị rời đi và kiểm tra xem có phải admin không
        const leavingMember = conversation.members.find((m) => isMemberUser(m, userId));

        if (!leavingMember) throw new Error("Bạn không ở trong nhóm này");
        const isAdmin = leavingMember.role === 'admin';

        // 2. Lọc bỏ người này ra khỏi mảng members
        conversation.members = conversation.members.filter((m) => !isMemberUser(m, userId));

        // 3. KIỂM TRA SỐ LƯỢNG THÀNH VIÊN SAU KHI RỜI ĐI
        if (conversation.members.length === 0) {
            // Trường hợp 1: Nhóm không còn ai -> Xóa luôn nhóm
            await Conversation.findByIdAndDelete(conversationId);

            // (Tùy chọn) Xóa luôn các tin nhắn cũ của nhóm cho nhẹ DB
            const Message = require('../../../models/message');
            await Message.deleteMany({ conversationId: conversationId });

            return null; // Trả về null báo hiệu nhóm đã giải tán
        }

        // Trường hợp 2: Nhóm vẫn còn người
        if (isAdmin) {
            // Kiểm tra xem nhóm còn admin nào khác không
            const hasOtherAdmin = conversation.members.some(m => m.role === 'admin');

            // Nếu không còn admin nào, tự động đẩy người đầu tiên trong mảng lên làm Admin
            if (!hasOtherAdmin) {
                conversation.members[0].role = 'admin';

                // Tạo tin nhắn hệ thống báo hiệu có Admin mới
                await this.createSystemMessage(
                    conversationId,
                    conversation.members[0].user,
                    "đã được tự động chỉ định làm Quản trị viên do Admin cũ rời nhóm",
                    "promote_admin"
                );
            }
        }

        // Lưu lại sự thay đổi (Xóa user + Cập nhật Admin mới nếu có)
        await conversation.save();

        // 4. Bắn thông báo người cũ đã rời nhóm
        await this.createSystemMessage(
            conversationId,
            userId,
            "đã rời khỏi nhóm",
            "leave_group"
        );

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async dissolveGroup(conversationId, adminId) {
        const conversation = await Conversation.findOne({ _id: conversationId, type: "group" });
        if (!conversation) throw new Error("Nhom khong ton tai");

        const admin = conversation.members.find((m) => isMemberUser(m, adminId));
        if (!admin || admin.role !== "admin") {
            throw new Error("Chi admin moi duoc giai tan nhom");
        }

        if (conversation.isActive === false) {
            return await Conversation.findById(conversationId)
                .populate("members.user", USER_SELECT)
                .populate("latestMessage");
        }

        conversation.isActive = false;
        conversation.inviteToken = "";
        await conversation.save();

        await this.createSystemMessage(
            conversationId,
            adminId,
            "Nhom da giai tan",
            "dissolve_group"
        );

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async updateGroupInfo(conversationId, adminId, name, avatar) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        const admin = conversation.members.find((m) => isMemberUser(m, adminId));

        if (!admin || admin.role !== 'admin') {
            throw new Error("Chỉ admin mới được sửa thông tin nhóm");
        }

        if (name) conversation.name = name;
        if (avatar) conversation.avatar = avatar;

        await conversation.save();

        await this.createSystemMessage(
            conversationId,
            adminId,
            "đã cập nhật thông tin nhóm",
            "rename_group"
        );

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async getGroupMembers(conversationId) {
        const conversation = await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        return conversation.members;
    }

    // async createSystemMessage(conversationId, senderId, content, systemType) {
    //     const msg = await Message.create({
    //         conversationId,
    //         senderId,
    //         content,
    //         type: "system",
    //         systemType,
    //         status: "sent"
    //     });

    //     await Conversation.findByIdAndUpdate(conversationId, {
    //         latestMessage: msg._id
    //     });

    //     return await Message.findById(msg._id)
    //         .populate("senderId", "fullName avatar");
    // }
    async createSystemMessage(conversationId, senderId, content, systemType) {
        // 1. Tạo tin nhắn vào Database
        const msg = await Message.create({
            conversationId,
            senderId,
            content,
            type: "system",
            systemType,
            status: "sent"
        });

        // 2. Cập nhật tin nhắn mới nhất cho phòng chat
        await Conversation.findByIdAndUpdate(conversationId, {
            latestMessage: msg._id,
            updatedAt: new Date()
        });

        // 3. Lấy dữ liệu đầy đủ (Kèm tên, avatar người gửi)
        const populatedMsg = await Message.findById(msg._id)
            .populate("senderId", "fullName avatar");

        // 👉 4. BẮN SOCKET REALTIME NGAY TẠI ĐÂY
        try {
            // Require bên trong hàm để tránh lỗi Circular Dependency (Vòng lặp module)
            const io = require('../../shared/utils/socket').getIO();

            // Bắn cho những người đang mở trong khung Chat
            io.to(conversationId.toString()).emit("newMessage", populatedMsg);
            io.to(conversationId.toString()).emit("receive_message", populatedMsg);

            // Bắn ra ngoài màn hình danh sách Chat để nảy chấm đỏ
            const conv = await Conversation.findById(conversationId);
            if (conv && Array.isArray(conv.members)) {
                conv.members.forEach(m => {
                    const memberId = getMemberUserId(m);
                    if (memberId) io.to(memberId.toString()).emit("newMessage_global", populatedMsg);
                });
            }
        } catch (error) {
            console.error("⚠️ Lỗi phát socket tin nhắn hệ thống:", error);
        }

        return populatedMsg;
    }

    async unsendMessage(messageId, userId) {
        const message = await Message.findById(messageId);

        if (!message) throw new Error("Tin nhắn không tồn tại");

        if (message.senderId.toString() !== userId.toString()) {
            throw new Error("Không có quyền thu hồi");
        }

        message.content = "Tin nhắn đã được thu hồi";
        message.isUnsent = true;
        message.unsentAt = new Date();

        await message.save();

        return await Message.findById(messageId)
            .populate("senderId", "fullName avatar");
    }

    async markAsDelivered(conversationId, userId) {
        await Message.updateMany(
            {
                conversationId,
                senderId: { $ne: userId },
                "deliveredTo.userId": { $ne: userId }
            },
            {
                $push: {
                    deliveredTo: {
                        userId,
                        deliveredAt: new Date()
                    }
                }
            }
        );

        return await Message.find({
            conversationId,
            senderId: { $ne: userId }
        })
            .populate("senderId", "fullName avatar")
            .populate({
                path: "replyTo",
                populate: {
                    path: "senderId",
                    select: "fullName avatar"
                }
            })
            .populate("seenBy.userId", "fullName avatar")
            .populate("deliveredTo.userId", "fullName avatar")
            .populate("reactions.userId", "fullName avatar");
    }

    async getGroupInfo(conversationId) {
        const conversation = await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("createdBy", "fullName avatar")
            .populate({
                path: "latestMessage",
                populate: {
                    path: "senderId",
                    select: "fullName avatar"
                }
            });

        if (!conversation) {
            throw new Error("Nhóm không tồn tại");
        }

        if (conversation.type !== "group") {
            throw new Error("Đây không phải nhóm chat");
        }

        return conversation;
    }

    async getPrivateUserInfo(currentUserId, partnerId) {
        if (!mongoose.Types.ObjectId.isValid(partnerId)) {
            throw new Error("partnerId khong hop le");
        }

        const user = await User.findById(partnerId).select(USER_SELECT).lean();
        if (!user || user.isDeleted) {
            throw new Error("Khong tim thay nguoi dung");
        }

        const commonGroups = await Conversation.find({
            type: "group",
            isActive: { $ne: false },
            "members.user": { $all: [currentUserId, partnerId] },
        })
            .select("name avatar members updatedAt")
            .sort({ updatedAt: -1 })
            .lean();

        return {
            user,
            commonGroups: commonGroups.map((group) => ({
                _id: group._id,
                name: group.name || "Nhom chat",
                avatar: group.avatar || "",
                memberCount: Array.isArray(group.members) ? group.members.length : 0,
            })),
        };
    }

    async promoteAdmin(conversationId, currentAdminId, targetUserId) {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) throw new Error("Nhóm không tồn tại");

        const currentAdmin = conversation.members.find((m) => isMemberUser(m, currentAdminId));

        if (!currentAdmin || currentAdmin.role !== "admin") {
            throw new Error("Chỉ admin hiện tại mới có quyền chuyển quyền");
        }

        const targetMember = conversation.members.find((m) => isMemberUser(m, targetUserId));

        if (!targetMember) {
            throw new Error("Người được chuyển quyền không ở trong nhóm");
        }

        // hạ admin cũ xuống member
        currentAdmin.role = "member";

        // nâng target lên admin
        targetMember.role = "admin";

        await conversation.save();

        await this.createSystemMessage(
            conversationId,
            currentAdminId,
            "đã chuyển quyền admin cho thành viên khác",
            "promote_admin"
        );

        return await Conversation.findById(conversationId)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

    async getGroupInvite(conversationId, adminId) {
        const conversation = await Conversation.findOne({ _id: conversationId, type: "group" });
        if (!conversation) throw new Error("Nhom khong ton tai");

        const admin = conversation.members.find((m) => isMemberUser(m, adminId));
        if (!admin || admin.role !== "admin") {
            throw new Error("Chi admin moi duoc tao link moi nhom");
        }

        if (!conversation.inviteToken) {
            conversation.inviteToken = crypto.randomBytes(24).toString("hex");
            await conversation.save();
        }

        return {
            conversationId: conversation._id,
            token: conversation.inviteToken
        };
    }

    async joinGroupByInvite(token, userId) {
        if (!token) throw new Error("Thieu ma moi nhom");

        const user = await User.findById(userId);
        if (!user || user.isDeleted || user.isLocked) {
            throw new Error("Tai khoan khong duoc phep tham gia nhom");
        }

        const conversation = await Conversation.findOne({
            type: "group",
            inviteToken: token,
            isActive: { $ne: false }
        });
        if (!conversation) throw new Error("Ma moi nhom khong hop le");

        const exists = conversation.members.some((m) => isMemberUser(m, userId));

        if (!exists) {
            conversation.members.push({ user: userId, role: "member" });
            await conversation.save();
            await this.createSystemMessage(conversation._id, userId, "da tham gia nhom bang link moi", "add_member");
        }

        return await Conversation.findById(conversation._id)
            .populate("members.user", USER_SELECT)
            .populate("latestMessage");
    }

}

module.exports = new ChatService();

