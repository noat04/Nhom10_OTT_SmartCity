import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = 3000;
const LAN_IP = "172.20.33.112";

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  return hostUri?.split(":")[0];
};

const getApiHost = () => {
  if (process.env.EXPO_PUBLIC_API_HOST) {
    return process.env.EXPO_PUBLIC_API_HOST;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname || "localhost";
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return expoHost;
  }

  if (Platform.OS === "android") {
    return "10.0.2.2";
  }

  if (Platform.OS === "ios") {
    return "localhost";
  }

  return LAN_IP;
};

export const API_HOST = getApiHost();
export const API_ORIGIN = `http://${API_HOST}:${PORT}`;
export const API_BASE_URL = `${API_ORIGIN}/api`;
