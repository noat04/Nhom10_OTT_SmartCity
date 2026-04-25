import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { loginAPI } from "../../service/auth.api";
import { useAuth } from "../../context/authContext";
export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const handleLogin = async () => {
  if (!email || !password) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  try {
    setLoading(true);

    const res = await loginAPI({ email, password });

    const token = res.data?.token;
    const user = res.data?.user;

    if (!token || !user) {
      alert("Đăng nhập thất bại");
      return;
    }

    // 🔥 QUAN TRỌNG NHẤT
    await login(token, user);

    alert("Đăng nhập thành công");

    router.replace("/(tabs)/chat");

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    alert(err.response?.data?.message || "Sai email hoặc mật khẩu");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Đăng nhập</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={{ color: "white" }}>
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text style={{ marginTop: 10 }}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
        <Text style={{ color: "red", textAlign: "right", marginBottom: 10 }}>
          Quên mật khẩu?
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  btn: {
    backgroundColor: "#0d6efd",
    padding: 12,
    alignItems: "center",
    borderRadius: 5,
  },
};