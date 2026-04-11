// src/components/chat/MessageList.jsx
import React, { useRef, useEffect } from 'react';

const MessageList = ({ 
  messages, 
  typingUser, 
  currentUserId, // ID của người dùng hiện tại (Nhớ truyền đúng user._id từ ChatWindow)
  onLoadMore, 
  hasMore 
}) => {
  const messagesEndRef = useRef(null);
  const listContainerRef = useRef(null);

  // 1. AUTO-SCROLL: Tự động cuộn xuống cuối cùng
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // 2. INFINITE SCROLL: Bắt sự kiện cuộn ngược lên trên
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  const shouldShowTimeSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true; 
    return currentMsg.date !== previousMsg.date; 
  };

  return (
    <div 
      ref={listContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
    >
      {hasMore && (
        <div className="text-center text-xs text-gray-400 py-2">
          Cuộn lên để tải thêm tin nhắn...
        </div>
      )}

      {messages.map((msg, index) => {
        const previousMsg = index > 0 ? messages[index - 1] : null;
        const showSeparator = shouldShowTimeSeparator(msg, previousMsg);

        // ==========================================
        // 🔥 LỚP BẢO VỆ KIỂM TRA ID (FIX LỖI NẰM 1 BÊN)
        // ==========================================
        // Lấy ID người gửi (Hỗ trợ cả object populate từ MongoDB)
        const senderId = msg?.senderId || msg?.sender?._id || msg?.sender || msg?.userId;
        
        // Kiểm tra xem tin nhắn có phải của mình không
        const isMine = Boolean(currentUserId && senderId && currentUserId === senderId);

        return (
          <React.Fragment key={msg.id || msg._id || index}>
            
            {/* VẠCH PHÂN CÁCH THỜI GIAN */}
            {showSeparator && (
              <div className="flex justify-center my-4">
                <span className="bg-gray-200 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full">
                  {msg.date || "Hôm nay"}
                </span>
              </div>
            )}

            {/* BONG BÓNG TIN NHẮN */}
            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              
              <div
                className={`max-w-[75%] lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                  isMine
                    ? 'bg-blue-500 text-white rounded-tr-none'
                    : 'bg-white text-gray-900 rounded-tl-none border border-gray-200'
                }`}
              >
                {/* Nội dung tin nhắn */}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content || msg.text}
                </p>

                {/* Thời gian gửi */}
                <div 
                  className={`flex justify-end items-center mt-1 text-[10px] ${
                    isMine ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {/* Icon trạng thái (Chỉ hiện cho tin nhắn của mình) */}
                  {isMine && <span className="ml-1">✓</span>}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* TRẠNG THÁI "ĐANG GÕ..." */}
      {typingUser && (
        <div className="flex justify-start">
          <div className="bg-white text-gray-500 px-4 py-3 rounded-2xl shadow-sm rounded-tl-none border border-gray-200">
            <p className="text-sm flex items-center gap-1">
              <span className="font-medium text-gray-700">{typingUser}</span> đang gõ
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            </p>
          </div>
        </div>
      )}

      {/* DIV NÀY DÙNG ĐỂ KÉO SCROLL XUỐNG CUỐI */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;