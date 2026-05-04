const chatService = require('../../../modules/chat/chat.service');

module.exports = function groupChatSocket(io, socket, userId) {

    // ============================
    // JOIN ROOM GROUP
    // ============================
    socket.on("group_join_room", async (conversationId) => {
        try {
            socket.join(conversationId.toString());

            // auto delivered khi user vào room
            await chatService.markAsDelivered(conversationId, userId);

            io.to(conversationId.toString()).emit("group_user_joined_room", {
                conversationId,
                userId
            });
        } catch (err) {
            console.log("group_join_room error:", err.message);
        }
    });

    // ============================
    // LEAVE ROOM GROUP
    // ============================
    socket.on("group_leave_room", (conversationId) => {
        socket.leave(conversationId.toString());

        io.to(conversationId.toString()).emit("group_user_left_room", {
            conversationId,
            userId
        });
    });

    // ============================
    // GROUP TYPING
    // ============================
    socket.on("group_typing", ({ conversationId, isTyping }) => {
        socket.to(conversationId.toString()).emit("group_typing", {
            conversationId,
            userId,
            isTyping
        });
    });

    // ============================
    // GROUP SEEN
    // ============================
    socket.on("group_seen", async ({ conversationId }) => {
        try {
            await chatService.markAsSeen(conversationId, userId);

            io.to(conversationId.toString()).emit("group_message_seen", {
                conversationId,
                userId
            });
        } catch (err) {
            console.log("group_seen error:", err.message);
        }
    });

    // ============================
    // GROUP DELIVERED
    // ============================
    socket.on("group_delivered", async ({ conversationId }) => {
        try {
            await chatService.markAsDelivered(conversationId, userId);

            io.to(conversationId.toString()).emit("group_message_delivered", {
                conversationId,
                userId
            });
        } catch (err) {
            console.log("group_delivered error:", err.message);
        }
    });

};