import { io } from "socket.io-client";

let socket = null;
const socket1 = io("http://localhost:3000"); // port BE

export const connectSocket = (token) => {
  if (socket) return socket; // 🔥 CHẶN CONNECT LẦN 2

  socket = io("http://localhost:3000", {
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
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
export default socket1;
