import { useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3000';
let socket;

export const useChat = (conversationId, currentUserId, onNewMessage, onTyping, onSeen) => {

  useEffect(() => {
    if (!conversationId) return;

    // connect socket 1 lần
    if (!socket) {
      socket = io(SOCKET_SERVER_URL, {
        auth: { token: localStorage.getItem('token') }
      });
    }

    // join room
    socket.emit('joinConversation', conversationId);

    // 🔥 nhận message realtime
    const handleNewMessage = (msg) => {
      const senderId = msg.senderId || msg.sender?._id || msg.sender;

      // ❗ chỉ nhận message người khác (tránh duplicate optimistic)
      if (String(senderId) !== String(currentUserId)) {
        onNewMessage?.(msg);
      }
    };

    socket.on('newMessage', handleNewMessage);

    // 🔥 typing
    socket.on('typing', (data) => {
      if (data.conversationId === conversationId) {
        onTyping?.(data.isTyping);
      }
    });

    return () => {
      socket.emit('leaveConversation', conversationId);
      socket.off('newMessage', handleNewMessage);
      socket.off('typing');
    };
  }, [conversationId]);

  // emit typing
  const emitTyping = (typingStatus) => {
    socket?.emit('typing', { conversationId, isTyping: typingStatus });
  };

  // emit seen
  const emitSeen = () => {
    socket?.emit('seen', { conversationId });
  };

  // 🔥 Xử lý nhận sự kiện SEEN từ server
  useEffect(() => {
    if (!conversationId) return;

    const handleSeen = (data) => {
      if (data.conversationId === conversationId) {
        onSeen?.(data);
      }
    };

    socket?.on('user_seen_messages', handleSeen);

    return () => {
      socket?.off('user_seen_messages', handleSeen);
    };
  }, [conversationId]);

  return { emitTyping, emitSeen };
};