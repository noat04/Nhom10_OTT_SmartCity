
import { io } from "socket.io-client";
let socket = null;

const LOCAL_IP = "192.168.1.16";

export const connectSocket = (token) => {
  if (socket) return socket;

  socket = io(`http://${LOCAL_IP}:3000`, {
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("force_logout", async () => {
    console.log("🚨 Bị đăng xuất do login thiết bị khác");

    const { logout } = require("../context/authContext");
    await logout();
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
