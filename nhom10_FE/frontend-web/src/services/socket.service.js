// src/services/socket.service.js
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000"; // Ví dụ URL server deploy trên Railway/EC2 [cite: 1847]

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: {
          token: token, // Truyền JWT token để Node.js backend xác thực
        },
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Socket connected:", this.socket.id);
      });

      this.socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();