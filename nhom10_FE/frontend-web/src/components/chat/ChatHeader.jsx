// Avatar & Tên: Hình đại diện và tên của bạn bè/nhóm.

// Trạng thái (Status): Dòng chữ nhỏ báo "Đang hoạt động", "Truy cập x phút trước" hoặc số lượng thành viên (nếu là nhóm).

// Nút Action: Các nút cực kỳ quan trọng cho hệ thống OTT của bạn:

// Nút Call (Audio) và Video Call: Kích hoạt WebRTC.

// Nút Thông tin (Info / Sidebar Right): Mở thêm một panel bên phải để xem file/ảnh đã chia sẻ hoặc danh sách thành viên nhóm.

// src/components/chat/ChatHeader.jsx
import React from 'react';

const ChatHeader = ({
  name = "Tên người dùng",
  avatar = "https://via.placeholder.com/150",
  isOnline = false,
  isGroup = false,
  statusText = "", 
  onAudioCall,
  onVideoCall,
  onToggleInfo,
  onClose // 👉 Nhận thêm hàm onClose
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      
      {/* 1. THÔNG TIN NGƯỜI DÙNG / NHÓM */}
      <div className="flex items-center">
        
        {/* 👉 Nút Back (Chỉ hiện trên Mobile) */}
        {onClose && (
          <button onClick={onClose} className="mr-3 p-2 text-gray-500 hover:bg-gray-100 rounded-full md:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="relative cursor-pointer" onClick={onToggleInfo}>
          <img
            src={avatar}
            alt={name}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
          {/* Dấu chấm Online */}
          {!isGroup && isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>

        <div className="ml-3 cursor-pointer" onClick={onToggleInfo}>
          <h2 className="text-base font-semibold text-gray-900 leading-tight">
            {name}
          </h2>
          <p className="text-xs text-gray-500">
            {isGroup ? (
              <span>{statusText || "Nhóm chat"}</span>
            ) : isOnline ? (
              <span className="text-green-600 font-medium">Đang hoạt động</span>
            ) : (
              <span>{statusText || "Ngoại tuyến"}</span>
            )}
          </p>
        </div>
      </div>

      {/* 2. CỤM NÚT HÀNH ĐỘNG (ACTIONS) */}
      <div className="flex items-center space-x-1 sm:space-x-3">
        
        {/* Nút Audio Call */}
        <button
          onClick={onAudioCall}
          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
          title="Gọi âm thanh"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>

        {/* Nút Video Call */}
        <button
          onClick={onVideoCall}
          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
          title="Gọi video"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Nút Mở Sidebar Thông tin (Info) */}
        <button
          onClick={onToggleInfo}
          className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors focus:outline-none ml-2"
          title="Thông tin hội thoại"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
      </div>
    </div>
  );
};

export default ChatHeader;