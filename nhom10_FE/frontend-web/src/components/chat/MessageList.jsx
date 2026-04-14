import React, { useRef, useEffect, useState } from 'react';
import { groupMessagesByDate } from '../../utils/chat';
import MessageBubble from './MessageBubble';

const MessageList = ({ 
  messages, 
  typingUser, 
  currentUserId,
  lastSeenByPeer,
  onLoadMore, 
  hasMore,
  onReact,
  onImageClick 
}) => {
  const messagesEndRef = useRef(null);
  const listContainerRef = useRef(null);
  const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);

  const groupedMessages = groupMessagesByDate(messages);

  useEffect(() => {
    if (!isAutoScrollDisabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, typingUser, isAutoScrollDisabled]);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight } = e.target;
    if (scrollHeight - scrollTop > e.target.clientHeight + 100) {
      setIsAutoScrollDisabled(true);
    } else {
      setIsAutoScrollDisabled(false); 
    }

    if (scrollTop === 0 && hasMore && onLoadMore) {
      const prevScrollHeight = scrollHeight;
      await onLoadMore(); 
      setTimeout(() => {
        if (listContainerRef.current) {
          const newScrollHeight = listContainerRef.current.scrollHeight;
          listContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
        }
      }, 50);
    }
  };

  // 👉 1. TÌM ID TIN NHẮN CUỐI CỦA MÌNH (Đã sửa logic nhận diện ID)
  const lastMyMessageId = [...messages].reverse().find(m => {
      let sId = m?.senderId;
      // Nếu là object (do populate), lấy trường _id
      if (sId && typeof sId === 'object') sId = sId._id || sId.id;
      if (!sId) sId = m?.sender?._id || m?.sender || m?.userId;
      
      return String(sId) === String(currentUserId);
  })?._id;

  return (
    <div 
      ref={listContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
    >
      {hasMore && (
        <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {Object.keys(groupedMessages).map((date) => (
        <div key={date} className="space-y-2">
          <div className="flex justify-center my-6">
            <span className="bg-gray-200 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full">
              {date}
            </span>
          </div>

          {groupedMessages[date].map((msg) => {
            // 👉 2. LOGIC NHẬN DIỆN NGƯỜI GỬI (QUAN TRỌNG NHẤT)
            let sId = msg?.senderId;
            // Nếu senderId là object { _id, username... } thì lấy cái _id ra để so sánh
            if (sId && typeof sId === 'object') sId = sId._id || sId.id;
            if (!sId) sId = msg?.sender?._id || msg?.sender || msg?.userId;

            const isMine = Boolean(currentUserId && sId && String(currentUserId) === String(sId));
            const isLastMyMsg = msg._id === lastMyMessageId;

            let messageStatus = 'sent';
            if (msg.isTemp) messageStatus = 'sending';
            else if (isMine && isLastMyMsg && lastSeenByPeer) messageStatus = 'seen';

            // 👉 3. LẤY AVATAR CHUẨN (Nếu đã populate thì lấy từ object)
            const displayAvatar = (typeof msg?.senderId === 'object' ? msg.senderId?.avatar : null) 
                                 || msg.senderAvatar 
                                 || msg.sender?.avatar;

            return (
              <MessageBubble 
                key={msg._id}
                type={msg.type || 'text'}
                content={msg.content || msg.text}
                url={msg.fileUrl || msg.url} 
                fileName={msg.fileName}
                fileSize={msg.fileSize}
                isMine={isMine}
                senderAvatar={displayAvatar}
                timestamp={new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                status={messageStatus}
                reactions={msg.reactions}
                onReact={(emoji) => onReact && onReact(msg._id, emoji)}
                onImageClick={onImageClick}
              />
            );
          })}
        </div>
      ))}

      {typingUser && (
        <div className="flex justify-start mb-4">
          <div className="bg-white text-gray-500 px-4 py-3 rounded-2xl shadow-sm rounded-tl-none border border-gray-200">
            <p className="text-sm flex items-center gap-1">
              <span className="font-medium text-gray-700">{typingUser}</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            </p>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;