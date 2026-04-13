// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { chatService } from '../../services/chat.service';
import { useAuth } from '../../contexts/AuthContext';

// 👉 1. IMPORT HOOK QUẢN LÝ CONVERSATIONS ĐỂ LẤY THÔNG TIN REALTIME
import { useConversations } from '../../hooks/useConversations'; 

const ChatWindow = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  // 👉 2. TÌM THÔNG TIN CUỘC TRÒ CHUYỆN HIỆN TẠI TỪ DANH SÁCH
  const { conversations } = useConversations();
  const currentChat = conversations.find(c => String(c.id || c._id) === String(conversationId)) || {};

  // 1. Tất cả useState phải nằm trên đầu
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [lastSeenByPeer, setLastSeenByPeer] = useState(false);

  // State phân trang mới
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 2. Custom hook (Realtime)
  const { emitTyping, emitSeen, emitReaction } = useChat(
    conversationId,
    currentUserId,
    (msg) => {
      setMessages((prev) => {
        const exists = prev.some(m => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => emitSeen());
    },
    (isTyping) => setTypingUser(isTyping ? "Người kia đang gõ..." : null),
    (data) => {
      if (data.userId !== currentUserId) {
        setLastSeenByPeer(true);
      }
    },
    (reactionData) => {
      setMessages((prevMessages) => 
        prevMessages.map((msg) => 
          msg._id === reactionData.messageId 
            ? { ...msg, reactions: reactionData.reactions }
            : msg
        )
      );
    }
  );

  // 3. Hook Load History
  useEffect(() => {
    const fetchHistory = async () => {
      if (!conversationId) return;
      try {
        setIsLoading(true);
        const res = await chatService.getMessages(conversationId, 1);
        const fetchedMessages = res?.messages || res || [];
        
        setMessages(fetchedMessages);
        setPage(1);
        setHasMore(res?.hasMore ?? fetchedMessages.length >= 20);
      } catch (err) {
        console.error("Lỗi load history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [conversationId]);

  // 🔥 Hàm Load thêm tin nhắn khi cuộn lên trên
  const loadMoreMessages = async () => {
    if (!hasMore) return;
    try {
      const nextPage = page + 1;
      const res = await chatService.getMessages(conversationId, nextPage);
      const olderMessages = res?.messages || res || [];
      
      setMessages((prev) => [...olderMessages, ...prev]);
      setPage(nextPage);
      setHasMore(res?.hasMore ?? olderMessages.length >= 20);
    } catch (error) {
      console.error("Lỗi tải thêm tin nhắn:", error);
    }
  };

  // 4. Hook xử lý Seen
  useEffect(() => {
    if (conversationId && !isLoading) {
      emitSeen();
    }
  }, [conversationId, isLoading, emitSeen]);

  // 🔥 Hàm gửi message
  const handleSendMessage = async (messageData) => {
    const payload = {
      conversationId,
      content: messageData.content,
      type: messageData.type || "text"
    };

    const tempId = Date.now();
    const optimisticMsg = {
      _id: tempId,
      senderId: currentUserId,
      content: payload.content,
      type: payload.type,
      isTemp: true,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setLastSeenByPeer(false);

    try {
      const realMsg = await chatService.sendMessage(payload);
      setMessages(prev => prev.map(m => (m._id === tempId ? realMsg : m)));
    } catch (err) {
      console.error("Lỗi gửi message:", err);
    }
  };

  const handleReactMessage = (messageId, reactionType) => {
    emitReaction(messageId, reactionType);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-full">
      
      {/* 👉 3. BẮN DỮ LIỆU ĐÃ TÌM ĐƯỢC XUỐNG CHAT HEADER */}
      <ChatHeader 
        name={currentChat.name || currentChat.fullName || currentChat.username || "Đang tải..."}
        avatar={currentChat.avatar || "https://via.placeholder.com/150"}
        isOnline={currentChat.isOnline || false}
        isGroup={currentChat.isGroup || false}
        onClose={onClose}
        onAudioCall={() => alert("Chức năng gọi thoại đang phát triển")}
        onVideoCall={() => alert("Chức năng gọi Video đang phát triển")}
        onToggleInfo={() => alert("Mở panel thông tin")}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          typingUser={typingUser}
          currentUserId={currentUserId}
          lastSeenByPeer={lastSeenByPeer}
          onLoadMore={loadMoreMessages} 
          hasMore={hasMore} 
          onReact={handleReactMessage}
        />
      )}

      <ChatInput onSendMessage={handleSendMessage} onTyping={emitTyping} />
    </div>
  );
};

export default ChatWindow;