//(Thành phần con của ConversationList): Đây là component quan trọng nhất trong Sidebar, 
//mỗi item đại diện cho 1 đoạn chat. Nó cần chứa:
// Avatar (của bạn bè hoặc avatar nhóm).
// ConversationName: Tên bạn bè hoặc tên nhóm.
// LastMessage: Đoạn preview tin nhắn cuối cùng (ví dụ: "Bạn: Alo đang làm gì đó?").
// Timestamp: Thời gian nhận/gửi tin nhắn cuối (ví dụ: 10:24 AM hoặc Hôm qua).
// UnreadBadge: Vòng tròn đỏ chứa số tin nhắn chưa đọc (nếu > 0).
import React from 'react';

const ConversationItem = ({
  avatar,
  name,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isOnline = false,
  isActive = false, // Props để xác định đoạn chat này có đang được chọn hay không
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center p-3 cursor-pointer transition-colors duration-200 border-b border-gray-50 ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-100 bg-white'
      }`}
    >
      {/* Cụm 1: Avatar và Trạng thái hoạt động */}
      <div className="relative shrink-0">
        <img
          src={avatar || "https://via.placeholder.com/150"} // Ảnh mặc định nếu không có avatar
          alt={`${name} avatar`}
          className="w-12 h-12 rounded-full object-cover border border-gray-200"
        />
        {/* Dấu chấm Online */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>

      {/* Cụm 2: Nội dung chữ (Tên, thời gian, tin nhắn cuối) */}
      <div className="flex-1 min-w-0 ml-3">
        
        {/* Hàng trên: Tên người dùng/nhóm và Thời gian */}
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {name}
          </h3>
          <span className="text-xs text-gray-500 shrink-0 ml-2">
            {timestamp}
          </span>
        </div>

        {/* Hàng dưới: Nội dung tin nhắn và Badge thông báo */}
        <div className="flex justify-between items-center">
          <p 
            className={`text-sm truncate ${
              unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}
          >
            {lastMessage}
          </p>
          
          {/* Vòng tròn đỏ đếm số tin nhắn chưa đọc */}
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;