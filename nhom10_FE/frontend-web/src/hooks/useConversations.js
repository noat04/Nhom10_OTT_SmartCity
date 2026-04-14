// src/hooks/useConversations.js
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { chatService } from '../services/chat.service';

const SOCKET_SERVER_URL = 'http://localhost:3000'; // Sửa cổng 5000 hoặc 3000 cho khớp với Backend của bạn
let socket;

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Chạy 1 lần khi component mount (Gọi API lấy danh sách)
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await chatService.getConversations();
        setConversations(data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách hội thoại:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // 2. 🔥 MỚI: Lắng nghe trạng thái Online/Offline qua Socket
  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_SERVER_URL, {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket'] // Ép dùng WebSocket để tránh lỗi kết nối
      });
    }

    // A. Xử lý khi Backend gửi mảng danh sách những người đang online
    const handleUpdateOnlineUsers = (onlineUserIdsArray) => {
      setConversations(prev => 
        prev.map(conv => {
          // LƯU Ý: Thay đổi 'conv.id' thành trường ID của người kia tùy theo API của bạn
          // Ví dụ: conv.friendId, conv.userId, hoặc conv.participants[0]._id
          const friendId = conv.id || conv.friendId; 
          
          return {
             ...conv,
             // Nếu ID người kia có trong mảng online -> cho isOnline = true
             isOnline: onlineUserIdsArray.includes(String(friendId)) 
          };
        })
      );
    };

    // B. Xử lý khi Backend báo có 1 người vừa online hoặc offline (user_status_changed)
    const handleStatusChange = ({ userId, status }) => {
      setConversations(prev => 
        prev.map(conv => {
          const friendId = conv.id || conv.friendId;
          
          if (String(friendId) === String(userId)) {
            return { ...conv, isOnline: status === 'online' };
          }
          return conv;
        })
      );
    };

    // Bật lắng nghe
    socket.on('updateOnlineUsers', handleUpdateOnlineUsers);
    socket.on('user_status_changed', handleStatusChange);

    // Dọn dẹp khi unmount
    return () => {
      socket.off('updateOnlineUsers', handleUpdateOnlineUsers);
      socket.off('user_status_changed', handleStatusChange);
    };
  }, []);

  // Trả ra các giá trị cần thiết cho UI
  return { conversations, isLoading, error, setConversations };
};

// ==========================================
// 3. 🔥 HÀM NGẮT KẾT NỐI (Dùng lúc Đăng Xuất)
// ==========================================
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect(); // Tắt cầu dao
    socket = null;       // Reset biến
    console.log("✅ Đã ngắt kết nối Socket an toàn!");
  }
};