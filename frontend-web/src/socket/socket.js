import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (socket) return socket;

  socket = io("http://localhost:3000", {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connect error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

// notification
export const onNewNotification = (callback) => {
  if (!socket) return;
  socket.on("new_notification", callback);
};

export const offNewNotification = (callback) => {
  if (!socket) return;
  socket.off("new_notification", callback);
};

// friend realtime
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

// ✅ conversation realtime
export const onConversationCreated = (callback) => {
  if (!socket) return;
  socket.on("conversation_created", callback);
};

export const offConversationCreated = (callback) => {
  if (!socket) return;
  socket.off("conversation_created", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

//Chat group:

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

export const onGroupInfoUpdated = (callback) => {
  if (!socket) return;
  socket.on("group_info_updated", callback);
};

export const onGroupMembersAdded = (callback) => {
  if (!socket) return;
  socket.on("group_members_added", callback);
};

export const onGroupMemberRemoved = (callback) => {
  if (!socket) return;
  socket.on("group_member_removed", callback);
};

export const onGroupLeft = (callback) => {
  if (!socket) return;
  socket.on("group_left", callback);
};

export const onGroupAdminChanged = (callback) => {
  if (!socket) return;
  socket.on("group_admin_changed", callback);
};

export const onMessageUnsent = (callback) => {
  if (!socket) return;
  socket.on("message_unsent", callback);
};


// ================= MESSAGE REALTIME =================
export const onReceiveMessage = (callback) => {
  if (!socket) return;
  socket.on("receive_message", callback);
};

export const offReceiveMessage = (callback) => {
  if (!socket) return;
  socket.off("receive_message", callback);
};

export const onMessageUpdated = (callback) => {
  if (!socket) return;
  socket.on("message_updated", callback);
};

export const offMessageUpdated = (callback) => {
  if (!socket) return;
  socket.off("message_updated", callback);
};

export const onMessageDeleted = (callback) => {
  if (!socket) return;
  socket.on("message_deleted", callback);
};

export const offMessageDeleted = (callback) => {
  if (!socket) return;
  socket.off("message_deleted", callback);
};

export const onMessageReacted = (callback) => {
  if (!socket) return;
  socket.on("message_reacted", callback);
};

export const offMessageReacted = (callback) => {
  if (!socket) return;
  socket.off("message_reacted", callback);
};

export const onMessagePinned = (callback) => {
  if (!socket) return;
  socket.on("message_pinned", callback);
};

export const offMessagePinned = (callback) => {
  if (!socket) return;
  socket.off("message_pinned", callback);
};