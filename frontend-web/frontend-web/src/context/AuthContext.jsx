import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../api/userApi";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { getSocket } from "../socket/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 👉 1. Khởi tạo user TỪ LOCALSTORAGE để chống giật/mất data khi F5
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // ✅ CHỈ CHẠY 1 LẦN KHI LOAD TRANG
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");

      // Nếu không có token, tắt loading và dừng lại (cho phép vào trang Login)
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Có token -> Gọi API lấy dữ liệu mới nhất từ Server
        const res = await getMe();

        if (res.success) {
          // 👉 2. Tùy thuộc vào cấu trúc backend trả về, bóc tách data cho chuẩn
          const freshUser = res.data?.user || res.data || res.user;

          // Cập nhật State và LocalStorage với dữ liệu mới nhất
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
          
          // Mở kết nối Socket
          connectSocket(token);
        } else {
          // Token hỏng hoặc API lỗi -> Đá ra ngoài
          logout();
        }
      } catch (err) {
        console.error("Lỗi khi fetch getMe lúc khởi động:", err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const socket = connectSocket(token);

      const handleUserUpdate = (data) => {
        console.log("🔥 WEB USER UPDATED:", data);

        setUser((prev) => {
          if (!prev || data.user._id !== prev._id) return prev;
          return data.user;
        });

        localStorage.setItem("user", JSON.stringify(data.user));
      };

      socket.on("user_updated", handleUserUpdate);

      return () => {
        socket.off("user_updated", handleUserUpdate);
      };
    }, []);
  // ==========================
  // HÀM ĐĂNG NHẬP
  // ==========================
  const login = (userData, token) => {
    // 1. Lưu xuống LocalStorage
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userData.id || userData._id);
    localStorage.setItem("user", JSON.stringify(userData)); // 👉 Nhớ lưu user

    // 2. Cập nhật State
    setUser(userData);

    // 3. Kết nối Socket
    connectSocket(token);
  };

  // ==========================
  // HÀM ĐĂNG XUẤT
  // ==========================
  const logout = () => {
    // 1. Ngắt Socket
    disconnectSocket();

    // 2. Xóa sạch LocalStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user"); // 👉 Xóa sạch user rác

    // 3. Xóa State
    setUser(null);
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    // 👉 3. Bổ sung setUser vào value để Panel.jsx có thể gọi khi cần update thông tin
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {/* Trong thời gian chờ gọi API getMe, chỉ render children nếu không bị chặn bởi loading */}
      {!loading ? children : <div className="d-flex justify-content-center mt-5">Đang tải...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được bọc bên trong AuthProvider");
  }
  return context;
};