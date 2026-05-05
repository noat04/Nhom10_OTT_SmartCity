import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../api/userApi";
import { connectSocket, disconnectSocket, getSocket } from "../socket/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Khởi tạo user TỪ LOCALSTORAGE để chống giật/mất data khi F5
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // ==========================
  // HÀM SETUP SOCKET CHUNG
  // ==========================
  // Gom tất cả logic kết nối socket và lắng nghe sự kiện global vào đây
  const setupSocketListeners = (token) => {
    const socket = connectSocket(token);
    if (!socket) return;

    // Tắt listener cũ trước khi bật cái mới (chống lỗi lặp sự kiện khi login đi login lại)
    socket.off("user_updated");

    // Lắng nghe cập nhật thông tin User
    socket.on("user_updated", (data) => {
      console.log("🔥 WEB USER UPDATED:", data);
      setUser((prev) => {
        if (!prev || data.user._id !== prev._id) return prev;
        return data.user;
      });
      localStorage.setItem("user", JSON.stringify(data.user));
    });
  };

  // ==========================
  // CHẠY 1 LẦN DUY NHẤT KHI LOAD TRANG (F5)
  // ==========================
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Gọi API lấy dữ liệu mới nhất
        const res = await getMe();

        if (res.success) {
          const freshUser = res.data?.user || res.data || res.user;
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));

          // 👉 Khởi tạo Socket sau khi xác minh token hợp lệ
          setupSocketListeners(token);
        } else {
          // Token hỏng hoặc API báo lỗi
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

    // Dọn dẹp listener khi Component bị Unmount
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("user_updated");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================
  // HÀM ĐĂNG NHẬP
  // ==========================
  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userData.id || userData._id);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);

    // 👉 Khởi tạo Socket ngay sau khi Login thành công
    setupSocketListeners(token);
  };

  // ==========================
  // HÀM ĐĂNG XUẤT
  // ==========================
  const logout = () => {
    // 1. Ngắt hoàn toàn kết nối Socket
    disconnectSocket();

    // 2. Xóa sạch LocalStorage cực kỳ an toàn
    localStorage.clear();

    // 3. Clear State
    setUser(null);
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {!loading ? (
        children
      ) : (
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      )}
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