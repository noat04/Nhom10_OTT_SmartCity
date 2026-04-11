// src/components/chat/ChatWindow.jsx
import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { chatService } from '../../services/chat.service';
import { useAuth } from '../../contexts/AuthContext';

const ChatWindow = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  
  // 1. KHỞI TẠO STATE (Luôn là mảng rỗng để không bị lỗi iterable)
  const [historyMessages, setHistoryMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);

  // Hook realtime (thêm fallback rỗng {} để phòng trường hợp hook bị lỗi)
  const chatHook = useChat(conversationId, user?.id || user?._id) || {};
  const realtimeMessages = chatHook.messages || [];
  const sendMessage = chatHook.sendMessage;
  const isTyping = chatHook.isTyping;
  const emitTyping = chatHook.emitTyping;
  const broadcastMessage = chatHook.broadcastMessage;

  // 2. GỌI API LẤY LỊCH SỬ TIN NHẮN
  useEffect(() => {
    const fetchHistory = async () => {
      if (!conversationId) return;
      
      try {
        setIsLoading(true);
        const data = await chatService.getMessages(conversationId);
        
        // 👉 ĐẶT LOG Ở ĐÂY ĐỂ XEM BACKEND TRẢ VỀ CÁI GÌ:
        console.log("🔍 Dữ liệu từ API History:", data);
        
        // Tạm thời bỏ vòng kiểm tra mảng để xem có bị lỗi không
        if (data && data.messages) {
           // Giả sử backend bọc trong biến messages
           setHistoryMessages(data.messages);
        } else if (Array.isArray(data)) {
           // Nếu nó là mảng chuẩn
           setHistoryMessages(data);
        } else {
           setHistoryMessages([]);
        }
        
      } catch (error) {
        console.error("Lỗi khi tải lịch sử tin nhắn:", error);
        setHistoryMessages([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [conversationId]);

  // 3. CẬP NHẬT TRẠNG THÁI TYPING
  useEffect(() => {
    if (isTyping) {
      setTypingUser('Người kia đang gõ...'); 
    } else {
      setTypingUser(null);
    }
  }, [isTyping]);

  // 4. XỬ LÝ GỬI TIN NHẮN
  // 2. 🔥 HÀM XỬ LÝ GỬI TIN NHẮN (Đã cập nhật để gọi API)
  const handleSendMessage = async (messageData) => {
    // 2.1. Đóng gói dữ liệu chuẩn theo Backend yêu cầu
    const payload = {
      conversationId: conversationId,
      content: messageData.content, 
      type: messageData.type || "text"
    };

    // 2.2. Optimistic UI: Hiển thị ngay lên màn hình cho mượt
    const optimisticMsg = {
      id: Date.now(), // ID tạm thời
      senderId: user?.id || user?._id,
      content: payload.content,
      type: payload.type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setHistoryMessages(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, optimisticMsg];
    });

     // 2.3. GỌI API GỬI LÊN BACKEND THỰC TẾ
    try {
      if (payload.type === 'text') {
        const responseData = await chatService.sendMessage(payload);
        
        // 👉 GỌI HÀM BÁO SOCKET (Đã sửa để gọi an toàn)
        if (typeof broadcastMessage === 'function') {
           broadcastMessage(responseData); 
        } else {
           console.warn("Hàm broadcastMessage chưa sẵn sàng!");
        }
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn API:", error);
    }
  };

  // 5. GỘP TIN NHẮN (Bọc mảng 2 lớp cực kỳ an toàn)
  const safeHistory = Array.isArray(historyMessages) ? historyMessages : [];
  const safeRealtime = Array.isArray(realtimeMessages) ? realtimeMessages : [];
  const allMessages = [...safeHistory, ...safeRealtime];

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 w-full">
      <ChatHeader conversationId={conversationId} onClose={onClose} />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        // Đảm bảo bạn truyền currentUserId={user?.id || user?._id} vào MessageList
        <MessageList 
          messages={allMessages} 
          typingUser={typingUser} 
          currentUserId={user?.id || user?._id} // <--- QUAN TRỌNG CHỖ NÀY
        />
      )}

      <ChatInput onSendMessage={handleSendMessage} onTyping={emitTyping} />
    </div>
  );
};

export default ChatWindow;