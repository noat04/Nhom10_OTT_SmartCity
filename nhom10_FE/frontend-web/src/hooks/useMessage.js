// src/hooks/useMessage.js
import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
// Import các hàm tiện ích UI của bạn (ví dụ: react-toastify hoặc custom function)
// import { toast } from 'react-toastify'; 
// import { useCallModal } from '../context/CallContext';

export const useMessage = () => {
  const socket = useSocket();
  // const { openIncomingCallModal } = useCallModal(); // Giả sử bạn có hook quản lý Modal

  useEffect(() => {
    // Nếu chưa có kết nối socket thì không làm gì cả
    if (!socket) return;

    // Định nghĩa hàm xử lý sự kiện
    const handleNewNotification = (notification) => {
      if (notification.type === 'message') {
         // Hiển thị pop-up tin nhắn
         // toast.info(`Tin nhắn mới từ ${notification.senderName}`);
         console.log("Tin nhắn mới:", notification);
      } else if (notification.type === 'call') {
         // Mở Modal hiển thị yêu cầu Video Call
         // openIncomingCallModal(notification);
         console.log("Cuộc gọi đến:", notification);
      }
    };

    // Lắng nghe sự kiện từ server
    socket.on("newNotification", handleNewNotification);

    // Cleanup function: Gỡ bỏ đúng hàm lắng nghe khi component bị hủy hoặc socket thay đổi
    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket]); // Chạy lại effect nếu instance của socket thay đổi

  // Bạn có thể return về một state hoặc function nào đó nếu cần thiết
  // Hiện tại hook này chỉ làm nhiệm vụ chạy ngầm (side-effects)
};