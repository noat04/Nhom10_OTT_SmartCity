// File: src/shared/utils/socket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../../modules/chat/chat.service');

let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: "*", 
                methods: ["GET", "POST"]
            }
        });

        // ==========================================
        // 🔒 SOCKET MIDDLEWARE: Xác thực JWT Token
        // ==========================================
        io.use((socket, next) => {
            try {
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
            } catch (error) {
                return next(new Error("Authentication error: Token không hợp lệ"));
            }
        });

        // ==========================================
        // ⚡ XỬ LÝ SỰ KIỆN KẾT NỐI
        // ==========================================
        io.on('connection', (socket) => {
            console.log(`✅ Client connected: ${socket.id} - User ID: ${socket.user.id}`);

            // User tham gia vào phòng chat
            socket.on('join_room', (conversationId) => {
                socket.join(conversationId);
                console.log(`User ${socket.user.username} đã vào phòng: ${conversationId}`);
            });

            // Lắng nghe sự kiện gửi tin nhắn
            socket.on('send_message', async (data) => {
                try {
                    // Đảm bảo senderId luôn là ID của người đang đăng nhập (Bảo mật, tránh giả mạo ID người khác)
                    data.senderId = socket.user.id; 

                    // 1. Lưu tin nhắn vào MongoDB
                    const savedMessage = await chatService.saveMessage(data);

                    // 2. Phát tin nhắn đến phòng
                    io.to(data.conversationId).emit('receive_message', savedMessage);
                    
                } catch (error) {
                    console.error("Lỗi khi gửi tin nhắn:", error);
                    socket.emit('error_message', { error: 'Không thể gửi tin nhắn' });
                }
            });

            socket.on('disconnect', () => {
                console.log(`❌ Client disconnected: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) throw new Error("Socket.io chưa được khởi tạo!");
        return io;
    }
};