// src/components/sidebar/ConversationList.jsx
import React from 'react';
import ConversationItem from './ConversationItem'; // Import component bạn đã tạo trước đó

const ConversationList = ({ 
  conversations = [], 
  activeConversationId, 
  onSelectConversation 
}) => {
  
  // Xử lý Empty State: Khi người dùng chưa có bạn bè hoặc chưa nhắn tin với ai
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        <p className="text-sm text-gray-500 font-medium">
          Không có cuộc trò chuyện nào
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Hãy tìm kiếm bạn bè hoặc tạo nhóm mới để bắt đầu!
        </p>
      </div>
    );
  }

  return (
    // flex-1 giúp component tự động chiếm phần không gian còn lại của Sidebar
    // overflow-y-auto tạo thanh cuộn dọc (scrollbar) khi danh sách quá dài
    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          avatar={conversation.avatar}
          name={conversation.name}
          lastMessage={conversation.lastMessage}
          timestamp={conversation.timestamp}
          unreadCount={conversation.unreadCount}
          isOnline={conversation.isOnline}
          // So sánh ID để biết đoạn chat nào đang được chọn (highlight màu xanh)
          isActive={conversation.id === activeConversationId} 
          // Truyền ID lên component cha (MainLayout/Sidebar) để gọi API lấy tin nhắn
          onClick={() => onSelectConversation(conversation.id)} 
        />
      ))}
    </div>
  );
};

export default ConversationList;