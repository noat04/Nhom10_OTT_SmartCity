// src/shared/utils/socket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../../modules/chat/chat.service');
const { User } = require('../../../models'); // Đảm bảo đường dẫn này đúng
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
                // Hỗ trợ lấy token từ handshake auth hoặc query
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
            const userId = socket.user.id || socket.user._id;
            
            console.log(`✅ Client connected: ${socket.id} - User ID: ${userId}`);

            // 1. USER ONLINE: Cập nhật MySQL và báo cho mọi người
            try {
                await User.update({ status: 'online' }, { where: { id: userId } });
                socket.broadcast.emit('user_status_changed', { userId, status: 'online' });
            } catch (error) {
                console.error("Lỗi cập nhật trạng thái Online:", error);
            }


            // 👉 THÊM ĐOẠN NÀY: Lắng nghe tín hiệu báo tin nhắn mới từ Frontend
            // socket.on('notify_new_message', (msg) => {
            //     // socket.to(...) sẽ gửi tin nhắn này cho TẤT CẢ mọi người 
            //     // đang mở đúng cái phòng chat đó (ngoại trừ người vừa gửi)
            //     socket.to(msg.conversationId).emit('newMessage', msg);
            // });
            // 1. USER ONLINE
            socket.on("userOnline", (userId) => {
                onlineUsers.set(userId, socket.id);
                io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
            });
            
            // 2. THAM GIA PHÒNG CHAT (Khớp với Frontend: joinConversation)
            socket.on('joinConversation', (conversationId) => {
                socket.join(conversationId);
                console.log(`User ${userId} đã vào phòng: ${conversationId}`);
            });

            // 3. RỜI PHÒNG CHAT (Khớp với Frontend: leaveConversation)
            socket.on('leaveConversation', (conversationId) => {
                socket.leave(conversationId);
                console.log(`User ${userId} đã rời phòng: ${conversationId}`);
            });

            // 4. TRẠNG THÁI ĐANG GÕ PHÍM (Khớp với Frontend: typing)
            socket.on('typing', (data) => {
                // data = { conversationId, isTyping }
                // Gửi sự kiện này cho người bên kia trong phòng (trừ người gửi)
                socket.to(data.conversationId).emit('typing', {
                    conversationId: data.conversationId,
                    userId: userId,
                    isTyping: data.isTyping
                });
            });

            // 5. GỬI TIN NHẮN TRỰC TIẾP QUA SOCKET (Tùy chọn)
            socket.on('send_message', async (data) => {
                try {
                    data.senderId = userId; 
                    const savedMessage = await chatService.saveMessage(data);

                    // Phát sự kiện 'newMessage' (thay vì receive_message) cho cả phòng
                    io.to(data.conversationId).emit('newMessage', savedMessage);
                } catch (error) {
                    console.error("Lỗi gửi tin nhắn:", error.message);
                    socket.emit("error", "Không thể gửi tin nhắn!");
                }
                // Lấy token từ handshake auth (Frontend sẽ gửi lên qua đây)
                const token = socket.handshake.auth.token;

                if (!token) {
                    return next(new Error("Authentication error: Không tìm thấy Token"));
                }

                // Giải mã token
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026');
                
                // Lưu thông tin user vào socket để dùng về sau
                socket.user = decoded;
                next();
            });
            // 6. XỬ LÝ SEEN (Đã xem)
            socket.on("seen", async ({ conversationId }) => {
                try {
                    const userId = socket.user.id || socket.user._id;

                    console.log(`User ${userId} đã xem phòng ${conversationId}`);

                    socket.to(conversationId).emit("user_seen_messages", { 
                        conversationId, 
                        userId
                    });

                } catch (error) {
                    console.error("Lỗi seen:", error);
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