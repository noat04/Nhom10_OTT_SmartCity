const Conversation = require('../../../models/conversation');
const Message = require('../../../models/message');
const User = require('../../../models/user');
// Thêm dòng này lên đầu file chat.service.js nếu chưa có
const FileUpload = require('../../../models/fileupload');
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


    // 2. LƯU TIN NHẮN
    // async saveMessage(data) {
    //     const newMessage = await Message.create({
    //         ...data,
    //         type: data.type || 'text',
    //         status: 'sent'
    //     });

    //     // 💡 QUAN TRỌNG: Cập nhật lại trường latestMessage cho Conversation
    //     // để hiển thị tin nhắn mới nhất ra màn hình danh sách Chat
    //     await Conversation.findByIdAndUpdate(data.conversationId, {
    //         latestMessage: newMessage._id
    //     });

    //     return newMessage;
    // }
    async saveMessage(data) {
        // 1. Lưu tin nhắn vào collection Message như bình thường
        const newMessage = await Message.create({
            ...data,
            status: 'sent'
        });

        // Cập nhật latestMessage cho Conversation...
        await Conversation.findByIdAndUpdate(data.conversationId, {
            latestMessage: newMessage._id
        });

        // 2. 👉 NẾU TIN NHẮN CÓ FILE -> LƯU THÊM VÀO KHO FILE UPLOAD
        if (data.fileUrl) {
            // Xác định loại file cho chuẩn với enum
            let fileExtType = 'file';
            if (data.type === 'image') fileExtType = 'image';
            else if (data.type === 'video') fileExtType = 'video';

            await FileUpload.create({
                uploaderId: data.senderId,
                messageId: newMessage._id,
                conversationId: data.conversationId,
                fileName: data.fileName || 'Thư mục không tên',
                fileUrl: data.fileUrl,
                fileType: fileExtType,
                size: data.fileSize || 0
            });
        }

        return newMessage;
    }


    // 3. LẤY LỊCH SỬ TIN NHẮN (CÓ PHÂN TRANG)
    async getConversationHistory(conversationId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const messages = await Message.find({ conversationId })
            .populate('senderId', 'username avatar') // Kéo theo thông tin người gửi (Thay cho JOIN)
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);
        
        return {
            messages: messages.reverse(),
            currentPage: page,
            hasMore: messages.length === limit
        };
    }


    // 4. LẤY DANH SÁCH CUỘC HỘI THOẠI CỦA USER
    async getUserConversations(currentUserId) {
        // Thay vì truy vấn từ User -> Include lồng nhau phức tạp, 
        // ta truy vấn thẳng vào Conversation chứa currentUserId
        const conversations = await Conversation.find({ 'members.user': currentUserId })
            .populate('members.user', 'username fullName avatar status') // Lấy info thành viên
            .populate('latestMessage') // Lấy info tin nhắn cuối cùng
            .sort({ updatedAt: -1 }) // Chat nào mới tương tác đẩy lên đầu
            .lean(); // .lean() giúp trả về JS Object thuần (tăng tốc độ xử lý)

        if (!conversations || conversations.length === 0) return [];

        return conversations.map(c => {
            if (c.type === 'private') {
                // Lọc tìm người đối diện (partner) trong cuộc trò chuyện private
                const partnerMember = c.members.find(m => m.user._id.toString() !== currentUserId.toString());
                
                if (partnerMember && partnerMember.user) {
                    const partner = partnerMember.user;
                    c.name = partner.fullName || partner.username;
                    c.avatar = partner.avatar;
                    c.isOnline = partner.status === 'online';
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
}

module.exports = new ChatService();