// src/hooks/useChat.js
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000'; // Phải khớp với backend
let socket;

export const useChat = (conversationId, currentUserId) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    if (!socket) {
      socket = io(SOCKET_SERVER_URL, {
        auth: { token: localStorage.getItem('token') } // Rất quan trọng nếu BE yêu cầu JWT
      });
    }

    socket.emit('joinConversation', conversationId);

    const handleNewMessage = (newMsg) => {
      // 💡 Kiểm tra ID an toàn để tránh trùng lặp
      const senderId = newMsg.senderId || newMsg.sender?._id || newMsg.sender || newMsg.userId;
      
      // Nếu tin nhắn là của NGƯỜI KHÁC gửi thì mới thêm vào (vì tin của mình đã hiện trước qua Optimistic UI)
      if (String(senderId) !== String(currentUserId)) {
        setMessages((prev) => [...prev, newMsg]);
      }
    };

    socket.on('newMessage', handleNewMessage);

    socket.on('typing', (data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.emit('leaveConversation', conversationId);
      socket.off('newMessage', handleNewMessage);
      socket.off('typing');
      setMessages([]); 
    };
  }, [conversationId, currentUserId]);

  const emitTyping = (typingStatus) => {
    socket?.emit('typing', { conversationId, isTyping: typingStatus });
  };

  // 👉 HÀM PHÁT TÍN HIỆU (Phải có ở đây)
  const broadcastMessage = (savedMsg) => {
    socket?.emit('notify_new_message', savedMsg);
  };

  // 👉 BẮT BUỘC PHẢI TRẢ VỀ HÀM NÀY
  return { messages, isTyping, emitTyping, broadcastMessage }; 
};