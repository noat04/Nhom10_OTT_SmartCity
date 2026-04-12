import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { chatService } from '../../services/chat.service';
import { useAuth } from '../../contexts/AuthContext';

const ChatWindow = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  // 1. Tất cả useState phải nằm trên đầu
  const [messages, setMessages] = useState([]);
  console.log(messages);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [lastSeenByPeer, setLastSeenByPeer] = useState(false);

  // State phân trang mới
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 2. Custom hook (Realtime)
  const { emitTyping, emitSeen } = useChat(
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
    }
  );

  // 3. Hook Load History (KHÔNG ĐƯỢC COMMENT - NẾU KHÔNG DÙNG THÌ ĐỂ TRỐNG TRONG TRY)
  // useEffect(() => {
  //   const fetchHistory = async () => {
  //     if (!conversationId) return;
  //     try {
  //       setIsLoading(true);
  //       const data = await chatService.getMessages(conversationId);
  //       const msgs = data?.messages || data || [];
  //       setMessages(msgs);
  //     } catch (err) {
  //       console.error("Lỗi load history:", err);
  //       setMessages([]);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   fetchHistory();
  // }, [conversationId]);
  // Hook Load History ban đầu (Page 1)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!conversationId) return;
      try {
        setIsLoading(true);
        // Gọi API với page = 1
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
      
      // Nối tin nhắn cũ lên ĐẦU mảng hiện tại
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
      // setLastSeenByPeer(false);
    }
  }, [conversationId, isLoading, emitSeen]); // Thêm đầy đủ dependency

  // 🔥 Hàm gửi message
  // const handleSendMessage = async (messageData) => {
  //   const payload = {
  //     conversationId,
  //     content: messageData.content,
  //     type: messageData.type || "text"
  //   };

  //   const tempId = Date.now();
  //   const optimisticMsg = {
  //     _id: tempId,
  //     senderId: currentUserId,
  //     content: payload.content,
  //     type: payload.type,
  //     isTemp: true,
  //     timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  //   };
    

  //   setMessages(prev => [...prev, optimisticMsg]);
  //   setLastSeenByPeer(false);

  //   try {
  //     const realMsg = await chatService.sendMessage(payload);
  //     setMessages(prev =>
  //       prev.map(m => (m._id === tempId ? realMsg : m))
  //     );
  //   } catch (err) {
  //     console.error("Lỗi gửi message:", err);
  //   }
  // };
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

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-full">
      <ChatHeader conversationId={conversationId} onClose={onClose} />

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
          onLoadMore={loadMoreMessages} // Truyền hàm xuống
          hasMore={hasMore} // Truyền cờ trạng thái xuống
        />
      )}

      <ChatInput onSendMessage={handleSendMessage} onTyping={emitTyping} />
    </div>
  );
};

export default ChatWindow;