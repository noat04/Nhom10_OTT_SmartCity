import AsyncStorage from "@react-native-async-storage/async-storage"; //lưu trữ token ,user
import { createContext, useContext, useEffect, useState } from "react";
import { getMeAPI } from "../service/user.api";
import { connectSocket, disconnectSocket, getSocket } from "../socket/socket";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 🔥 load user
  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userStorage = await AsyncStorage.getItem("user");

      // 👉 load từ local trước (NHANH + KHÔNG MẤT USER)
      if (userStorage) {
        setUser(JSON.parse(userStorage));
      }

      if (!token) return;

      // 👉 gọi API để sync lại
      const res = await getMeAPI();

      const userData = res.data.user || res.data.data;

      setUser(userData);

      // 🔥 update lại storage
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      connectSocket(token);

      // 🔥 THÊM ĐOẠN NÀY
      const socket = getSocket();

      if (socket) {
        socket.on("user_updated", async (data) => {
          console.log("🔥 MOBILE USER UPDATED:", data);

          setUser(data.user);

          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        });
      }
    } catch (err) {
      console.log("loadUser error", err);
    }
  };
  useEffect(() => {
    return () => {
      const socket = getSocket();
      socket?.off("user_updated");
    };
  }, []);
  useEffect(() => {
    loadUser();
  }, []);

  // 🔑 LOGIN
  const login = async (token, userData) => {
    await AsyncStorage.setItem("token", token);
    // 🔥 THÊM DÒNG NÀY
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setUser(userData); // 🔥 set trực tiếp

    connectSocket(token);
  };

  // 🚪 LOGOUT
  const logout = async () => {
    await AsyncStorage.clear();
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
