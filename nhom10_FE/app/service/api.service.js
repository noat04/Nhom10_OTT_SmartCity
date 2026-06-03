import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "./network.config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    console.log("API CALL:", `${config.baseURL}${config.url}`);
    console.log("TOKEN:", token);

    if (!config.headers) config.headers = {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.log("REQUEST ERROR:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    console.log("RESPONSE:", response.data);
    return response;
  },
  async (error) => {
    console.log("API ERROR:", error?.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log("Token hết hạn, xóa token local");
      await AsyncStorage.removeItem("token");
    }

    return Promise.reject(error);
  },
);

export default api;
