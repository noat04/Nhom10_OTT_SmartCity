// src/components/common/Avatar.jsx
import React from 'react';

const Avatar = ({ src, alt = "Avatar", size = 'md', isOnline = false, className = '' }) => {
  // Bản đồ kích thước chuẩn
  const sizeClasses = {
    sm: 'w-8 h-8',    // Dùng trong nhóm hoặc báo đã xem
    md: 'w-10 h-10',  // Dùng trong Sidebar / ChatHeader
    lg: 'w-16 h-16',  // Dùng trong Modal Info
    xl: 'w-24 h-24',  // Dùng trong trang Profile cá nhân
  };

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <img
        src={src || "https://via.placeholder.com/150"} // Ảnh fallback nếu không có src
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
      />
      {/* Hiển thị dấu chấm xanh nếu đang online */}
      {isOnline && (
        <span 
          className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 border-2 border-white rounded-full"
        ></span>
      )}
    </div>
  );
};

export default Avatar;