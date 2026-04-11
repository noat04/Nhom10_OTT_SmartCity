const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../../modules/chat/chat.service');
const { User } = require('../../../models');

let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: "http://localhost:5173",
                methods: ["GET", "POST"]
            }
        });

        // 🔒 Middleware xác thực
        io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;

                if (!token) {
                    return next(new Error("Không có token"));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SmartCity_Nhom10_Secret_Key_2026');
                socket.user = decoded;
                next();
            } catch (err) {
                next(new Error("Token không hợp lệ"));
            }
        });

        // ⚡ Connection
        io.on('connection', async (socket) => {
            const userId = socket.user.id || socket.user._id;
            console.log(`Connected: ${socket.id} - User: ${userId}`);

            // Online
            await User.update({ status: 'online' }, { where: { id: userId } });
            socket.broadcast.emit('user_status_changed', { userId, status: 'online' });

            // Join room
            socket.on('joinConversation', (conversationId) => {
                socket.join(conversationId);
            });

            // Leave room
            socket.on('leaveConversation', (conversationId) => {
                socket.leave(conversationId);
            });

            // Typing
            socket.on('typing', (data) => {
                socket.to(data.conversationId).emit('typing', {
                    ...data,
                    userId
                });
            });

            // Send message
            socket.on('send_message', async (data) => {
                try {
                    data.senderId = userId;
                    const msg = await chatService.saveMessage(data);
                    io.to(data.conversationId).emit('newMessage', msg);
                } catch (err) {
                    socket.emit('error', 'Send message failed');
                }
            });

            // Disconnect
            socket.on('disconnect', async () => {
                const now = new Date();
                await User.update(
                    { status: 'offline', lastSeen: now },
                    { where: { id: userId } }
                );

                socket.broadcast.emit('user_status_changed', {
                    userId,
                    status: 'offline',
                    lastSeen: now
                });
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) throw new Error("Socket chưa init");
        return io;
    }
};