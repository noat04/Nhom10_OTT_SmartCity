import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/api.config";

let socket = null;

export const connectSocket = (token) => {
  if (socket) {
    if (socket.auth?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      // Nếu biến socket còn tồn tại nhưng đường truyền bị ngắt -> chủ động ép nó kết nối lại
      if (!socket.connected) {
        socket.connect();
      }
      return socket;
    }
  }

  socket = io(BACKEND_URL, {
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
export const onFriendRemoved = (callback) => {
  if (!socket) return;
  socket.on("friend_removed", callback);
};

export const offFriendRemoved = (callback) => {
  if (!socket) return;
  socket.off("friend_removed", callback);
};

export const onConversationCreated = (callback) => {
  if (!socket) return;
  socket.on("conversation_created", callback);
};

export const offConversationCreated = (callback) => {
  if (!socket) return;
  socket.off("conversation_created", callback);
};

// ✅ realtime update conversation list khi có tin nhắn mới (Từ nhánh HEAD)
export const onNewMessageGlobal = (callback) => {
  if (!socket) return;
  socket.on("newMessage_global", callback);
};

export const offNewMessageGlobal = (callback) => {
  if (!socket) return;
  socket.off("newMessage_global", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ================= CHAT GROUP ================= (Từ nhánh origin/dam)
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

export const onGroupDissolved = (callback) => {
  if (!socket) return;
  socket.on("group_dissolved", callback);
};

export const offGroupDissolved = (callback) => {
  if (!socket) return;
  socket.off("group_dissolved", callback);
};

export const onGroupAdminChanged = (callback) => {
  if (!socket) return;
  socket.on("group_admin_changed", callback);
};

export const onMessageUnsent = (callback) => {
  if (!socket) return;
  socket.on("message_unsent", callback);
};

// ================= MESSAGE REALTIME ================= (Từ nhánh origin/dam)
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

export const onMessageDeletedForMe = (callback) => {
  if (!socket) return;
  socket.on("message_deleted_for_me", callback);
};

export const offMessageDeletedForMe = (callback) => {
  if (!socket) return;
  socket.off("message_deleted_for_me", callback);
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
