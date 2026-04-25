import { io } from "socket.io-client";
let socket = null;

const LOCAL_IP = "172.28.49.213";

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

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
