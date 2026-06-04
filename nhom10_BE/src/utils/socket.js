// src/utils/socket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('../services/chat.service');
// 1. Sửa đường dẫn import User Model (Xóa Sequelize)
const User = require('../models/user');
const callSocketHandler = require('../utils/socket/call.socket');
const groupChatSocket = require('./socket/groupChat.socket');
const onlineUsers = new Map();
let io;

const getOnlineUserIds = () => Array.from(onlineUsers.keys());
const socketCorsOrigins = (
    process.env.SOCKET_CORS_ORIGINS ||
    process.env.CLIENT_URL ||
    "http://localhost:5173,https://nhom10-ott-smartcity-ha37.onrender.com"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: (origin, callback) => {
                    if (!origin || socketCorsOrigins.includes("*") || socketCorsOrigins.includes(origin)) {
                        return callback(null, true);
                    }

                    return callback(new Error("Not allowed by Socket.IO CORS"));
                },
                methods: ["GET", "POST"],
                credentials: true
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

            await User.findByIdAndUpdate(userId, {
                status: 'online'
            });

            // ✅ MULTI TAB SAFE
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }

            onlineUsers.get(userId).add(socket.id);

            // ✅ gửi list online cho chính user mới
            socket.emit("online_list", getOnlineUserIds());

            // ✅ báo cho người khác biết user này online
            socket.broadcast.emit("user_online", userId);

            console.log(`✅ Client connected: ${socket.id} - User ID: ${userId}`);

            // Gắn handler cuộc gọi
            callSocketHandler(io, socket);


            // Gắn handler group chat
            groupChatSocket(io, socket, userId);

            socket.currentConversationId = null;

            socket.on("get_online_users", () => {
                socket.emit("online_list", getOnlineUserIds());
            });

            // 2. THAM GIA PHÒNG CHAT (Nhớ toString conversationId)
            socket.on('joinConversation', async (conversationId) => {
                if (!conversationId) return;

                const roomId = conversationId.toString();

                if (socket.currentConversationId === roomId) return;

                if (socket.currentConversationId) {
                    socket.leave(socket.currentConversationId);
                    console.log(`User ${userId} đã rời phòng: ${socket.currentConversationId}`);
                }

                socket.join(roomId);
                socket.currentConversationId = roomId;

                await chatService.markAsDelivered(conversationId, userId);

                const viewer = await User.findById(userId).select("fullName avatar");

                io.to(roomId).emit("message_delivered", {
                    conversationId: roomId,
                    user: viewer,
                    deliveredAt: new Date(),
                });
                console.log(`User ${userId} đã vào phòng: ${roomId}`);
            });

            // 3. RỜI PHÒNG CHAT
            socket.on('leaveConversation', (conversationId) => {
                if (!conversationId) return;

                const roomId = conversationId.toString();

                if (socket.currentConversationId === roomId) {
                    socket.leave(roomId);
                    socket.currentConversationId = null;
                    console.log(`User ${userId} đã rời phòng: ${roomId}`);
                }
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
            socket.on("notify_new_message", async ({ conversationId, messageId }) => {
                try {
                    const Message = require("../models/message");
                    const Conversation = require("../models/conversation");

                    const populatedMessage = await Message.findById(messageId)
                        .populate("senderId", "fullName avatar")
                        .populate("replyTo")
                        .populate("seenBy.userId", "fullName avatar")
                        .populate("deliveredTo.userId", "fullName avatar");

                    if (!populatedMessage) return;

                    io.to(conversationId.toString()).emit("newMessage", populatedMessage);

                    const conv = await Conversation.findById(conversationId);

                    conv.members.forEach((m) => {
                        io.to(m.user.toString()).emit("newMessage_global", populatedMessage);
                    });

                } catch (error) {
                    console.error("notify_new_message error:", error.message);
                }
            });
            socket.on("seen", async ({ conversationId }) => {
                try {
                    const seenMessages = await chatService.markAsSeen(conversationId, userId);

                    io.to(conversationId.toString()).emit("message_seen", {
                        conversationId,
                        userId,
                        seenMessages
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

            socket.on('disconnect', async () => {
                console.log(`❌ Client disconnected: ${socket.id} - User ID: ${userId}`);

                const userSockets = onlineUsers.get(userId);

                if (userSockets) {
                    userSockets.delete(socket.id);

                    if (userSockets.size === 0) {
                        onlineUsers.delete(userId);

                        const currentTime = new Date();

                        // 🔥 emit realtime
                        io.emit("user_offline", {
                            userId,
                            lastSeen: currentTime
                        });

                        // 🔥 update DB
                        await User.findByIdAndUpdate(userId, {
                            status: 'offline',
                            lastSeen: currentTime
                        });
                    }
                }
            });

        });

        return io;
    },

    getIO: () => {
        if (!io) throw new Error("Socket.io chưa được khởi tạo!");
        return io;
    },

    getOnlineUsers: () => onlineUsers
};
