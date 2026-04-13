// src/components/chat/MessageBubble.jsx
import React from 'react';
import TextMessage from './TextMessage';
import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import FileMessage from './FileMessage';
import SystemMessage from './SystemMessage';

const MessageBubble = ({
  type = 'text',
  content,
  url, 
  fileName,
  fileSize,
  isMine,
  senderAvatar,
  timestamp,
  status, 
  reactions = [], 
  onImageClick,
  onReact // BẮT BUỘC PHẢI NHẬN PROP NÀY VÀO ĐỂ CLICK
}) => {
  if (type === 'system') {
    return <SystemMessage content={content} />;
  }

  const renderContent = () => {
    switch (type) {
      case 'image': return <ImageMessage url={url} onImageClick={onImageClick} />;
     case 'video': 
      // 👉 SỬA DÒNG NÀY: Chỉ truyền url, không truyền onVideoClick
      return <VideoMessage url={url} />;
      case 'file': return <FileMessage fileUrl={url} fileName={fileName} fileSize={fileSize} isMine={isMine} />;
      case 'text':
      default: return <TextMessage content={content} />;
    }
  };

  const renderStatusIcon = () => {
    if (!isMine) return null;
    switch (status) {
      case 'sending': return <span className="text-gray-300 animate-pulse">○</span>; 
      case 'sent': return <span className="text-gray-300">✓</span>; 
      case 'delivered': return <span className="text-gray-300">✓✓</span>; 
      case 'seen': return <span className="text-blue-400 font-bold">đã xem</span>; 
      default: return null;
    }
  };
  const formatReaction = (reaction) => {
    switch (reaction) {
      case 'love': return '❤️';
      case 'haha': return '😆';
      case 'wow': return '😮';
      case 'sad': return '😢';
      case 'like': return '👍';
      case 'angry': return '😡';
      default: return reaction;
    }
  };
  

  return (
    <div className={`flex items-end mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
      
      {!isMine && (
        <img
          src={senderAvatar || "https://via.placeholder.com/40"}
          alt="avatar"
          className="w-8 h-8 rounded-full mr-2 shrink-0 object-cover border border-gray-200"
        />
      )}

      {/* CHÚ Ý: class "group" ở đây rất quan trọng để làm hiệu ứng hover */}
      <div className="relative group max-w-[75%] lg:max-w-[60%]">
        
        {/* ========================================== */}
        {/* 👉 [THÊM MỚI] BẢNG CHỌN EMOJI (Hiện khi hover) */}
        {/* ========================================== */}
        <div className={`hidden group-hover:flex absolute -top-8 ${isMine ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-full shadow-md px-2 py-1 space-x-3 z-10 text-lg`}>
          <button onClick={() => onReact && onReact('love')} className="hover:scale-125 transition-transform origin-bottom">❤️</button>
          <button onClick={() => onReact && onReact('haha')} className="hover:scale-125 transition-transform origin-bottom">😆</button>
          <button onClick={() => onReact && onReact('wow')} className="hover:scale-125 transition-transform origin-bottom">😮</button>
          <button onClick={() => onReact && onReact('sad')} className="hover:scale-125 transition-transform origin-bottom">😢</button>
          <button onClick={() => onReact && onReact('like')} className="hover:scale-125 transition-transform origin-bottom">👍</button>
          <button onClick={() => onReact && onReact('angry')} className="hover:scale-125 transition-transform origin-bottom">😡</button>
        </div>

        {/* Bóng tin nhắn chính */}
        <div
          className={`px-4 py-2.5 shadow-sm ${
            type === 'image' ? 'p-1 bg-transparent' : 
            isMine
              ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm border border-gray-200'
          }`}
        >
          {renderContent()}

          {/* Footer của Bubble: Thời gian & Trạng thái */}
          <div
            className={`flex items-center gap-1.5 mt-1.5 text-[10px] select-none ${
              type === 'image' ? 'absolute bottom-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded-full' :
              isMine ? 'text-blue-100 justify-end' : 'text-gray-400 justify-start'
            }`}
          >
            <span>{timestamp}</span>
            {renderStatusIcon()}
          </div>
        </div>

        {/* Vùng hiển thị Emoji đã thả */}
        {reactions?.length > 0 && (
          <div
            className={`absolute -bottom-3 ${
              isMine ? 'right-2' : 'left-2'
            } flex items-center bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm text-xs space-x-1 z-10`}
          >
            {reactions.map((reactionItem, index) => {
              // Nếu reactionItem là Object (từ API History) thì lấy .type, 
              // Còn nếu là chuỗi string (từ Socket bắn về) thì lấy chính nó.
              const icon = typeof reactionItem === 'object' ? reactionItem.type : reactionItem;
              
              return <span key={index}>{formatReaction(icon)}</span>;
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default MessageBubble;