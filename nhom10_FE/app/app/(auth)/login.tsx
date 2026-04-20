import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { loginSendOtpAPI } from "../../service/auth.api";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);

      await loginSendOtpAPI({ email, password });

      alert("OTP đã gửi về email");

      // 👉 chuyển qua màn OTP + truyền email
      // router.push({
      //   pathname: "/(auth)/otp",
      //   params: { email },
      // });
      router.push({
        pathname: "/(auth)/otp",
        params: {
          email,
          type: "login", // 🔥 THÊM DÒNG NÀY
        },
      });
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi đăng nhập");
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

      {/* 🔥 QUÊN MẬT KHẨU */}
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
