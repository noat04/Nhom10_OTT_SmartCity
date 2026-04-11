// src/services/chat.service.js
import api from './api.service';

export const chatService = {
  // Hàm lấy danh sách hội thoại
  getConversations: async () => {
    const response = await api.get('/chat/conversations');
    // Trả về dữ liệu an toàn
    return response.data.data || response.data;
  },

    // SỬA LẠI URL Ở ĐÂY CHO KHỚP VỚI BACKEND
  getMessages: async (conversationId) => {
    const response = await api.get(`/chat/${conversationId}/history`); // Đã sửa
    return response.data.data || response.data;
  },
  sendMessage: async (data) => {
    const response = await api.post(`/chat/message`, data);
    return response.data.data || response.data;
  },
  // Sau này bạn có thể thêm các hàm khác ở đây:
  // getMessages: async (conversationId) => { ... },
  // createGroup: async (data) => { ... }
};

