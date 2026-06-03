import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import OtpPage from "./pages/OtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminPage from "./pages/AdminPage";
import JoinGroupPage from "./pages/JoinGroupPage";

import { useAuth } from "./context/AuthContext";
import { getSocket } from "./socket/socket"; // CHỈ IMPORT getSocket

export default function App() {
  const { user, login, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.isAdmin;

  useEffect(() => {
    if (!user) return;

    // Lúc này chắc chắn Socket đã được connect bên trong AuthContext rồi
    const socket = getSocket();
    if (!socket) return;

    // ✅ CONNECT
    const handleConnect = () => {
      console.log("✅ App Connected ID:", socket.id);
    };

    // 🔥 FORCE LOGOUT
    const handleForceLogout = () => {
      alert("Bạn đã đăng nhập ở thiết bị khác!");
      logout();
    };

    socket.on("connect", handleConnect);
    socket.on("force_logout", handleForceLogout);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("force_logout", handleForceLogout);
    };
  }, [user, logout]); // Chạy lại nếu user thay đổi

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <AuthPage /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />} />
        <Route path="/otp" element={!user ? <OtpPage onLogin={login} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />} />
        <Route path="/admin" element={user && isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="/join-group/:token" element={<JoinGroupPage />} />
        <Route path="/" element={user ? (isAdmin ? <Navigate to="/admin" replace /> : <ChatPage onLogout={logout} />) : <Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
