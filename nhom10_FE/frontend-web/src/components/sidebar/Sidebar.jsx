// src/components/sidebar/Sidebar.jsx
import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import ConversationList from './ConversationList';
import SearchBar from './SearchBar';
import { useAuth } from "../../contexts/AuthContext";
import { useConversations } from '../../hooks/useConversations'; // Import Custom Hook

const Sidebar = ({ 
  activeConversationId, 
  onSelectConversation, 
  onOpenSettings,
  onOpenProfile
}) => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // 💡 Lấy dữ liệu và trạng thái từ Custom Hook (Chỉ cần 1 dòng!)
  const { conversations, isLoading } = useConversations();

  // Logic lọc danh sách theo từ khóa tìm kiếm
  const filteredConversations = conversations.filter(conv => {
    const nameToSearch = conv.name || conv.fullName || conv.username || '';
    return nameToSearch.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col w-80 border-r border-gray-200 bg-white h-full shrink-0">
      
      {/* ========================================== */}
      {/* PHẦN 1: HEADER (THÔNG TIN USER & ĐĂNG XUẤT)*/}
      {/* ========================================== */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 -ml-2 rounded-lg transition-colors flex-1 min-w-0" 
            onClick={onOpenProfile}
          >
            <Avatar src={user?.avatar || "https://i.pravatar.cc/150"} alt={user?.name} size="md" isOnline={true} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{user?.name || "Người dùng"}</p>
              <p className="text-xs text-gray-500 truncate">Xem thông tin</p>
            </div>
          </div>
          
          <button 
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all shrink-0"
            title="Cài đặt"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          </button>
        </div>

        <button 
          onClick={logout} 
          className="w-full flex items-center justify-center gap-2 text-sm text-red-500 bg-white border border-red-100 hover:bg-red-50 hover:border-red-200 py-1.5 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Đăng xuất
        </button>
      </div>

      {/* ========================================== */}
      {/* PHẦN 2: THANH TÌM KIẾM                      */}
      {/* ========================================== */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </div>

      {/* ========================================== */}
      {/* PHẦN 3: DANH SÁCH CUỘC TRÒ CHUYỆN           */}
      {/* ========================================== */}
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <ConversationList 
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
        />
      )}
    </div>
  );
};

export default Sidebar;