// // src/components/chat/ChatWindow.jsx
// import React, { useState, useEffect } from 'react';
// import { useChat } from '../../hooks/useChat';
// import axios from 'axios';
// import ChatHeader from './ChatHeader';
// import MessageList from './MessageList';
// import ChatInput from './ChatInput';
// import { chatService } from '../../services/chat.service';
// import { useAuth } from '../../contexts/AuthContext';

// // 👉 1. IMPORT HOOK QUẢN LÝ CONVERSATIONS ĐỂ LẤY THÔNG TIN REALTIME
// import { useConversations } from '../../hooks/useConversations'; 

// const ChatWindow = ({ conversationId, onClose }) => {
//   const { user } = useAuth();
//   const currentUserId = user?.id || user?._id;
//   // 👉 THÊM DÒNG NÀY ĐỂ DEBUG
//   console.log("ChatWindow nhận được ID:", conversationId);

//   // 👉 2. TÌM THÔNG TIN CUỘC TRÒ CHUYỆN HIỆN TẠI TỪ DANH SÁCH
//   const { conversations } = useConversations();
//   const currentChat = conversations.find(c => String(c.id || c._id) === String(conversationId)) || {};

//   // 1. Tất cả useState phải nằm trên đầu
//   const [messages, setMessages] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [typingUser, setTypingUser] = useState(null);
//   const [lastSeenByPeer, setLastSeenByPeer] = useState(false);

//   // State phân trang mới
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);

//   // 2. Custom hook (Realtime)
//   const { emitTyping, emitSeen, emitReaction } = useChat(
//     conversationId,
//     currentUserId,
//     (msg) => {
//       setMessages((prev) => {
//         const exists = prev.some(m => m._id === msg._id);
//         if (exists) return prev;
//         return [...prev, msg];
//       });
//       requestAnimationFrame(() => emitSeen());
//     },
//     (isTyping) => setTypingUser(isTyping ? "Người kia đang gõ..." : null),
//     (data) => {
//       if (data.userId !== currentUserId) {
//         setLastSeenByPeer(true);
//       }
//     },
//     (reactionData) => {
//       setMessages((prevMessages) => 
//         prevMessages.map((msg) => 
//           msg._id === reactionData.messageId 
//             ? { ...msg, reactions: reactionData.reactions }
//             : msg
//         )
//       );
//     }
//   );

//   // 3. Hook Load History
//   useEffect(() => {
//     const fetchHistory = async () => {
//       if (!conversationId) return;
//       try {
//         setIsLoading(true);
//         const res = await chatService.getMessages(conversationId, 1);
//         const fetchedMessages = res?.messages || res || [];
        
//         setMessages(fetchedMessages);
//         setPage(1);
//         setHasMore(res?.hasMore ?? fetchedMessages.length >= 20);
//       } catch (err) {
//         console.error("Lỗi load history:", err);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     fetchHistory();
//   }, [conversationId]);

//   // 🔥 Hàm Load thêm tin nhắn khi cuộn lên trên
//   const loadMoreMessages = async () => {
//     if (!hasMore) return;
//     try {
//       const nextPage = page + 1;
//       const res = await chatService.getMessages(conversationId, nextPage);
//       const olderMessages = res?.messages || res || [];
      
//       setMessages((prev) => [...olderMessages, ...prev]);
//       setPage(nextPage);
//       setHasMore(res?.hasMore ?? olderMessages.length >= 20);
//     } catch (error) {
//       console.error("Lỗi tải thêm tin nhắn:", error);
//     }
//   };

//   // 4. Hook xử lý Seen
//   useEffect(() => {
//     if (conversationId && !isLoading) {
//       emitSeen();
//     }
//   }, [conversationId, isLoading, emitSeen]);

//   // 🔥 Hàm gửi message
//   // 🔥 Hàm gửi message (CÓ UPLOAD AWS S3)
//   const handleSendMessage = async (messageData) => {
//     let finalContent = messageData.content;
//     let finalType = messageData.type || "text";

//     // 1. NẾU CÓ FILE: Gọi API xin Link -> Upload lên S3 -> Lấy Link S3
//     if (messageData.file) {
//       try {
//         const token = localStorage.getItem('token'); // Lấy token để gọi API (tùy vào cách bạn lưu)
        
//         // Gọi API Backend để lấy Presigned URL
//         const res = await axios.post('http://localhost:3000/api/upload/presigned-url', {
//           fileName: messageData.file.name,
//           fileType: messageData.file.type
//         }, {
//           headers: { Authorization: `Bearer ${token}` }
//         });

//         const { presignedUrl, fileUrl } = res.data.data;

//         // Upload file trực tiếp lên AWS S3
//         await fetch(presignedUrl, {
//           method: 'PUT',
//           body: messageData.file,
//           headers: {
//             'Content-Type': messageData.file.type,
//           },
//         });

//         // Gắn Link ảnh từ AWS S3 vào nội dung tin nhắn
//         finalContent = fileUrl; 
//       } catch (error) {
//         console.error("Lỗi upload file lên S3:", error);
//         alert("Upload file thất bại!");
//         return; // Dừng lại không gửi tin nhắn nữa nếu up file xịt
//       }
//     }

//     // Nếu rỗng tuếch thì bỏ qua
//     if (!finalContent) return;

//     // 2. GỬI TIN NHẮN ĐÃ CHỨA LINK S3 VÀO SOCKET VÀ DB
//     const payload = {
//       conversationId,
//       content: finalContent,
//       type: finalType
//     };

//     const tempId = Date.now();
//     const optimisticMsg = {
//       _id: tempId,
//       senderId: currentUserId,
//       content: payload.content,
//       type: payload.type,
//       isTemp: true,
//       createdAt: new Date().toISOString()
//     };

//     setMessages(prev => [...prev, optimisticMsg]);
//     setLastSeenByPeer(false);

//     try {
//       const realMsg = await chatService.sendMessage(payload);
//       setMessages(prev => prev.map(m => (m._id === tempId ? realMsg : m)));
//     } catch (err) {
//       console.error("Lỗi gửi message:", err);
//     }
//   };

//   const handleReactMessage = (messageId, reactionType) => {
//     emitReaction(messageId, reactionType);
//   };

//   return (
//     <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-full">
      
//       {/* 👉 3. BẮN DỮ LIỆU ĐÃ TÌM ĐƯỢC XUỐNG CHAT HEADER */}
//       <ChatHeader 
//         name={currentChat.name || currentChat.fullName || currentChat.username || "Đang tải..."}
//         avatar={currentChat.avatar || "https://via.placeholder.com/150"}
//         isOnline={currentChat.isOnline || false}
//         isGroup={currentChat.isGroup || false}
//         onClose={onClose}
//         onAudioCall={() => alert("Chức năng gọi thoại đang phát triển")}
//         onVideoCall={() => alert("Chức năng gọi Video đang phát triển")}
//         onToggleInfo={() => alert("Mở panel thông tin")}
//       />

//       {isLoading ? (
//         <div className="flex-1 flex items-center justify-center">
//           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//         </div>
//       ) : (
//         <MessageList
//           messages={messages}
//           typingUser={typingUser}
//           currentUserId={currentUserId}
//           lastSeenByPeer={lastSeenByPeer}
//           onLoadMore={loadMoreMessages} 
//           hasMore={hasMore} 
//           onReact={handleReactMessage}
//         />
//       )}

//       <ChatInput onSendMessage={handleSendMessage} onTyping={emitTyping} />
//     </div>
//   );
// };

// export default ChatWindow;
// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import axios from 'axios';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { chatService } from '../../services/chat.service';
import { useAuth } from '../../contexts/AuthContext';
import { useConversations } from '../../hooks/useConversations'; 

const ChatWindow = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const { conversations } = useConversations();
  const currentChat = conversations.find(c => String(c.id || c._id) === String(conversationId)) || {};

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [lastSeenByPeer, setLastSeenByPeer] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Hook Realtime
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

  // Hook Load History
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

  // Load thêm tin nhắn
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

  useEffect(() => {
    if (conversationId && !isLoading) {
      emitSeen();
    }
  }, [conversationId, isLoading, emitSeen]);

  // 🔥 ĐÃ SỬA: Hàm gửi message phân tách rõ ràng content và fileUrl
  const handleSendMessage = async (messageData) => {
    let finalContent = messageData.content;
    let finalType = messageData.type || "text";
    
    // Khai báo các biến lưu thông tin file
    let finalFileUrl = null;
    let finalFileName = null;
    let finalFileSize = null;

    if (messageData.file) {
      try {
        const token = localStorage.getItem('token'); 
        
        const res = await axios.post('http://localhost:3000/api/upload/presigned-url', {
          fileName: messageData.file.name,
          fileType: messageData.file.type
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { presignedUrl, fileUrl } = res.data.data;

        await fetch(presignedUrl, {
          method: 'PUT',
          body: messageData.file,
          headers: {
            'Content-Type': messageData.file.type,
          },
        });

        // Gán link AWS vào biến fileUrl
        finalFileUrl = fileUrl; 
        finalFileName = messageData.file.name;
        finalFileSize = messageData.file.size;

        // Nếu gửi ảnh mà không gõ chữ gì, cho một dòng chữ mặc định (Tùy chọn)
        if (!finalContent || !finalContent.trim()) {
            finalContent = "Đã gửi một tệp đính kèm";
        }

      } catch (error) {
        console.error("Lỗi upload file lên S3:", error);
        alert("Upload file thất bại!");
        return; 
      }
    }

    if (!finalContent && !finalFileUrl) return;

    // Gửi payload lên API Backend (Cần có fileUrl, fileName, fileSize)
    const payload = {
      conversationId,
      content: finalContent,
      type: finalType,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileSize: finalFileSize
    };

    const tempId = Date.now();
    const optimisticMsg = {
      _id: tempId,
      senderId: currentUserId,
      content: payload.content,
      type: payload.type,
      fileUrl: payload.fileUrl, // Đưa fileUrl vào tin nhắn ảo để hiện ra UI luôn
      fileName: payload.fileName,
      fileSize: payload.fileSize,
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