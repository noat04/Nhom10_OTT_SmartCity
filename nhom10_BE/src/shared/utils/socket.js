const { Server } = require("socket.io");
const Message = require('../../../models/message');
let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: { origin: "*" } // Cho phép tất cả các nguồn (để dễ test mobile)
        });

        io.on("connection", (socket) => {
            console.log("⚡ Một thiết bị đã kết nối:", socket.id);

            // Khi Cán bộ đăng nhập, họ sẽ "tham gia" vào phòng của Phòng ban mình
            socket.on("join-department", (departmentId) => {
                socket.join(`dept_${departmentId}`);
                console.log(`Cán bộ đã vào phòng: dept_${departmentId}`);
            });

            socket.on("disconnect", () => {
                console.log("🔥 Thiết bị đã ngắt kết nối");
            });

            // 1. Tham gia vào phòng chat cụ thể (mỗi Report có 1 Conversation ID)
            socket.on("join-chat", (conversationId) => {
                socket.join(`room_${conversationId}`);
                console.log(`User vào phòng chat: room_${conversationId}`);
            });

            // 2. Lắng nghe tin nhắn mới
            socket.on("send-message", async (data) => {
                try {
                    const { conversation_id, sender_id, sender_name, content, type } = data;

                    // 1. Lưu vào MongoDB
                    const newMessage = new Message({
                        conversation_id,
                        sender_id,
                        sender_name,
                        content,
                        type: type || 'text'
                    });
                    await newMessage.save();

                    // 2. Gửi tin nhắn tới mọi người trong phòng chat này
                    // (Bao gồm cả người gửi để họ thấy tin nhắn đã 'đến' server)
                    io.to(`room_${conversation_id}`).emit("receive-message", newMessage);

                } catch (error) {
                    console.error("Lỗi gửi tin nhắn:", error.message);
                    socket.emit("error", "Không thể gửi tin nhắn!");
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