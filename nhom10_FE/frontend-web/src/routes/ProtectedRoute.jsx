// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Chờ kiểm tra token từ LocalStorage (tránh việc chớp nhoáng bị đẩy ra Login)
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // 2. Nếu chưa đăng nhập, chuyển hướng về /login
  // Thuộc tính `state={{ from: location }}` giúp lưu lại trang user vừa cố gắng vào
  // để sau khi login xong có thể trả họ về đúng trang đó.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Nếu đã đăng nhập, cho phép render component con (<Outlet /> dùng cho nested routing)
  return children ? children : <Outlet />;
};

export default ProtectedRoute;