const Call = require('../../../../models/call');
const User = require('../../../../models/user');
const Message = require('../../../../models/message');

const callTimers = {};
const CALL_TIMEOUT_SECONDS = 30;

// ✅ helper emit an toàn
const emitToUser = async (io, userId, event, data) => {
    const room = userId.toString();
    const sockets = await io.in(room).fetchSockets();

    if (sockets.length > 0) {
        io.to(room).emit(event, data);
    } else {
        console.log(`⚠️ User ${room} không online (event: ${event})`);
    }
};

module.exports = (io, socket) => {

   
    // ==========================================
    // 1. CALL INIT (FIX BUSY)
    // ==========================================
    socket.on("call_init", async (data) => {
        try {
            if (!socket.user || !socket.user.id) return;

            const { conversationId, receiverId, type } = data;
            const callerId = socket.user.id;

            // ==========================================
            // 🚫 CHECK RECEIVER BUSY
            // ==========================================
            const receiverBusy = await Call.findOne({
                'participants.userId': receiverId,
                status: { $in: ['calling', 'ringing', 'accepted', 'connecting', 'ongoing'] }
            });

            if (receiverBusy) {
                console.log("🚫 Receiver đang bận");

                await emitToUser(io, callerId, "call_busy", {
                    receiverId
                });

                return; // ❌ không tạo call
            }

            // ==========================================
            // 🚫 CHECK CALLER BUSY (chống spam)
            // ==========================================
            const callerBusy = await Call.findOne({
                'participants.userId': callerId,
                status: { $in: ['calling', 'ringing', 'accepted', 'connecting', 'ongoing'] }
            });

            if (callerBusy) {
                console.log("🚫 Caller đang trong cuộc gọi");

                socket.emit("call_busy", { self: true });
                return;
            }

            // ==========================================
            // ✅ CREATE CALL (CHỈ KHI KHÔNG BUSY)
            // ==========================================
            const newCall = await Call.create({
                conversationId,
                callerId,
                participants: [
                    { userId: callerId, status: 'joined' },
                    { userId: receiverId, status: 'invited' }
                ],
                type,
                status: 'calling'
            });

            const callerInfo = await User.findById(callerId)
                .select("username avatar fullName");

            await emitToUser(io, receiverId, "call_incoming", {
                callId: newCall._id,
                conversationId,
                type,
                caller: callerInfo
            });

            socket.emit("call_created", { callId: newCall._id });

            // ==========================================
            // ⏱ TIMEOUT
            // ==========================================
            callTimers[newCall._id] = setTimeout(async () => {
                const checkCall = await Call.findById(newCall._id);

                if (checkCall && ['calling', 'ringing'].includes(checkCall.status)) {

                    await Call.findByIdAndUpdate(newCall._id, {
                        status: 'missed',
                        endTime: new Date(),
                        endedReason: 'timeout'
                    });

                    await emitToUser(io, callerId, "call_timeout", { callId: newCall._id });
                    await emitToUser(io, receiverId, "call_timeout", { callId: newCall._id });

                    if (conversationId) {
                        let callMsg = await Message.create({
                            conversationId,
                            senderId: callerId,
                            type: 'call',
                            content: checkCall.type === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại',
                            callInfo: {
                                duration: 0,
                                status: 'missed',
                                callType: checkCall.type
                            }
                        });

                        callMsg = await callMsg.populate('senderId', 'username avatar fullName');
                        io.to(conversationId.toString()).emit('newMessage', callMsg);
                    }
                }

                delete callTimers[newCall._id];
            }, CALL_TIMEOUT_SECONDS * 1000);

        } catch (err) {
            console.error("call_init error:", err);
        }
    });

    // ==========================================
    // 2. ACCEPT
    // ==========================================
    socket.on("call_accept", async ({ callId, callerId }) => {
        try {
            await Call.findByIdAndUpdate(callId, {
                status: 'accepted',
                startTime: new Date()
            });

            await emitToUser(io, callerId, "call_accepted", {
                callId,
                receiverId: socket.user.id
            });

        } catch (err) {
            console.error(err);
        }
    });

    // ==========================================
    // 3. REJECT
    // ==========================================
    socket.on("call_reject", async ({ callId, callerId, conversationId }) => {
        try {

            if (callTimers[callId]) {
                clearTimeout(callTimers[callId]);
                delete callTimers[callId];
            }

            await Call.findByIdAndUpdate(callId, {
                status: 'rejected',
                endTime: new Date()
            });

            await emitToUser(io, callerId, "call_rejected", { callId });

            if (conversationId) {
                const callRecord = await Call.findById(callId);

                let callMsg = await Message.create({
                    conversationId,
                    senderId: callerId,
                    type: 'call',
                    content: callRecord?.type === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại',
                    callInfo: {
                        duration: 0,
                        status: 'rejected',
                        callType: callRecord?.type
                    }
                });

                callMsg = await callMsg.populate('senderId', 'username avatar fullName');
                io.to(conversationId.toString()).emit('newMessage', callMsg);
            }

        } catch (err) {
            console.error(err);
        }
    });

    // ==========================================
    // 4. WEBRTC SIGNALING
    // ==========================================
    socket.on("webrtc_offer", async ({ receiverId, offer, callId }) => {
        await emitToUser(io, receiverId, "webrtc_offer", {
            offer,
            senderId: socket.user.id,
            callId
        });
    });

    socket.on("webrtc_answer", async ({ receiverId, answer, callId }) => {
        await emitToUser(io, receiverId, "webrtc_answer", {
            answer,
            senderId: socket.user.id,
            callId
        });
    });

    socket.on("webrtc_ice_candidate", async ({ receiverId, candidate, callId }) => {
        await emitToUser(io, receiverId, "webrtc_ice_candidate", {
            candidate,
            senderId: socket.user.id,
            callId
        });
    });

    // ==========================================
    // 5. END CALL
    // ==========================================
    socket.on("call_end", async ({ callId, partnerId, conversationId }) => {
        try {
            if (!callId) return;

            const callRecord = await Call.findById(callId);
            if (!callRecord) return;

            const endTime = new Date();
            const duration = callRecord.startTime
                ? Math.round((endTime - callRecord.startTime) / 1000)
                : 0;

            await Call.findByIdAndUpdate(callId, {
                status: 'ended',
                endTime,
                duration
            });

            await emitToUser(io, partnerId, "call_ended", {
                callId,
                duration
            });

            if (conversationId) {
                let callMsg = await Message.create({
                    conversationId,
                    senderId: callRecord.callerId,
                    type: 'call',
                    content: callRecord.type === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại',
                    callInfo: { duration, status: 'ended', callType: callRecord.type }
                });

                callMsg = await callMsg.populate('senderId', 'username avatar fullName');
                io.to(conversationId.toString()).emit('newMessage', callMsg);
            }

        } catch (err) {
            console.error(err);
        }
    });

    // ==========================================
    // 6. DISCONNECT
    // ==========================================
    socket.on("disconnect", async () => {
        if (!socket.user) return;

        const userId = socket.user.id;

        const activeCall = await Call.findOne({
            'participants.userId': userId,
            status: { $in: ['calling', 'ringing', 'accepted', 'connecting', 'ongoing'] }
        });

        if (!activeCall) return;

        const endTime = new Date();
        const duration = activeCall.startTime
            ? Math.round((endTime - activeCall.startTime) / 1000)
            : 0;

        await Call.findByIdAndUpdate(activeCall._id, {
            status: 'ended',
            endTime,
            duration,
            endedReason: 'network_error'
        });

        const partner = activeCall.participants.find(
            p => p.userId.toString() !== userId.toString()
        );

        if (partner) {
            await emitToUser(io, partner.userId, "call_ended", {
                callId: activeCall._id,
                duration,
                endedReason: 'network_error'
            });
        }
    });
};