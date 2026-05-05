import { getSocket } from "./socket"; // Đảm bảo đường dẫn này trỏ đúng file socket của bạn

// 🔥 GỌI
export const callUser = (conversationId, receiverId, type = "video") => {
    const socket = getSocket();
    if (!socket) {
        console.log("❌ Lỗi: Chưa kết nối được Socket!");
        return;
    }
    socket.emit("call_init", {
        conversationId,
        receiverId,
        type,
    });
};

// ✅ ACCEPT
export const acceptCall = (callId, callerId) => {
    const socket = getSocket();
    if (socket) socket.emit("call_accept", { callId, callerId });
};

// ❌ REJECT
export const rejectCall = (callId, callerId, conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit("call_reject", { callId, callerId, conversationId });
};

// 🔚 END
export const endCall = (callId, partnerId, conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit("call_end", { callId, partnerId, conversationId });
};

export const sendOffer = (receiverId, offer, callId) => {
    const socket = getSocket();
    if (socket) socket.emit("webrtc_offer", { receiverId, offer, callId });
};

export const sendAnswer = (receiverId, answer, callId) => {
    const socket = getSocket();
    if (socket) socket.emit("webrtc_answer", { receiverId, answer, callId });
};

export const sendCandidate = (receiverId, candidate, callId) => {
    const socket = getSocket();
    if (socket) socket.emit("webrtc_ice_candidate", { receiverId, candidate, callId });
};

export const getCallSocket = () => getSocket();