import { io } from "socket.io-client";

let socket = null;
const LOCAL_IP = "192.168.1.16"; // IP máy tính chạy backend

// ======================================
// 1. KẾT NỐI VÀ QUẢN LÝ SOCKET
// ======================================
export const connectSocket = (token) => {
  if (socket) return socket;

  socket = io(`http://${LOCAL_IP}:3000`, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("force_logout", async () => {
    console.log("🚨 Bị đăng xuất do login thiết bị khác");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ======================================
// 2. REALTIME THÔNG BÁO & KẾT BẠN
// ======================================
export const onNewNotification = (callback) => {
  if (!socket) return;
  socket.on("new_notification", callback);
};
export const offNewNotification = (callback) => {
  if (!socket) return;
  socket.off("new_notification", callback);
};

export const onFriendRequestReceived = (callback) => {
  if (!socket) return;
  socket.on("friend_request_received", callback);
};
export const offFriendRequestReceived = (callback) => {
  if (!socket) return;
  socket.off("friend_request_received", callback);
};

export const onFriendRequestAccepted = (callback) => {
  if (!socket) return;
  socket.on("friend_request_accepted", callback);
};
export const offFriendRequestAccepted = (callback) => {
  if (!socket) return;
  socket.off("friend_request_accepted", callback);
};

export const onFriendRequestRejected = (callback) => {
  if (!socket) return;
  socket.on("friend_request_rejected", callback);
};
export const offFriendRequestRejected = (callback) => {
  if (!socket) return;
  socket.off("friend_request_rejected", callback);
};

export const onFriendRequestSent = (callback) => {
  if (!socket) return;
  socket.on("friend_request_sent", callback);
};
export const offFriendRequestSent = (callback) => {
  if (!socket) return;
  socket.off("friend_request_sent", callback);
};

// ======================================
// 3. REALTIME CONVERSATION & GROUP CHAT 
// ======================================
export const onConversationCreated = (callback) => {
  if (!socket) return;
  socket.on("conversation_created", callback);
};
export const offConversationCreated = (callback) => {
  if (!socket) return;
  socket.off("conversation_created", callback);
};

export const onConversationUpdated = (callback) => {
  if (!socket) return;
  socket.on("conversation_updated", callback);
};
export const offConversationUpdated = (callback) => {
  if (!socket) return;
  socket.off("conversation_updated", callback);
};

export const onGroupCreated = (callback) => {
  if (!socket) return;
  socket.on("group_created", callback);
};
export const offGroupCreated = (callback) => {
  if (!socket) return;
  socket.off("group_created", callback);
};

export const onGroupInfoUpdated = (callback) => {
  if (!socket) return;
  socket.on("group_info_updated", callback);
};
export const offGroupInfoUpdated = (callback) => {
  if (!socket) return;
  socket.off("group_info_updated", callback);
};

export const onGroupMembersAdded = (callback) => {
  if (!socket) return;
  socket.on("group_members_added", callback);
};
export const offGroupMembersAdded = (callback) => {
  if (!socket) return;
  socket.off("group_members_added", callback);
};

export const onGroupMemberRemoved = (callback) => {
  if (!socket) return;
  socket.on("group_member_removed", callback);
};
export const offGroupMemberRemoved = (callback) => {
  if (!socket) return;
  socket.off("group_member_removed", callback);
};

export const onGroupLeft = (callback) => {
  if (!socket) return;
  socket.on("group_left", callback);
};
export const offGroupLeft = (callback) => {
  if (!socket) return;
  socket.off("group_left", callback);
};

export const onGroupAdminChanged = (callback) => {
  if (!socket) return;
  socket.on("group_admin_changed", callback);
};
export const offGroupAdminChanged = (callback) => {
  if (!socket) return;
  socket.off("group_admin_changed", callback);
};

// ======================================
// 4. REALTIME TIN NHẮN CHUNG (GLOBAL)
// ======================================
// Dùng để cập nhật khung danh sách bên ngoài (nháy tin mới nhất, tăng số chấm đỏ)
export const onNewMessageGlobal = (callback) => {
  if (!socket) return;
  socket.on("newMessage_global", callback);
};
export const offNewMessageGlobal = (callback) => {
  if (!socket) return;
  socket.off("newMessage_global", callback);
};

export const onMessageUnsent = (callback) => {
  if (!socket) return;
  socket.on("message_unsent", callback);
};
export const offMessageUnsent = (callback) => {
  if (!socket) return;
  socket.off("message_unsent", callback);
};