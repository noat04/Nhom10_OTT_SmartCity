import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import OtpPage from "./pages/OtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

import { useAuth } from "./context/AuthContext";
import { getSocket } from "./socket/socket";

export default function App() {
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const socket = getSocket();

    if (!socket) return; // 🔥 tránh undefined

    // ✅ CONNECT
    const handleConnect = () => {
      console.log("✅ Connected:", socket.id);
    };

    // 🔥 FORCE LOGOUT
    const handleForceLogout = () => {
      alert("Bạn đã đăng nhập ở thiết bị khác!");
      logout(); // 🔥 dùng context (đúng chuẩn)
    };

    socket.on("connect", handleConnect);
    socket.on("force_logout", handleForceLogout);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("force_logout", handleForceLogout);
    };
  }, [logout]);

  return (
    <Router>
      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={!user ? <AuthPage /> : <Navigate to="/" replace />}
        />

        {/* OTP */}
        <Route
          path="/otp"
          element={!user ? <OtpPage onLogin={login} /> : <Navigate to="/" replace />}
        />

        {/* CHAT */}
        <Route
          path="/"
          element={user ? <ChatPage onLogout={logout} /> : <Navigate to="/login" replace />}
        />

        {/* FORGOT PASSWORD */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}