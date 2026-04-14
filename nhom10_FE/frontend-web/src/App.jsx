import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPPage from './pages/OTPPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'

import ForgotPasswordPage from './pages/ForgotPasswordPage'
import VerifyResetOTPPage from './pages/VerifyResetOTPPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

import { useEffect } from "react";
import socket from "./socket";

function App() {


  useEffect(() => {

    // 🔥 CONNECT
    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    // 🔥 FORCE LOGOUT (QUAN TRỌNG)
    socket.on("force_logout", () => {
      alert("Bạn đã đăng nhập ở thiết bị khác!");
      localStorage.removeItem("token");
      window.location.href = "/";
    });

    return () => {
      socket.off("connect");
      socket.off("force_logout"); // 🔥 tránh leak
    };

  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/otp" element={<OTPPage />} />
        <Route path="*" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-reset" element={<VerifyResetOTPPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </Router>
  )
}

export default App