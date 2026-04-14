import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000';
let socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect(); // Chủ động bóp cò ngắt kết nối
    socket = null;       // Reset lại biến
    console.log("Đã ngắt kết nối Socket an toàn!");
  }
};