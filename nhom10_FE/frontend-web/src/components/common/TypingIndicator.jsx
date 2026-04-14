// Một component nhỏ (thường là 3 dấu chấm nhảy múa 💬) xuất hiện ở dưới cùng của MessageList khi nhận được sự kiện onTyping(true) qua Socket.io từ phía người kia
import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1.5 p-2 bg-gray-100 rounded-2xl w-max">
      {/* Sử dụng animation "animate-bounce" mặc định của Tailwind.
        Dùng style animationDelay để các dấu chấm nảy lệch nhịp nhau tạo hiệu ứng sóng.
      */}
      <div 
        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" 
        style={{ animationDelay: '0ms' }}
      ></div>
      <div 
        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" 
        style={{ animationDelay: '150ms' }}
      ></div>
      <div 
        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" 
        style={{ animationDelay: '300ms' }}
      ></div>
    </div>
  );
};

export default TypingIndicator;