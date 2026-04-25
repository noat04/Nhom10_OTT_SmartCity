import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
// 🔥 ĐỔI IP THEO MÁY BẠN
const LOCAL_IP = "172.28.49.213";

// 👉 Tự động chọn URL
const BASE_URL = `http://${LOCAL_IP}:3000/api`;
// 👉 Tạo axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // ⏱️ timeout 10s
});

// ==========================================
// 🔐 REQUEST INTERCEPTOR
// ==========================================
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    // 👉 Debug
    console.log("➡️ API CALL:", config.baseURL + config.url);
    console.log("➡️ TOKEN:", token);

    if (!config.headers) config.headers = {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.log("❌ REQUEST ERROR:", error);
    return Promise.reject(error);
  },
);

// ==========================================
// 🔁 RESPONSE INTERCEPTOR
// ==========================================
api.interceptors.response.use(
  (response) => {
    // 👉 Debug success
    console.log("✅ RESPONSE:", response.data);
    return response;
  },
  async (error) => {
    console.log("❌ API ERROR:", error?.response?.data || error.message);

    // 🔥 Token hết hạn → logout
    if (error.response?.status === 401) {
      console.log("🚨 Token hết hạn → logout");

      await AsyncStorage.removeItem("token");

      // 👉 nếu bạn có navigation thì redirect về login
      // router.replace("/(auth)/login");
    }

    return Promise.reject(error);
  },
);

export default api;
