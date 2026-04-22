import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (token) {
          router.replace("/chat");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.log("Lỗi đọc token:", err);
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  return null;
}
