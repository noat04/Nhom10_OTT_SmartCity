// src/pages/Dashboard.jsx
import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import CreateGroupModal from '../components/modals/CreateGroupModal';

const Dashboard = () => {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  return (
    <MainLayout>
      <div className="flex h-full w-full">
        
        {/* CỘT TRÁI: SIDEBAR */}
        <aside className="w-80 md:w-96 shrink-0 z-10 border-r border-gray-200">
          <Sidebar 
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => setActiveConversationId(id)}
            onOpenCreateGroup={() => setIsGroupModalOpen(true)}
          />
        </aside>

        {/* CỘT PHẢI: KHUNG CHAT / MÀN HÌNH CHỜ (Đã bỏ padding) */}
        <main className="flex-1 min-w-0 bg-[#f0f2f5]">
          {activeConversationId ? (
            <ChatWindow conversationId={activeConversationId} />
          ) : (
            // Màn hình chờ: Chiếm full khung h-full w-full, không có viền bo tròn nữa
            <div className="flex flex-col items-center justify-center h-full w-full text-center">
              <img 
                src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" 
                alt="Welcome" 
                className="w-48 h-48 mb-6 opacity-80"
              />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Chào mừng đến với OTT Chat</h2>
              <p className="text-gray-500 max-w-md">
                Khám phá những tiện ích giao tiếp tuyệt vời. Chọn một cuộc trò chuyện ở bên trái hoặc bắt đầu tạo nhóm mới.
              </p>
            </div>
          )}
        </main>

      </div>

      <CreateGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)}
        onCreate={(data) => {
          console.log("Tạo nhóm với data:", data);
          setIsGroupModalOpen(false);
        }}
      />
    </MainLayout>
  );
};

export default Dashboard;