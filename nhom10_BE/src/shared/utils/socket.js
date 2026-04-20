// src/shared/utils/socket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../../modules/chat/chat.service');
// 1. Sửa đường dẫn import User Model (Xóa Sequelize)
const User = require('../../../models/user'); 

const onlineUsers = new Map();
let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: "http://localhost:5173", 
                methods: ["GET", "POST"]
            }
        });

        // ==========================================
        // 🔒 SOCKET MIDDLEWARE: Xác thực JWT Token
        // ==========================================
        io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;

                if (!token) {
                    return next(new Error("Authentication error: Không tìm thấy Token"));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026');
                socket.user = decoded;
                next();
            } catch (error) {
                return next(new Error("Authentication error: Token không hợp lệ"));
            }
        });

        // ==========================================
        // ⚡ XỬ LÝ SỰ KIỆN KẾT NỐI
        // ==========================================
        io.on('connection', async (socket) => {
            // Mongoose ID có thể nằm ở _id hoặc id tùy vào cấu hình JSON
            const userId = (socket.user.id || socket.user._id).toString(); 
              
            //tất cả thiết bị (web + mobile + tab) đều join vào room đó
            socket.join(userId);
            console.log(`✅ Client connected: ${socket.id} - User ID: ${userId}`);

            // 1. USER ONLINE (Mongoose)
            try {
                // Thay thế where: {id: ...} bằng findByIdAndUpdate
                await User.findByIdAndUpdate(userId, { status: 'online' });
                socket.broadcast.emit('user_status_changed', { userId, status: 'online' });
            } catch (error) {
                console.error("Lỗi cập nhật trạng thái Online:", error);
            }

            // Lắng nghe sự kiện báo online từ client
            socket.on("userOnline", (incomingUserId) => {
                onlineUsers.set(incomingUserId.toString(), socket.id);
                io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
            });
            
            // 2. THAM GIA PHÒNG CHAT (Nhớ toString conversationId)
            socket.on('joinConversation', (conversationId) => {
                const roomId = conversationId.toString();
                socket.join(roomId);
                console.log(`User ${userId} đã vào phòng: ${roomId}`);
            });

            // 3. RỜI PHÒNG CHAT
            socket.on('leaveConversation', (conversationId) => {
                const roomId = conversationId.toString();
                socket.leave(roomId);
                console.log(`User ${userId} đã rời phòng: ${roomId}`);
            });

            // 4. TRẠNG THÁI ĐANG GÕ PHÍM
            socket.on('typing', (data) => {
                socket.to(data.conversationId.toString()).emit('typing', {
                    conversationId: data.conversationId,
                    userId: userId,
                    isTyping: data.isTyping
                });
            });

            // 5. GỬI TIN NHẮN TRỰC TIẾP QUA SOCKET
            socket.on('send_message', async (data) => {
                try {
                    data.senderId = userId; 
                    const savedMessage = await chatService.saveMessage(data);

                    // Phát sự kiện 'newMessage' vào đúng room
                    io.to(data.conversationId.toString()).emit('newMessage', savedMessage);
                } catch (error) {
                    console.error("Lỗi gửi tin nhắn:", error.message);
                    socket.emit("error", "Không thể gửi tin nhắn!");
                }
            });

            // 6. XỬ LÝ SEEN (Đã xem)
            socket.on("seen", async ({ conversationId }) => {
                try {
                    console.log(`User ${userId} đã xem phòng ${conversationId}`);
                    socket.to(conversationId.toString()).emit("user_seen_messages", { 
                        conversationId, 
                        userId
                    });
                } catch (error) {
                    console.error("Lỗi seen:", error);
                }
            });

            // 7. XỬ LÝ THẢ CẢM XÚC (REACTION)
            socket.on("react_message", async ({ conversationId, messageId, type }) => {
                try {
                    const updatedReactions = await chatService.addOrUpdateReaction(messageId, userId, type);

                    io.to(conversationId.toString()).emit("message_reacted", {
                        messageId: messageId,
                        reactions: updatedReactions
                    });
                } catch (error) {
                    console.error("Lỗi khi thả cảm xúc:", error);
                }
            });

            // 8. SỰ KIỆN NGẮT KẾT NỐI
            socket.on('disconnect', async () => {
                console.log(`❌ Client disconnected: ${socket.id} - User ID: ${userId}`);
                
                try {
                    // Xóa khỏi Map online
                    if (onlineUsers.has(userId)) {
                        onlineUsers.delete(userId);
                        io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
                    }

                    // Cập nhật Database (Mongoose) thành Offline
                    const currentTime = new Date();
                    await User.findByIdAndUpdate(userId, { 
                        status: 'offline', 
                        lastSeen: currentTime 
                    });

                    // Phát sóng cho mọi người biết
                    socket.broadcast.emit('user_status_changed', { 
                        userId: userId, 
                        status: 'offline',
                        lastSeen: currentTime
                    });
                } catch (error) {
                    console.error("Lỗi cập nhật trạng thái Offline:", error);
                }
            });
           
        });
        
        return io;
    },
    
    getIO: () => {
        if (!io) throw new Error("Socket.io chưa được khởi tạo!");
        return io;
    }
};