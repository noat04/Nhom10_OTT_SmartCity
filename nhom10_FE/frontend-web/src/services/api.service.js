// src/services/api.service.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Thay bằng cổng Backend của bạn (VD: 5000 hoặc 8000)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: Can thiệp vào request TRƯỚC KHI gửi lên server
api.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage (đã lưu lúc Login)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export default api;