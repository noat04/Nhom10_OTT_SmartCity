// src/hooks/useConversations.js
import { useState, useEffect } from 'react';
import { chatService } from '../services/chat.service';

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chạy 1 lần khi component mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Gọi hàm từ service
        const data = await chatService.getConversations();
        setConversations(data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách hội thoại:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Trả ra các giá trị cần thiết cho UI
  return { conversations, isLoading, error, setConversations };
};