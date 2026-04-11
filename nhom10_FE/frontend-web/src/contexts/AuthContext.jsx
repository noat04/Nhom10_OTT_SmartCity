// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Khởi tạo Context
const AuthContext = createContext(null);

// 2. Tạo Provider Component để bọc toàn bộ App
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra trạng thái đăng nhập khi load/F5 lại trang
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // Lấy dữ liệu từ localStorage (hoặc gọi API verify token lên Node.js)
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
      } finally {
        setIsLoading(false); // Hoàn thành việc kiểm tra
      }
    };

    checkAuthStatus();
  }, []);

  // Hàm xử lý Đăng nhập (Sẽ được gọi sau khi fetch API login thành công)
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  // Hàm xử lý Đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Lưu ý: Việc chuyển hướng (redirect) về trang /login thường sẽ do 
    // component gọi hàm logout xử lý (dùng useNavigate của react-router-dom)
  };

  // Cập nhật thông tin user (ví dụ khi user đổi avatar/tên)
  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Gom các giá trị muốn chia sẻ vào một object
  const value = {
    user,
    isAuthenticated: !!user, // Trả về true nếu có user, false nếu null
    isLoading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Chỉ render các component con khi đã kiểm tra xong trạng thái auth */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// 3. Tạo Custom Hook để các Component khác dùng cho ngắn gọn
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Bắt lỗi nếu dev quên bọc <AuthProvider> ở file main.jsx
  if (context === undefined || context === null) {
    throw new Error('useAuth phải được sử dụng bên trong <AuthProvider>');
  }
  
  return context;
};