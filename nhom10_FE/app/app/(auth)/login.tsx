import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/authContext";
import { loginAPI } from "../../service/auth.api";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);

      const res = await loginAPI({ email: normalizedEmail, password });

      const token = res.data?.token;
      const user = res.data?.user;

      if (!token || !user) {
        alert("Đăng nhập thất bại");
        return;
      }

      await login(token, user);

      alert("Đăng nhập thành công");
      router.replace("/(tabs)/chat");
    } catch (err: any) {
      console.log("LOGIN ERROR:", err);

      const message =
        err.response?.data?.message ||
        (err.request
          ? "Không kết nối được server, vui lòng kiểm tra IP/API"
          : "Không thể đăng nhập, vui lòng thử lại");

      alert(message);
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
        autoCorrect={false}
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
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

const styles = StyleSheet.create({
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
  btnDisabled: {
    opacity: 0.6,
  },
});
