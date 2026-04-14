// Quản lý Socket Toàn cục bằng React Context
// Để các component như Sidebar (hiển thị thông báo, trạng thái online ) hay MessageList (hiển thị tin nhắn) 
// đều có thể lắng nghe chung một luồng sự kiện mà không cần truyền props phức tạp, bạn nên sử dụng 
// Context API tại src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket.service';

const SocketContext = createContext();

export const SocketProvider = ({ children, token }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      // Kết nối socket khi user đã đăng nhập (có token)
      socketService.connect(token);
      setSocket(socketService.getSocket());
    }

    return () => {
      // Ngắt kết nối khi user đăng xuất hoặc component unmount
      socketService.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);