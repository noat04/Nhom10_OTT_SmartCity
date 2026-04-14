// src/components/modals/IncomingCallModal.jsx
import React, { useEffect } from 'react';
import Avatar from '../common/Avatar';

const IncomingCallModal = ({ 
  isOpen, 
  callerName = "Người gọi ẩn danh", 
  callerAvatar, 
  isVideoCall = false, 
  onAccept, 
  onDecline 
}) => {
  
  // Tùy chọn: Play âm thanh chuông gọi đến khi Modal mở
  useEffect(() => {
    let audio;
    if (isOpen) {
      // Giả sử bạn có file ringtone.mp3 trong thư mục public
      // audio = new Audio('/ringtone.mp3');
      // audio.loop = true;
      // audio.play().catch(e => console.log("Trình duyệt chặn auto-play âm thanh", e));
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 flex flex-col items-center border border-gray-700 animate-slide-up">
        
        {/* Khối Avatar với hiệu ứng tỏa sóng (Ping effect) */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          <div className="relative z-10">
            <Avatar src={callerAvatar} alt={callerName} size="xl" className="border-4 border-gray-800" />
          </div>
        </div>

        {/* Thông tin người gọi */}
        <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
        <p className="text-gray-400 mb-8 flex items-center gap-2">
          {isVideoCall ? (
             <>
               <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
               Đang gọi video cho bạn...
             </>
          ) : (
             <>
               <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
               Đang gọi âm thanh...
             </>
          )}
        </p>

        {/* Cụm nút Trả lời / Từ chối */}
        <div className="flex w-full justify-center space-x-12">
          
          {/* Nút Từ chối */}
          <div className="flex flex-col items-center">
            <button 
              onClick={onDecline}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-transform hover:scale-105 focus:outline-none shadow-lg shadow-red-500/30"
            >
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            </button>
            <span className="text-gray-400 text-sm mt-3 font-medium">Từ chối</span>
          </div>

          {/* Nút Chấp nhận */}
          <div className="flex flex-col items-center">
            <button 
              onClick={onAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-transform hover:scale-105 focus:outline-none shadow-lg shadow-green-500/30 animate-bounce"
            >
               {isVideoCall ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
               ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
               )}
            </button>
            <span className="text-gray-400 text-sm mt-3 font-medium">Nghe máy</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;