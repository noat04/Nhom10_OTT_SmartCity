// Đại diện cho một tin nhắn đơn lẻ. Đây là component cần tính tái sử dụng cao nhất và phải xử lý được hai trạng thái: Tin gửi đi (nằm bên phải, nền xanh/tím) và Tin nhận được (nằm bên trái, nền xám/trắng kèm Avatar người gửi).

// Các biến thể (Sub-components) bên trong MessageBubble: Dựa vào trường type của tin nhắn lưu trong Database để render cho đúng:

// TextMessage: Render chữ bình thường.

// ImageMessage / VideoMessage: Render thẻ <img /> hoặc <video /> (đường dẫn lấy từ AWS S3). Khi click vào có thể mở bự ra (Lightbox).

// FileMessage: Render một ô chứa icon file (PDF, Docx), tên file, dung lượng và nút Download.

// SystemMessage: Dạng tin nhắn hệ thống nằm ở giữa màn hình (Ví dụ: "Hải đã thêm Phong vào nhóm", "Cuộc gọi nhỡ").

// Các thành phần đính kèm ở mỗi Bubble:

// Thời gian gửi: Nhỏ mờ ở góc dưới tin nhắn.

// Trạng thái (Message Status): Các icon nhỏ (đang gửi, đã gửi, đã nhận, đã xem) - thường chỉ hiện ở tin nhắn của chính mình.

// Reaction (Tùy chọn): Nơi hiển thị các emoji thả tim, haha (giống Messenger).
import React from 'react';
import TextMessage from './TextMessage';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import SystemMessage from './SystemMessage';
const MessageBubble = ({
  type = 'text', // 'text' | 'image' | 'file' | 'system'
  content,
  url, // Dùng cho ảnh/video/file
  fileName,
  fileSize,
  isMine,
  senderAvatar,
  timestamp,
  status, // 'sending' | 'sent' | 'delivered' | 'seen'
  reactions = [], // Array chứa emoji, VD: ['❤️', '😂']
  onImageClick // Hàm trigger mở Lightbox
}) => {
  // Rẽ nhánh: Nếu là tin nhắn hệ thống, render kiểu khác hoàn toàn
  if (type === 'system') {
    return <SystemMessage content={content} />;
  }

  // Hàm render nội dung bên trong Bubble dựa theo type
  const renderContent = () => {
    switch (type) {
      case 'image':
        return <ImageMessage url={url} onImageClick={onImageClick} />;
      case 'file':
        return <FileMessage fileUrl={url} fileName={fileName} fileSize={fileSize} isMine={isMine} />;
      case 'text':
      default:
        return <TextMessage content={content} />;
    }
  };

  // Hàm render Icon trạng thái tin nhắn (Chỉ dành cho isMine)
  const renderStatusIcon = () => {
    if (!isMine) return null;
    switch (status) {
      case 'sending':
        return <span className="text-gray-300 animate-pulse">○</span>; // Vòng tròn nhỏ
      case 'sent':
        return <span className="text-gray-300">✓</span>; // 1 dấu tick
      case 'delivered':
        return <span className="text-gray-300">✓✓</span>; // 2 dấu tick
      case 'seen':
        return <span className="text-blue-400 font-bold">✓✓</span>; // 2 dấu tick xanh
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-end mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
      
      {/* 2.1. Avatar người gửi (Nằm bên trái nếu không phải mình gửi) */}
      {!isMine && (
        <img
          src={senderAvatar || "https://via.placeholder.com/40"}
          alt="avatar"
          className="w-8 h-8 rounded-full mr-2 shrink-0 object-cover border border-gray-200"
        />
      )}

      {/* 2.2. Bubble Container */}
      <div className="relative group max-w-[75%] lg:max-w-[60%]">
        
        {/* Bóng tin nhắn chính */}
        <div
          className={`px-4 py-2.5 shadow-sm ${
            type === 'image' ? 'p-1 bg-transparent' : // Nếu là ảnh thì bỏ padding và background mặc định
            isMine
              ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm border border-gray-200'
          }`}
        >
          {/* Nội dung */}
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

        {/* 2.3. Vùng hiển thị Emoji Reaction (Nếu có) */}
        {reactions.length > 0 && (
          <div
            className={`absolute -bottom-3 ${
              isMine ? 'right-2' : 'left-2'
            } flex items-center bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm text-xs space-x-1`}
          >
            {reactions.map((emoji, index) => (
              <span key={index}>{emoji}</span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default MessageBubble;