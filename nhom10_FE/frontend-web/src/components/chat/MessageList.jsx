// import React, { useRef, useEffect, useState } from 'react';
// import { groupMessagesByDate } from '../../utils/chat';

// const MessageList = ({ 
//   messages, 
//   typingUser, 
//   currentUserId,
//   lastSeenByPeer,
//   onLoadMore, 
//   hasMore 
// }) => {
//   const messagesEndRef = useRef(null);
//   const listContainerRef = useRef(null);
  
//   // State để khóa tính năng tự động scroll-bottom khi user đang cố tình xem tin cũ
//   const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);

//   // Nhóm tin nhắn theo ngày bằng hàm tiện ích
//   const groupedMessages = groupMessagesByDate(messages);

//   // AUTO-SCROLL xuống cuối (Chỉ chạy khi có tin nhắn MỚI, KHÔNG chạy khi load lịch sử cũ)
//   useEffect(() => {
//     if (!isAutoScrollDisabled) {
//       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }
//   }, [messages.length, typingUser, isAutoScrollDisabled]);

//   // INFINITE SCROLL: Bắt sự kiện cuộn ngược lên trên
//   const handleScroll = async (e) => {
//     const { scrollTop, scrollHeight } = e.target;
    
//     // Nếu user cuộn lên một chút, tắt auto-scroll
//     if (scrollHeight - scrollTop > e.target.clientHeight + 100) {
//       setIsAutoScrollDisabled(true);
//     } else {
//       setIsAutoScrollDisabled(false); // Nếu cuộn xuống sát đáy lại thì bật auto-scroll lại
//     }

//     // Nếu chạm đỉnh (scrollTop = 0) và còn trang tiếp theo
//     if (scrollTop === 0 && hasMore && onLoadMore) {
//       const prevScrollHeight = scrollHeight;
      
//       await onLoadMore(); // Đợi API trả dữ liệu về

//       // Điều chỉnh lại thanh cuộn để user không bị giật lên đỉnh
//       setTimeout(() => {
//         if (listContainerRef.current) {
//           const newScrollHeight = listContainerRef.current.scrollHeight;
//           listContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
//         }
//       }, 50);
//     }
//   };

//   // Tìm index của tin nhắn cuối cùng mình gửi để hiển thị chữ "Đã xem"
//   const lastMyMessageId = [...messages].reverse().find(m => {
//       const senderId = m?.senderId || m?.sender?._id || m?.sender || m?.userId;
//       return String(senderId) === String(currentUserId);
//   })?._id;

//   return (
//     <div 
//       ref={listContainerRef}
//       onScroll={handleScroll}
//       className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
//     >
//       {/* Loading Indicator khi scroll lên đỉnh */}
//       {hasMore && (
//         <div className="flex justify-center py-2">
//             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//         </div>
//       )}

//       {/* DUYỆT QUA CÁC NHÓM NGÀY */}
//       {Object.keys(groupedMessages).map((date) => (
//         <div key={date} className="space-y-4">
          
//           {/* Vạch phân cách thời gian (Ngày) */}
//           <div className="flex justify-center my-4">
//             <span className="bg-gray-200 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full">
//               {date}
//             </span>
//           </div>

//           {/* Render các bong bóng tin nhắn trong ngày đó */}
//           {groupedMessages[date].map((msg) => {
//             const senderId = msg?.senderId || msg?.sender?._id || msg?.sender || msg?.userId;
//             const isMine = Boolean(currentUserId && senderId && String(currentUserId) === String(senderId));
//             const isLastMyMsg = msg._id === lastMyMessageId;

//             return (
//               <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
//                 <div
//                   className={`max-w-[75%] lg:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
//                     isMine
//                       ? 'bg-blue-500 text-white rounded-tr-none'
//                       : 'bg-white text-gray-900 rounded-tl-none border border-gray-200'
//                   }`}
//                 >
//                   <p className="text-sm whitespace-pre-wrap leading-relaxed">
//                     {msg.content || msg.text}
//                   </p>

//                   <div className={`flex justify-end items-center mt-1 text-[10px] ${
//                       isMine ? 'text-blue-100' : 'text-gray-400'
//                     }`}
//                   >
//                     <span>
//                       {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
//                     </span>
                    
//                     {/* LOGIC HIỂN THỊ "ĐÃ XEM" CHÍNH XÁC */}
//                     {isMine && isLastMyMsg && lastSeenByPeer ? (
//                       <span className="ml-2 font-bold text-white">Đã xem</span>
//                     ) : (
//                       isMine && <span className="ml-1">✓</span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       ))}

//       {/* TRẠNG THÁI "ĐANG GÕ..." */}
//       {typingUser && (
//         <div className="flex justify-start">
//           <div className="bg-white text-gray-500 px-4 py-3 rounded-2xl shadow-sm rounded-tl-none border border-gray-200">
//             <p className="text-sm flex items-center gap-1">
//               <span className="font-medium text-gray-700">{typingUser}</span>
//               <span className="animate-bounce">.</span>
//               <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
//               <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
//             </p>
//           </div>
//         </div>
//       )}

//       {/* NEO ĐỂ CUỘN */}
//       <div ref={messagesEndRef} />
//     </div>
//   );
// };

// export default MessageList;
import React, { useRef, useEffect, useState } from 'react';
import { groupMessagesByDate } from '../../utils/chat';
import MessageBubble from './MessageBubble'; // Import component MessageBubble của bạn

const MessageList = ({ 
  messages, 
  typingUser, 
  currentUserId,
  lastSeenByPeer,
  onLoadMore, 
  hasMore,
  onReact // Truyền hàm thả tim từ ChatWindow xuống (Nếu có)
}) => {
  const messagesEndRef = useRef(null);
  const listContainerRef = useRef(null);
  
  const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);

  const groupedMessages = groupMessagesByDate(messages);

  useEffect(() => {
    if (!isAutoScrollDisabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, typingUser, isAutoScrollDisabled]);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight } = e.target;
    
    if (scrollHeight - scrollTop > e.target.clientHeight + 100) {
      setIsAutoScrollDisabled(true);
    } else {
      setIsAutoScrollDisabled(false); 
    }

    if (scrollTop === 0 && hasMore && onLoadMore) {
      const prevScrollHeight = scrollHeight;
      await onLoadMore(); 
      setTimeout(() => {
        if (listContainerRef.current) {
          const newScrollHeight = listContainerRef.current.scrollHeight;
          listContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
        }
      }, 50);
    }
  };

  // Tìm ID tin nhắn cuối cùng của mình để xử lý logic "Đã xem"
  const lastMyMessageId = [...messages].reverse().find(m => {
      const senderId = m?.senderId || m?.sender?._id || m?.sender || m?.userId;
      return String(senderId) === String(currentUserId);
  })?._id;

  return (
    <div 
      ref={listContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
    >
      {hasMore && (
        <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* DUYỆT QUA CÁC NHÓM NGÀY */}
      {Object.keys(groupedMessages).map((date) => (
        <div key={date} className="space-y-2">
          
          {/* Vạch phân cách thời gian */}
          <div className="flex justify-center my-6">
            <span className="bg-gray-200 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full">
              {date}
            </span>
          </div>

          {/* RENDER COMPONENT MESSAGE BUBBLE */}
          {groupedMessages[date].map((msg) => {
            const senderId = msg?.senderId || msg?.sender?._id || msg?.sender || msg?.userId;
            const isMine = Boolean(currentUserId && senderId && String(currentUserId) === String(senderId));
            const isLastMyMsg = msg._id === lastMyMessageId;

            // Xử lý Status (Đang gửi, Đã gửi, Đã xem)
            let messageStatus = 'sent';
            if (msg.isTemp) messageStatus = 'sending';
            else if (isMine && isLastMyMsg && lastSeenByPeer) messageStatus = 'seen';

            return (
              <MessageBubble 
                key={msg._id}
                type={msg.type || 'text'}
                content={msg.content || msg.text}
                url={msg.fileUrl || msg.url} // Truyền URL ảnh/file
                fileName={msg.fileName}
                fileSize={msg.fileSize}
                isMine={isMine}
                senderAvatar={msg.senderAvatar || msg.sender?.avatar} // Lấy avatar người gửi
                timestamp={new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                status={messageStatus}
                reactions={msg.reactions}
                onReact={(emoji) => onReact && onReact(msg._id, emoji)} // Chuyển tiếp sự kiện thả tim lên cha
              />
            );
          })}
        </div>
      ))}

      {/* TRẠNG THÁI ĐANG GÕ */}
      {typingUser && (
        <div className="flex justify-start mb-4">
          <div className="bg-white text-gray-500 px-4 py-3 rounded-2xl shadow-sm rounded-tl-none border border-gray-200">
            <p className="text-sm flex items-center gap-1">
              <span className="font-medium text-gray-700">{typingUser}</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            </p>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;